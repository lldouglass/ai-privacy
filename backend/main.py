import os, json, yaml, time, logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, Form, Request
from outreach import router as outreach_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, create_engine, Session, select
from dotenv import load_dotenv
from functools import lru_cache

# OpenAI (used only when DEMO_MODE=0)
from openai import OpenAI
from fastapi.responses import FileResponse
from pathlib import Path


# Optional retrieval (skip when demo)
try:
    from reg_retrieval import build_or_load_index, retrieve
except Exception:
    build_or_load_index = retrieve = None

# ── Env ───────────────────────────────────────────────────────────────────
load_dotenv()
log = logging.getLogger("uvicorn")

DEMO_MODE = os.getenv("DEMO_MODE", "0") == "1"
INVITE_TOKEN = os.getenv("INVITE_TOKEN", "")
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-nano")
PRICE_PER_1K = float(os.getenv("OPENAI_PRICE_PER_1K", "0.03"))

@lru_cache(maxsize=1)
def get_openai_client():
    """Create the OpenAI client only if/when a key is available."""
    if not OPENAI_API_KEY:
        return None
    return OpenAI(api_key=OPENAI_API_KEY)

# Demo assets
DEMO_DIR = Path(__file__).parent / "demo"
DEMO_MD = (DEMO_DIR / "sample_caia_doc.md").read_text(encoding="utf-8") if DEMO_DIR.exists() else ""
DEMO_SOURCES = json.loads((DEMO_DIR / "sample_sources.json").read_text(encoding="utf-8")) if DEMO_DIR.exists() else []

# ── FastAPI & CORS ────────────────────────────────────────────────────────
app = FastAPI(title="AI Compliance Assistant", version="0.2.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.clarynt.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(outreach_router)

@app.on_event("startup")
async def startup():
    if DEMO_MODE:
        log.warning("DEMO_MODE=1: OpenAI calls disabled; using demo generators.")
    elif not OPENAI_API_KEY:
        log.warning("OPENAI_API_KEY not set. /api/generate will return 503 if called.")

# ── DB ────────────────────────────────────────────────────────────────────
# ── DB ────────────────────────────────────────────────────────────────────
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Normalize Postgres URLs to use psycopg (v3) driver
def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url

DB_URL = _normalize_db_url(DB_URL)

engine = create_engine(DB_URL, echo=False, pool_pre_ping=True)


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    system_name: str
    intended_purpose: str
    use_case: str
    report_md: str
    sources_json: Optional[str] = None
    total_tokens: Optional[int] = None
    cost_usd: Optional[float] = None

SQLModel.metadata.create_all(engine)

# ── Retrieval index (skip in demo / if no key) ────────────────────────────
REG_INDEX = None
if not DEMO_MODE and build_or_load_index and OPENAI_API_KEY:
    try:
        _client = get_openai_client()
        if _client:
            REG_INDEX = build_or_load_index(_client)
        else:
            log.warning("OpenAI client missing; skipping retrieval index build.")
    except Exception as e:
        log.warning(f"Skipping retrieval index build: {e}")

# ── Rate limit (very simple) ──────────────────────────────────────────────
_REQ_LOG: dict[str, list[float]] = {}
_WINDOW = 60.0
MAX_REQ_PER_MIN = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "60"))
def _rate_limit(ip: str):
    now = time.time()
    hist = [t for t in _REQ_LOG.get(ip, []) if now - t < _WINDOW]
    if len(hist) >= MAX_REQ_PER_MIN:
        raise HTTPException(429, "Too many requests. Try again in a minute.")
    hist.append(now)
    _REQ_LOG[ip] = hist

def _check_invite(request: Request):
    if INVITE_TOKEN and request.headers.get("X-Invite-Token") != INVITE_TOKEN:
        raise HTTPException(401, "Unauthorized (invite-only beta)")

# ── Schemas ───────────────────────────────────────────────────────────────
class QuickInput(BaseModel):
    system_name: str
    intended_purpose: str
    use_case: str
    risk_notes: Optional[str] = None
    free_text_notes: Optional[str] = None
    ephemeral: Optional[bool] = False

# ── Helpers ───────────────────────────────────────────────────────────────
def _compose_context_snippets(snips):
    lines = []
    for s in snips:
        lines.append(f"[{s.key}] {s.title} — {s.source}\n{s.text.strip()}\n")
    return "\n".join(lines)

def _meta_block(model_meta: str) -> str:
    if not model_meta:
        return ""
    snippet = model_meta.strip()
    if len(snippet) > 1800:
        snippet = snippet[:1800] + "\n# … truncated …"
    return f"\n### Model Metadata (Uploaded)\n\n```yaml\n{snippet}\n```\n"

# ── Core report generation ────────────────────────────────────────────────
def _make_report(data: QuickInput, model_meta: str, skip_store: bool):
    # DEMO fast‑path: canned CAIA compliance doc + injected metadata
    if DEMO_MODE:
        report_md = DEMO_MD.replace("{{MODEL_META_BLOCK}}", _meta_block(model_meta))
        sources = DEMO_SOURCES
        usage = {"total_tokens": 0}
        project_id = None
        if not skip_store:
            with Session(engine) as s:
                obj = Project(
                    system_name=data.system_name,
                    intended_purpose=data.intended_purpose,
                    use_case=data.use_case,
                    report_md=report_md,
                    sources_json=json.dumps(sources),
                    total_tokens=0,
                    cost_usd=0.0,
                )
                s.add(obj); s.commit(); s.refresh(obj)
                project_id = obj.id
        return {"report": report_md, "usage": usage, "sources": sources, "project_id": project_id}

    # Normal (non-demo) path with retrieval + LLM
    client = get_openai_client()
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set on server")

    top_snips = []
    regulatory_context = ""
    if REG_INDEX and retrieve:
        query = (
            f"NAME: {data.system_name}\nPURPOSE: {data.intended_purpose}\nUSE_CASE: {data.use_case}\n"
            f"RISK:\n{data.risk_notes or ''}\nEXTRA:\n{data.free_text_notes or ''}\nMODEL_META:\n{model_meta or ''}\n"
        )
        try:
            top_snips = retrieve(client, REG_INDEX, query, k=5)
            regulatory_context = _compose_context_snippets(top_snips)
        except Exception as e:
            log.warning(f"Retrieval failed; continuing without context: {e}")

    prompt = f"""
You are a Colorado AI Act (CAIA) compliance analyst. Using ONLY the regulatory excerpts below for citations, draft a
structured CAIA Compliance Documentation for the described AI system. Use [S#] inline citations only where supported.

REGULATORY EXCERPTS:
{regulatory_context or '<<no retrieval in this mode>>'}

SYSTEM INFO
- Name: {data.system_name}
- Intended Purpose: {data.intended_purpose}
- Use‑Case: {data.use_case}

RISK NOTES:
{data.risk_notes or '<<none provided>>'}

MODEL METADATA:
{model_meta or '<<none provided>>'}

(Write sections 0..9 + Action Items exactly as in our earlier template.)
"""
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "Precise compliance analyst. No overclaiming."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.15,
    )
    report_md = rsp.choices[0].message.content

    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    total_tokens = (usage or {}).get("total_tokens")
    cost = round((total_tokens or 0) / 1000 * PRICE_PER_1K, 4) if total_tokens else None

    sources = [{"key": sn.key, "title": sn.title, "source": sn.source, "excerpt": sn.text.strip()} for sn in top_snips]
    project_id = None

    if not skip_store:
        with Session(engine) as s:
            obj = Project(
                system_name=data.system_name,
                intended_purpose=data.intended_purpose,
                use_case=data.use_case,
                report_md=report_md,
                sources_json=json.dumps(sources),
                total_tokens=total_tokens,
                cost_usd=cost,
            )
            s.add(obj); s.commit(); s.refresh(obj)
            project_id = obj.id

    return {"report": report_md, "usage": usage, "sources": sources, "project_id": project_id}

# ── Routes ────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True, "demo": DEMO_MODE, "has_openai_key": bool(OPENAI_API_KEY)}

@app.get("/api/demo-config")
def demo_config():
    return {
        "system_name": "HireAI Resume Screener",
        "intended_purpose": "Screen and rank job applicants based on predicted job fit for a given role.",
        "use_case": "Employment (recruitment & selection)",
        "risk_notes": (
            "- Risk of algorithmic discrimination via correlated features (education, employment gaps)\n"
            "- Automation bias among recruiters; over‑reliance on AI-generated scores\n"
            "- Drift across geographies/roles; calibration degradation\n"
            "- PII handling concerns; explanation text may reveal sensitive attributes\n"
        ),
        "free_text_notes": "Model: gradient‑boosted trees; PII masking + fairness checks; human review required per CAIA.",
        "ephemeral": False
    }

@app.get("/api/demo-metadata/hr-yaml")
def demo_metadata_yaml():
    f = DEMO_DIR / "hr_model_meta.yaml"
    if not f.exists():
        raise HTTPException(404, "Demo file missing")
    return FileResponse(str(f), media_type="text/yaml", filename="hr_model_meta.yaml")

@app.post("/api/generate")
def generate(data: QuickInput, request: Request):
    _rate_limit(request.client.host); _check_invite(request)
    return _make_report(data, "", bool(data.ephemeral))

@app.post("/api/generate-with-file")
async def generate_with_file(
    request: Request,
    file: UploadFile,
    system_name: str = Form(...),
    intended_purpose: str = Form(...),
    use_case: str = Form(...),
    risk_notes: str = Form(""),
    free_text_notes: str = Form(""),
    ephemeral: bool = Form(False),
):
    _rate_limit(request.client.host); _check_invite(request)
    try:
        raw = (await file.read()).decode()
        meta = yaml.safe_load(raw)
        model_meta = yaml.safe_dump(meta, sort_keys=False)
    except Exception as e:
        raise HTTPException(400, f"Bad metadata file: {e}")

    data = QuickInput(
        system_name=system_name,
        intended_purpose=intended_purpose,
        use_case=use_case,
        risk_notes=risk_notes or None,
        free_text_notes=free_text_notes or None,
        ephemeral=ephemeral,
    )
    return _make_report(data, model_meta, bool(ephemeral))

@app.get("/api/projects")
def list_projects(request: Request):
    _rate_limit(request.client.host); _check_invite(request)
    with Session(engine) as s:
        rows = s.exec(select(Project).order_by(Project.created_at.desc())).all()
    return rows

@app.get("/api/projects/{project_id}")
def get_project(project_id: int):
    with Session(engine) as s:
        obj = s.get(Project, project_id)
        if not obj:
            raise HTTPException(404, "Not found")
        return {
            "id": obj.id,
            "created_at": obj.created_at.isoformat(),
            "system_name": obj.system_name,
            "intended_purpose": obj.intended_purpose,
            "use_case": obj.use_case,
            "report": obj.report_md,
            "sources": json.loads(obj.sources_json or "[]"),
            "total_tokens": obj.total_tokens,
            "cost_usd": obj.cost_usd,
        }

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, request: Request):
    _rate_limit(request.client.host); _check_invite(request)
    with Session(engine) as s:
        obj = s.get(Project, project_id)
        if not obj:
            raise HTTPException(404, "Not found")
        s.delete(obj); s.commit()
    return {"deleted": project_id}


# ── Survey-based document generation ──────────────────────────────────────
class SurveyAnswers(BaseModel):
    """Survey answers from the comprehensive CAIA compliance assessment"""
    answers: dict
    classification: dict

@app.post("/api/generate-survey-documents")
def generate_survey_documents(data: SurveyAnswers, request: Request):
    """Generate personalized compliance documents based on survey responses"""
    _rate_limit(request.client.host); _check_invite(request)

    answers = data.answers
    classification = data.classification

    # Determine what documents to generate based on answers
    documents = {}

    is_high_risk = answers.get('q2_1') and 'none' not in answers.get('q2_1', [])
    is_consumer_facing = answers.get('q1_2') == 'yes'
    is_developer = answers.get('q0_2') in ['developer', 'both']
    is_deployer = answers.get('q0_2') in ['deployer', 'both']
    needs_disclosure = is_consumer_facing and answers.get('q1_3') != 'yes'

    # 1. Consumer pre-use disclosure notice
    if needs_disclosure:
        contact = answers.get('q9_2', 'privacy@yourcompany.com')
        documents['consumer_notice'] = f"""# Consumer Disclosure Notice

**Notice: AI-Assisted Interaction**

You are interacting with an artificial intelligence (AI) system. This system is designed to assist with {answers.get('q1_1', 'various tasks')}.

For questions or concerns, please contact: {contact}

This notice is provided in compliance with the Colorado Artificial Intelligence Act (CAIA).
"""

    # 2. Impact Assessment template
    if is_high_risk and is_deployer:
        areas = ', '.join(answers.get('q2_1', []))
        system_functions = ', '.join(answers.get('q1_1', []))
        go_live_date = answers.get('q5_6', 'TBD')
        last_change = answers.get('q5_7', 'N/A')

        documents['impact_assessment'] = f"""# Impact Assessment Template
## Colorado AI Act Compliance

### 1. System Overview
**System Functions:** {system_functions}
**Decision Areas:** {areas}
**Go-Live Date:** {go_live_date}
**Last Major Change:** {last_change}

### 2. Purpose and Intended Use
**Primary Purpose:** [Describe the system's primary purpose]
**Intended Use Cases:** [List specific use cases]

### 3. Consequential Decision Analysis
**Decision Type:** High-Risk Consequential Decision
**Areas Impacted:** {areas}
**Decision Process:** {answers.get('q2_2', 'To be documented')}
**Automation Level:** {answers.get('q2_3', 'To be documented')}% automated

### 4. Algorithmic Discrimination Risk Assessment

#### 4.1 Protected Attributes
**Uses Sensitive Traits:** {answers.get('q8_1', 'Unknown')}
**Lawful Basis for Data Use:** {answers.get('q8_2', 'To be documented')}
**Model Explainability:** {answers.get('q8_3', 'To be documented')}

#### 4.2 Known Risks
[Document known or reasonably foreseeable risks of algorithmic discrimination]

#### 4.3 Mitigation Strategies
**Bias Testing:** {answers.get('q5_3', 'Not yet implemented')}
**Monitoring:** {answers.get('q5_4', 'Not yet implemented')}
**Logging:** {answers.get('q5_2', 'Not yet implemented')}

### 5. Consumer Rights Implementation
**Pre-Decision Notice:** {answers.get('q4_1', 'Not yet implemented')}
**Adverse Decision Explanations:** {answers.get('q4_2', 'Not yet implemented')}
**Data Correction:** {answers.get('q4_3', 'Not yet implemented')}
**Appeals Process:** {answers.get('q4_4', 'Not yet implemented')}

### 6. Review and Update Schedule
- Annual review required under CAIA
- Post-change review within 90 days of substantial modifications
- Next scheduled review: [Date]

### 7. Contact Information
**Consumer Inquiries:** {answers.get('q9_2', 'TBD')}
**Compliance Officer:** [Name and contact]

---
*This Impact Assessment must be updated annually and within 90 days of any substantial modification to the AI system.*
"""

    # 3. Risk Management Program checklist
    if is_high_risk and is_deployer:
        documents['risk_management_checklist'] = f"""# Risk Management Program Checklist
## Colorado AI Act Compliance

### Governance
- [ ] Named system owners (business, technical, compliance): {answers.get('q5_1', 'No')}
- [ ] Clear roles and responsibilities documented
- [ ] Escalation procedures established

### Testing & Validation
- [ ] Bias testing across protected classes: {answers.get('q5_3', 'Not yet implemented')}
- [ ] Performance metrics by demographic group
- [ ] Regular fairness audits scheduled
- [ ] Testing methodology documented

### Monitoring & Logging
- [ ] Input/output logging: {answers.get('q5_2', 'Not implemented')}
- [ ] Override tracking
- [ ] Drift detection: {answers.get('q5_4', 'Not implemented')}
- [ ] Alert thresholds defined

### Documentation
- [ ] Developer documentation received: {answers.get('q6_1', 'None')}
- [ ] Intended use limits enforced: {answers.get('q5_5', 'Not documented')}
- [ ] Impact assessment current
- [ ] Incident response plan

### Consumer Rights
- [ ] Pre-decision notice process: {answers.get('q4_1', 'Not yet')}
- [ ] Adverse decision explanation process: {answers.get('q4_2', 'No')}
- [ ] Data correction mechanism: {answers.get('q4_3', 'No')}
- [ ] Appeals process: {answers.get('q4_4', 'No')}

### Compliance Reporting
- [ ] Public disclosure page prepared
- [ ] 90-day documentation readiness for AG
- [ ] Discrimination incident reporting process
- [ ] Annual impact assessment scheduled

---
*Review this checklist quarterly and update as implementation progresses.*
"""

    # 4. Vendor documentation request letter
    if is_deployer and answers.get('q6_1') != 'all':
        documents['vendor_request_letter'] = f"""# Vendor Documentation Request
## Required for Colorado AI Act Compliance

Dear [Vendor Name],

To comply with the Colorado Artificial Intelligence Act (CAIA), we require the following documentation for [AI System Name]:

### Required Documentation

1. **Intended Use Statement**
   - Detailed description of intended purposes
   - Known limitations and constraints
   - Use cases the system should NOT be applied to

2. **Training Data Summary**
   - Data sources and types
   - Data collection and curation methods
   - Known biases or limitations in training data
   - Data time period and refresh frequency

3. **Known Risks**
   - Identified risks of algorithmic discrimination
   - Known failure modes
   - Performance degradation scenarios

4. **Performance Evaluation**
   - Overall accuracy and error rates
   - Performance metrics by demographic group
   - Testing methodology
   - Evaluation datasets used

5. **Risk Mitigation Measures**
   - Built-in fairness controls
   - Recommended guardrails
   - Ongoing monitoring recommendations

6. **Version Control**
   - Current version number
   - Material changes from previous versions
   - Planned update schedule

### Timeline
Please provide this documentation within [X days] to support our compliance obligations.

### Contact
[Your name and contact information]

---
*This request is made pursuant to deployer obligations under the Colorado Artificial Intelligence Act.*
"""

    # 5. Developer documentation pack
    if is_high_risk and is_developer:
        documents['developer_documentation_pack'] = f"""# Developer Documentation Pack
## Colorado AI Act Compliance

### Current Status
**Documentation Provided to Deployers:** {answers.get('q7_1', 'No')}
**Version Tracking:** {answers.get('q7_2', 'No')}
**AG Notification Process:** {answers.get('q7_3', 'Not established')}

### Required Developer Obligations

#### 1. General Statement on Foreseeable Uses
[Provide a statement describing foreseeable uses of the high-risk AI system]

#### 2. Documentation for Deployers
Must include:
- System purpose and intended use
- Training data summary (sources, methods, known limitations)
- Known limitations and risks
- Performance evaluation results
- Risk mitigation measures implemented

#### 3. Public Website Statement
Required content:
- Types of high-risk AI systems developed
- How you manage risks of algorithmic discrimination
- Link to more detailed information

#### 4. Notification Procedures
**Timeline:** Within 90 days of discovering known or reasonably foreseeable risks of algorithmic discrimination:
1. Notify all known deployers
2. Notify Colorado Attorney General
3. Document notification and response

#### 5. Version Control
- Track material modifications
- Document changes that may affect discrimination risks
- Notify deployers of substantial changes

---
*Developers must maintain these obligations for all high-risk AI systems deployed in Colorado.*
"""

    # 6. AG notification playbook
    if is_high_risk and is_developer:
        documents['ag_notification_playbook'] = f"""# Attorney General Notification Playbook
## Algorithmic Discrimination Incident Response

### When to Notify
Notification required within 90 days if you discover your AI system:
- Has caused algorithmic discrimination, OR
- Is reasonably likely to cause algorithmic discrimination

### What Constitutes "Discovery"
- Internal testing reveals bias
- User complaints indicate discriminatory outcomes
- Third-party audit identifies issues
- Regulatory inquiry raises concerns
- Incident investigation uncovers patterns

### Notification Process

#### Step 1: Internal Assessment (Days 1-14)
- [ ] Document the issue in detail
- [ ] Assess scope and severity
- [ ] Identify affected populations
- [ ] Review legal implications
- [ ] Preserve all evidence

#### Step 2: Mitigation Planning (Days 15-30)
- [ ] Develop remediation plan
- [ ] Identify interim measures
- [ ] Assess system shutdown necessity
- [ ] Plan deployer notifications

#### Step 3: Deployer Notification (By Day 45)
- [ ] Notify all known deployers
- [ ] Provide incident details
- [ ] Share mitigation recommendations
- [ ] Document all notifications

#### Step 4: Attorney General Notification (By Day 90)
Submit to: Colorado Attorney General's Office
Include:
- Description of the AI system
- Nature of the discrimination risk or incident
- Affected populations
- Mitigation measures taken
- Timeline of discovery and response
- Contact information

#### Step 5: Follow-Up
- [ ] Track AG response
- [ ] Implement required actions
- [ ] Update documentation
- [ ] Review incident response process

### Key Contacts
**Legal Counsel:** [Name, phone, email]
**Compliance Officer:** [Name, phone, email]
**Technical Lead:** [Name, phone, email]

### Colorado AG Contact
Office of the Attorney General
Consumer Protection Section
[Current contact information to be inserted]

---
*Review and test this playbook annually. Update contact information as needed.*
"""

    # 7. Public disclosure page
    if answers.get('q9_1') == 'yes':
        role_text = "developer and deployer" if answers.get('q0_2') == 'both' else answers.get('q0_2', 'user')
        documents['public_disclosure_page'] = f"""# AI Systems Disclosure
## Colorado AI Act Transparency

### Our Role
We are a {role_text} of AI systems subject to the Colorado Artificial Intelligence Act.

### AI Systems in Use
**System Type:** {', '.join(answers.get('q1_1', []))}
**Decision Areas:** {', '.join(answers.get('q2_1', []))}
**Risk Classification:** {classification.get('title', 'Under assessment')}

### How We Manage Algorithmic Discrimination Risks

#### Testing & Validation
- Regular bias testing across protected characteristics
- Performance monitoring by demographic group
- Ongoing system validation

#### Consumer Rights
We provide:
- Clear notice before AI-assisted decisions
- Explanations for adverse decisions
- Ability to correct inaccurate data
- Appeals process for automated decisions

#### Oversight & Governance
- Named system owners and accountability
- Regular impact assessments
- Compliance monitoring
- Incident response procedures

### Contact Us
For questions about our AI systems or to exercise your rights:
**Contact:** {answers.get('q9_2', 'privacy@yourcompany.com')}

### Learn More
- [Link to detailed Impact Assessment] (when required)
- [Link to company privacy policy]
- [Link to terms of service]

---
*Last updated: {datetime.now().strftime('%B %d, %Y')}*
*This page is maintained in compliance with the Colorado Artificial Intelligence Act.*
"""

    # 8. Bias testing starter plan
    if answers.get('q8_1') in ['yes', 'not_sure']:
        documents['bias_testing_plan'] = f"""# Bias Testing Starter Plan
## Fairness Validation Framework

### Current State
**Sensitive Attributes Used:** {answers.get('q8_1', 'Unknown')}
**Lawful Basis Documented:** {answers.get('q8_2', 'Unknown')}
**Model Explainability:** {answers.get('q8_3', 'Unknown')}

### Protected Characteristics to Test
Under Colorado law and federal civil rights laws, test for disparate impact across:
- Race and ethnicity
- Sex and gender identity
- Age (40+)
- Disability status
- Religion
- National origin
- Genetic information
- Other protected classes relevant to your domain

### Fairness Metrics to Track

#### 1. Selection Rates
- Acceptance/approval rates by group
- Threshold: No group should have selection rate < 80% of highest group (4/5ths rule)

#### 2. Error Rates
- False positive rates by group
- False negative rates by group
- Threshold: Differences should be < 10% between groups

#### 3. Calibration
- Predicted vs. actual outcomes by group
- Threshold: Calibration error < 5% across groups

### Testing Methodology

#### Data Requirements
- Minimum 100 samples per protected group (prefer 500+)
- Representative of production distribution
- Include edge cases and borderline decisions

#### Testing Frequency
- **Initial validation:** Before deployment
- **Routine monitoring:** {answers.get('q5_4', 'Monthly recommended')}
- **Post-change validation:** Within 30 days of any model update
- **Annual audit:** Comprehensive fairness review

### Implementation Steps

1. **Identify Test Data** (Week 1)
   - Collect or generate representative sample
   - Label protected attributes (where lawful)
   - Create evaluation dataset

2. **Baseline Metrics** (Week 2-3)
   - Run current system on test data
   - Calculate all fairness metrics
   - Document baseline performance

3. **Set Thresholds** (Week 4)
   - Define acceptable fairness bounds
   - Get stakeholder alignment
   - Document rationale

4. **Implement Monitoring** (Week 5-6)
   - Automate metric calculation
   - Set up alerting
   - Create dashboard

5. **Response Protocol** (Week 7)
   - Define what triggers investigation
   - Establish mitigation procedures
   - Assign ownership

### Mitigation Strategies
If bias detected:
- [ ] Retrain with balanced data
- [ ] Adjust decision thresholds by group
- [ ] Remove problematic features
- [ ] Add fairness constraints
- [ ] Implement human review for affected groups

### Documentation
Maintain records of:
- Test data characteristics
- Metric calculations
- Threshold decisions
- Mitigation actions taken
- Effectiveness of interventions

---
*This plan should be customized to your specific system and decision domain.*
"""

    # 9. Personalized action checklist
    action_items = []

    if answers.get('q0_1') != 'yes':
        action_items.append("✓ System not subject to Colorado AI Act (no Colorado business nexus)")
    else:
        if not answers.get('q5_1') == 'yes':
            action_items.append("• Assign named owners (business, technical, compliance) for AI system")

        if needs_disclosure and answers.get('q4_1') != 'yes':
            action_items.append("• Implement consumer pre-use AI disclosure notice")

        if is_high_risk:
            if answers.get('q5_2') != 'yes':
                action_items.append("• Set up logging for inputs, outputs, and overrides")

            if answers.get('q5_3') != 'yes':
                action_items.append("• Conduct bias testing across protected characteristics")

            if answers.get('q5_4') != 'yes':
                action_items.append("• Implement drift monitoring and post-change validation")

            if is_deployer:
                if answers.get('q4_2') != 'yes':
                    action_items.append("• Create adverse decision explanation process")

                if answers.get('q4_3') != 'yes':
                    action_items.append("• Establish data correction mechanism")

                if answers.get('q4_4') != 'yes':
                    action_items.append("• Implement appeals/human review process")

                if not answers.get('q5_6'):
                    action_items.append("• Document system go-live date and last change date")

            if is_developer:
                if answers.get('q7_1') != 'yes':
                    action_items.append("• Prepare developer documentation pack for deployers")

                if answers.get('q7_2') != 'yes':
                    action_items.append("• Implement version tracking and change notifications")

                if answers.get('q7_3') != 'yes':
                    action_items.append("• Establish AG notification process for discrimination incidents")

        if is_deployer and answers.get('q6_1') != 'all':
            action_items.append("• Request complete documentation from AI system developer")

        if answers.get('q8_2') != 'yes':
            action_items.append("• Document lawful basis for all input data used by AI")

        if answers.get('q8_3') != 'yes':
            action_items.append("• Improve model explainability and feature documentation")

        if not answers.get('q9_2'):
            action_items.append("• Designate consumer contact for AI-related questions/appeals")

    documents['action_checklist'] = f"""# Personalized Action Checklist
## Colorado AI Act Compliance Roadmap

### Your Classification
**Risk Level:** {classification.get('title', 'Under assessment')}
**Description:** {classification.get('description', '')}

### Priority Actions
{chr(10).join(action_items)}

### Timeline Recommendations

#### Immediate (Next 30 days)
- Consumer disclosure implementation
- Governance structure (assign owners)
- Contact information setup

#### Short-term (30-90 days)
- Logging and monitoring setup
- Initial bias testing
- Documentation requests to vendors
- Policy documentation

#### Medium-term (90-180 days)
- Complete Impact Assessment
- Risk Management Program implementation
- Public disclosure page
- Annual review scheduling

#### Ongoing
- Quarterly monitoring and testing
- Annual Impact Assessment updates
- Post-change validations within 90 days
- Consumer rights request handling

### Next Steps
1. Review all generated documents
2. Customize templates to your specific system
3. Assign ownership for each action item
4. Set target completion dates
5. Schedule regular compliance reviews

### Resources
- Full Impact Assessment template
- Risk Management Program checklist
- Testing and monitoring plans
- All required documentation templates

---
*Generated {datetime.now().strftime('%B %d, %Y')} based on your survey responses.*
*Review and update as your AI system and compliance posture evolves.*
"""

    return {
        "documents": documents,
        "classification": classification,
        "document_count": len(documents)
    }


@app.get("/checkup", include_in_schema=False)
def readiness_check():
    base = Path(__file__).resolve().parent
    return FileResponse(str(base / "static" / "checkup" / "index.html"), media_type="text/html")

@app.get("/trust", include_in_schema=False)  # if your app is called `api`, use that. Otherwise `app`.
def trust_page():
    base_dir = Path(__file__).resolve().parent
    trust_file = base_dir / "static" / "trust" / "index.html"
    return FileResponse(str(trust_file), media_type="text/html")

@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"ok": True}

# Serve static only if built
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"ok": True, "message": "Backend API running (static not built). Use Vite on :5173 in dev."}
