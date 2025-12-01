import os, json, yaml, time, logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, Form, Request
from outreach import router as outreach_router
from intake import router as intake_router
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
app.include_router(intake_router)

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

class OutcomeDocumentationInput(BaseModel):
    outcome: str
    answers: dict
    checklist: dict
    surveyHistory: list

class ChatMessage(BaseModel):
    message: str
    context: Optional[dict] = None  # User context (outcome, answers, etc.)

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
        ]
        # temperature=0.15,
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

# ── Outcome Documentation Helpers ────────────────────────────────────────
def _load_outcome_requirements(outcome: str) -> tuple[str, str]:
    """
    Load the legal requirements markdown file for a given outcome.
    
    Returns:
        tuple: (outcome_title, requirements_text)
        For outcomes without files, returns a "not regulated" summary.
    """
    outcome_titles = {
        "outcome1": "Not Subject to the Colorado AI Act",
        "outcome2": "Exempt Deployer",
        "outcome3": "Not an AI System Under CAIA",
        "outcome4": "Not a Developer Under CAIA",
        "outcome5": "General AI System with Disclosure Duty",
        "outcome6": "Not a Regulated System",
        "outcome7": "Developer of High-Risk AI System",
        "outcome8": "Deployer of High-Risk AI System",
        "outcome9": "Both Developer and Deployer of High-Risk AI System"
    }
    
    outcome_files = {
        "outcome2": "outcome2_exempt_deployer.md",
        "outcome5": "outcome5_general_ai_disclosure.md",
        "outcome6": "outcome6_not_regulated_system.md",
        "outcome7": "outcome7_developer_high_risk.md",
        "outcome8": "outcome8_deployer_high_risk.md",
        "outcome9": "outcome9_both_developer_deployer.md"
    }
    
    # Summaries for outcomes without dedicated markdown files
    not_regulated_summaries = {
        "outcome1": """# Not Subject to the Colorado AI Act

## Overview

Your organization is not subject to the Colorado Artificial Intelligence Act (CAIA) because you do not conduct business in Colorado.

## What This Means

The Colorado AI Act applies only to persons or entities that "do business in Colorado." Since your operations do not meet this threshold, you are not required to comply with CAIA's requirements for developers or deployers of AI systems.

## No Compliance Obligations

You have no documentation, disclosure, risk management, or impact assessment obligations under CAIA at this time.

## If Your Situation Changes

If you begin doing business in Colorado in the future, you should reassess your obligations under CAIA based on:
- Whether you develop or deploy AI systems
- Whether those systems are high-risk
- Whether they are used to make consequential decisions

## Related Considerations

While CAIA does not apply, you may still be subject to:
- Federal AI and consumer protection regulations
- Other state laws where you do business
- Industry-specific AI governance requirements
""",
        "outcome3": """# Not an AI System Under CAIA

## Overview

The technology or system you described does not qualify as an "artificial intelligence system" under the Colorado AI Act's definition.

## CAIA's Definition of AI System

Under § 6-1-1701(2), an "artificial intelligence system" means any machine-based system that, for any explicit or implicit objective, infers from the inputs the system receives how to generate outputs, including content, decisions, predictions, or recommendations, that can influence physical or virtual environments.

## Why Your System Is Not Covered

Your system does not meet this definition because it likely:
- Does not use machine learning or inference
- Follows deterministic, rule-based logic
- Does not generate outputs through learned patterns
- Is a traditional software application

## No Compliance Obligations

Since your system is not an AI system under CAIA, you have no obligations under the Act.

## Examples of Non-AI Systems

Systems that are typically not considered AI include:
- Traditional databases and queries
- Rule-based decision trees with no learning component
- Calculators and spreadsheets
- Static algorithms without adaptive components

## If Your Technology Changes

If you modify your system to incorporate machine learning, neural networks, or other AI capabilities, you should reassess whether CAIA applies.
""",
        "outcome4": """# Not a Developer Under CAIA

## Overview

Your organization is not considered a "developer" under the Colorado Artificial Intelligence Act.

## CAIA's Definition of Developer

Under § 6-1-1701(4), a "developer" means a person doing business in Colorado that develops or intentionally and substantially modifies an artificial intelligence system.

## Why You Are Not a Developer

You are not a developer because you:
- Do not create AI systems from scratch
- Do not substantially modify existing AI systems
- Only deploy or use AI systems created by others
- Make only minor configurations or customizations

## Potential Deployer Obligations

While you are not a developer, you may still have obligations as a **deployer** if you use high-risk AI systems to make consequential decisions in Colorado.

A "deployer" is a person doing business in Colorado that deploys a high-risk artificial intelligence system.

## Next Steps

If you deploy AI systems (created by others) for consequential decisions, assess whether:
- The AI systems are high-risk
- You qualify as a deployer
- You are exempt from deployer obligations

See the relevant outcomes for deployers (Outcome 2, 8, or 9) for more information.

## No Developer Documentation Required

You do not need to create developer documentation, conduct pre-deployment testing, or notify deployers of risks, as these are developer-specific obligations.
"""
    }
    
    outcome_title = outcome_titles.get(outcome, outcome)
    
    # Check if outcome has a dedicated markdown file
    if outcome in outcome_files:
        regs_dir = Path(__file__).parent / "regs"
        file_path = regs_dir / outcome_files[outcome]
        try:
            requirements_text = file_path.read_text(encoding="utf-8")
            return outcome_title, requirements_text
        except Exception as e:
            log.warning(f"Failed to load outcome file {file_path}: {e}")
            return outcome_title, f"# {outcome_title}\n\n*Requirements file could not be loaded. Please contact support.*"
    
    # Return not-regulated summary for outcomes without files
    if outcome in not_regulated_summaries:
        return outcome_title, not_regulated_summaries[outcome]
    
    # Fallback for unknown outcomes
    return outcome_title, f"# {outcome_title}\n\n*Classification details not available.*"

# ── Specialized Document Generation Agents ────────────────────────────

def _generate_general_statement(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate General Statement of Uses (Developer) - § 6-1-1702(2)(a)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1702(2)(a)):
A developer must provide a general statement describing:
- The reasonably foreseeable uses of the high-risk AI system
- Known harmful or inappropriate uses of the high-risk AI system

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a complete "General Statement of Intended and Prohibited Uses" document that developers can provide to deployers.

DOCUMENT STRUCTURE:
1. Introduction - Brief overview of the system and purpose of this statement
2. Reasonably Foreseeable Uses - List and describe legitimate use cases
3. Known Harmful or Inappropriate Uses - Explicitly list uses that are known to be harmful or inappropriate
4. Use Case Boundaries - Clarify the boundaries between appropriate and inappropriate uses
5. Deployment Context Considerations - Factors deployers should consider

CRITICAL INSTRUCTIONS:
- Generate ONLY the actual document itself - no meta-commentary
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: description]
- Do NOT reference outcome numbers or question IDs
- Write in professional, regulatory-compliant tone
- Be specific and actionable for deployers receiving this document
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a precision compliance documentation specialist. Generate complete, implementable documents."},
            {"role": "user", "content": prompt}
        ],
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_technical_summary(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Technical Summary (Developer) - § 6-1-1702(2)(b,e,f)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENTS:
§ 6-1-1702(2)(b) - Summary of training data type
§ 6-1-1702(2)(e) - Overview of data types deployers should use
§ 6-1-1702(2)(f) - Known limitations and risks of algorithmic discrimination

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a complete "Technical Summary" document for deployers.

DOCUMENT STRUCTURE:
1. System Overview - High-level description of the AI system architecture
2. Training Data Summary - Types of data used, sources, time periods, collection methods
3. Input Data Requirements - Types and formats of data deployers should provide
4. Data Quality Expectations - Standards for input data quality
5. Known Limitations - Technical and operational limitations
6. Known Risks of Algorithmic Discrimination - Specific discrimination risks identified
7. Mitigation Measures Implemented - Built-in safeguards and fairness controls
8. Data Handling and Privacy - How data is processed and protected

CRITICAL INSTRUCTIONS:
- Generate ONLY the actual document itself
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Use the organization's specific technical details from the user's answers
- For missing information, use: [PLACEHOLDER: specific technical detail needed]
- Do NOT reference outcome numbers or question IDs
- Use clear technical language appropriate for deployer technical teams
- Be specific about data types, formats, and requirements
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a technical compliance documentation specialist. Generate precise, actionable technical documents."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_evaluation_artifact(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Evaluation Artifact (Developer) - § 6-1-1702(2)(c,d)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENTS:
§ 6-1-1702(2)(c) - Description of how system was evaluated for performance and algorithmic discrimination mitigation, including limitations
§ 6-1-1702(2)(d) - Description of monitoring data deployers must provide

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a complete "Performance Evaluation and Monitoring Requirements" document.

DOCUMENT STRUCTURE:
1. Evaluation Methodology - Testing approach and frameworks used
2. Test Data Description - Characteristics of evaluation datasets
3. Performance Metrics - Overall accuracy, precision, recall, and other performance measures
4. Fairness Evaluation - Testing for algorithmic discrimination across protected characteristics
5. Fairness Metrics Results - Demographic parity, equal opportunity, calibration metrics
6. Limitations of Evaluation - Known limitations and gaps in testing
7. Ongoing Monitoring Requirements - Data deployers must collect and provide back to developer
8. Recommended Performance Thresholds - Metrics deployers should monitor
9. Monitoring Frequency - How often deployers should evaluate performance

CRITICAL INSTRUCTIONS:
- Generate ONLY the actual document itself
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Include specific metrics and methodologies from the user's answers
- For missing information, use: [PLACEHOLDER: specific metric or methodology]
- Do NOT reference outcome numbers or question IDs
- Use quantitative metrics where possible
- Be specific about what deployers must monitor and report back
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a technical compliance documentation specialist for AI evaluation. Generate complete, metric-driven documents."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_risk_management_policy(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Risk Management Policy (Deployer) - § 6-1-1703(2)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1703(2)):
A deployer must implement a risk management policy and program including:
- Documented policies, procedures, and practices to manage algorithmic discrimination risks
- Regular identification, documentation, and mitigation of risks
- Annual review and updates

The policy should align with NIST AI Risk Management Framework or ISO/IEC 42001.

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a complete "Risk Management Policy and Program" document.

DOCUMENT STRUCTURE:
1. Policy Statement - Purpose and scope of risk management program
2. Governance Structure - Roles, responsibilities, and accountability (map to NIST AI RMF GOVERN function)
3. Risk Identification Process - How risks are identified and documented (MAP function)
4. Risk Assessment and Measurement - Methods for evaluating risk severity (MEASURE function)
5. Risk Mitigation and Management - Strategies for addressing identified risks (MANAGE function)
6. Testing and Validation - Ongoing testing protocols for algorithmic discrimination
7. Monitoring and Reporting - Continuous monitoring and escalation procedures
8. Incident Response - Procedures when discrimination is detected
9. Annual Review Process - Schedule and methodology for annual updates
10. Documentation and Record-Keeping - What records must be maintained

CRITICAL INSTRUCTIONS:
- Generate ONLY the actual policy document itself
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Align with NIST AI RMF structure (Govern, Map, Measure, Manage)
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: specific procedure or detail]
- Do NOT reference outcome numbers or question IDs
- Write in formal policy language suitable for internal governance
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a compliance policy specialist. Generate formal, implementable governance documents aligned with NIST AI RMF."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_impact_assessment(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Impact Assessment (Deployer) - § 6-1-1703(3)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1703(3)):
A deployer must complete an impact assessment before deployment containing:
- Purpose, intended use cases, benefits, and deployment context
- Analysis of discrimination risks
- Description of data categories and data management
- Description of risk management implementation
- Performance metrics for evaluating algorithmic discrimination

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a complete "Impact Assessment" document that must be updated annually.

DOCUMENT STRUCTURE:
1. Executive Summary - High-level overview of the assessment
2. System Description and Purpose - Detailed description of the AI system and its purpose
3. Intended Use Cases and Benefits - Specific use cases and intended benefits
4. Deployment Context - Where and how the system will be deployed
5. Consequential Decision Analysis - Nature of decisions and potential impacts on consumers
6. Data Categories and Sources - Types of data processed, collected, and used
7. Data Management Practices - Collection, use, protection, and retention of data
8. Algorithmic Discrimination Risk Analysis - Identified risks across protected characteristics
9. Risk Mitigation Strategies - How identified risks are being addressed
10. Risk Management Program Implementation - Description of policies and procedures in place
11. Performance Metrics - Specific metrics for monitoring algorithmic discrimination
12. Testing and Validation Results - Summary of bias testing conducted
13. Human Oversight and Review - Role of human decision-makers
14. Consumer Rights Implementation - How consumer rights are being protected
15. Annual Review Schedule - Date of next required update

CRITICAL INSTRUCTIONS:
- Generate ONLY the actual impact assessment document
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: specific detail or data]
- Do NOT reference outcome numbers or question IDs
- Write in formal, analytical tone suitable for regulatory review
- Include specific, measurable metrics where possible
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a regulatory impact assessment specialist. Generate thorough, analytical assessment documents."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_public_website_statement(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Public Website Statement (Shared) - § 6-1-1702(4) / § 6-1-1703(4)"""
    
    # Determine role-specific requirements
    if user_role == "developer" or "Developer" in outcome_title:
        role_context = """As a DEVELOPER, your public statement must describe (§ 6-1-1702(4)):
- Types of high-risk AI systems you develop
- How you manage risks of algorithmic discrimination in development"""
    elif user_role == "deployer" or "Deployer" in outcome_title:
        role_context = """As a DEPLOYER, your public statement must describe (§ 6-1-1703(4)):
- Intended use of the high-risk AI systems you deploy
- How you manage known or reasonably foreseeable risks of algorithmic discrimination"""
    else:
        role_context = """As BOTH a developer and deployer, your public statement must describe:
- Types of high-risk AI systems you develop (developer requirement)
- How you manage discrimination risks in development (developer requirement)
- Intended uses of systems you deploy (deployer requirement)
- How you manage discrimination risks in deployment (deployer requirement)"""
    
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

ROLE-SPECIFIC REQUIREMENTS:
{role_context}

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a complete "Public AI Systems Disclosure" webpage content suitable for publishing on the organization's website.

DOCUMENT STRUCTURE:
1. Introduction - Brief statement about commitment to responsible AI
2. AI Systems Overview - Description of high-risk AI systems (developed and/or deployed)
3. Use Cases and Applications - How the AI systems are used
4. Risk Management Approach - How algorithmic discrimination risks are managed
5. Governance and Oversight - Who is accountable for AI systems
6. Testing and Validation - How systems are tested for fairness
7. Consumer Rights - How consumers can exercise their rights
8. Contact Information - How to reach the organization with questions or concerns
9. Additional Resources - Links to more detailed information

CRITICAL INSTRUCTIONS:
- Generate ONLY the actual webpage content
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Write for a public audience - clear, accessible language
- Balance transparency with trade secret protection
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: specific detail]
- Do NOT reference outcome numbers or question IDs
- Maintain professional tone that builds public trust
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a public communications specialist for AI compliance. Generate clear, trustworthy public disclosures."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_consumer_notice(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Consumer Notice Pre-Decision (Shared) - § 6-1-1703(5)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1703(5)):
When making or substantially influencing a consequential decision, deployers must provide consumers:
- Statement that a high-risk AI system was used in the decision-making
- Information about the purpose of the system
- Nature of the consequential decision
- Contact information for questions
- Rights to opt out (where applicable)
- Rights to appeal and seek human review

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate a "Consumer Notice Template" that can be customized for different consequential decisions.

DOCUMENT STRUCTURE:
1. Notice Header - Clear title indicating this is an AI use notice
2. AI System Usage Statement - Clear statement that AI is being used
3. Purpose and Function - What the AI system does
4. Decision Type - Nature of the consequential decision being made
5. Your Rights - List of consumer rights (opt-out, appeal, human review)
6. How to Exercise Your Rights - Specific instructions for exercising rights
7. Contact Information - How to get more information or file appeals
8. Additional Information - Where to find more details

FORMAT INSTRUCTION:
Analyze the USER'S SYSTEM DETAILS to determine the primary interaction mode (e.g., website, mobile app, phone, in-person).
Generate ONLY the single most appropriate notice format for that specific mode.

CRITICAL INSTRUCTIONS:
- Generate actual notice templates, not instructions
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Use plain language - aim for 8th grade reading level
- Be concise but complete - consumers need to understand their rights
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: specific detail]
- Do NOT reference outcome numbers or question IDs
- Format for easy implementation (copy-paste ready)
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a consumer communications specialist. Generate clear, accessible consumer notices in plain language."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_adverse_action_notice(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Adverse Action Notice (Shared) - § 6-1-1703(6)"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1703(6)):
For adverse consequential decisions, deployers must provide:
- Explanation of principal reason(s) for the adverse decision
- Data or data source that was a significant factor
- Opportunity to correct incorrect personal data
- Opportunity to appeal with human review (where technically feasible)
- Information about how to submit an appeal

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate an "Adverse Action Notice Template" that explains AI-based denials or negative decisions.

DOCUMENT STRUCTURE:
1. Notice Header - Clear indication this is an adverse action notice
2. Decision Summary - What decision was made
3. Principal Reasons - Main factors that led to the decision
4. Significant Data Factors - Specific data that influenced the decision
5. Right to Correct Data - How to correct any incorrect personal information
6. Right to Appeal - Clear explanation of appeal rights
7. How to Appeal - Step-by-step process for filing an appeal
8. Human Review Process - What to expect from human review
9. Timeline - How long the appeal process takes
10. Contact Information - Who to contact for appeals

FORMAT INSTRUCTION:
Analyze the USER'S SYSTEM DETAILS to determine the specific type of adverse decision being made.
Generate ONLY the single adverse action notice relevant to that specific decision type (e.g., "loan denial", "employment rejection", "housing application", etc).

CRITICAL INSTRUCTIONS:
- Generate actual notice templates that can be customized
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Use plain language - must be clear to consumers
- Be specific about appeal processes and timelines
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: specific procedure]
- Do NOT reference outcome numbers or question IDs
- Balance legal requirements with empathetic tone
- Format for easy implementation
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a consumer rights specialist. Generate clear, empathetic adverse action notices that protect consumer rights."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_interaction_notice(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Interaction Notice (General AI) - § 6-1-1704"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1704):
Entities that deploy AI systems intended to interact with consumers must disclose that the consumer is interacting with an AI system (unless it would be obvious to a reasonable person).

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate "AI Interaction Disclosure Notices" for various contexts.

DOCUMENT STRUCTURE:
Analyze the USER'S SYSTEM DETAILS to determine the specific interaction channel (e.g., chatbot, phone, email).
Generate ONLY the single disclosure notice appropriate for that specific channel.

Each notice should:
- Clearly state that user is interacting with AI
- Be concise (1-2 sentences)
- Be immediately visible/audible
- Use plain language

FORMATTING:
Ensure the notice format matches the identified channel (e.g., short text for chatbot, script for phone, etc).

CRITICAL INSTRUCTIONS:
- Generate actual disclosure text, not instructions
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Keep it very brief - consumers need immediate clarity
- Multiple format options for different channels
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: system name]
- Do NOT reference outcome numbers or question IDs
- Each disclosure should be copy-paste ready
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a user experience writer specializing in AI disclosures. Generate brief, clear interaction notices."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


def _generate_synthetic_content_disclosure(client, outcome_title: str, requirements_text: str, answers_text: str, user_role: Optional[str] = None) -> tuple[str, dict]:
    """Generate Synthetic Content/Deepfake Disclosure (General AI) - § 6-1-1704"""
    prompt = f"""You are a compliance documentation specialist for the Colorado AI Act.

CLASSIFICATION: {outcome_title}

STATUTORY REQUIREMENT (§ 6-1-1704):
For AI-generated synthetic content (including deepfakes), entities must disclose that the content is AI-generated.

USER'S SYSTEM DETAILS:
{answers_text or '<<No specific details provided>>'}

TASK:
Generate "Synthetic Content Disclosure Notices" for various media types.

DOCUMENT STRUCTURE:
Analyze the USER'S SYSTEM DETAILS to determine the specific type of synthetic content (e.g., image, video, audio, text).
Generate ONLY the single disclosure set appropriate for that specific content type.

Each disclosure should:
- Clearly state content is AI-generated
- Be prominent and conspicuous
- Use clear, plain language
- Avoid minimizing the AI nature

CRITICAL INSTRUCTIONS:
- Generate actual disclosure text and placement guidance
- Output MUST be in proper markdown format with appropriate headers, lists, and formatting
- Provide both short and detailed versions for the identified type
- Include visual placement recommendations (e.g., "Top-left watermark", "Opening 5 seconds")
- Use the organization's specific details from the user's answers
- For missing information, use: [PLACEHOLDER: content type]
- Do NOT reference outcome numbers or question IDs
- Each disclosure should be implementation-ready
"""
    
    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a media transparency specialist. Generate clear, prominent synthetic content disclosures."},
            {"role": "user", "content": prompt}
        ]
    )
    
    content = rsp.choices[0].message.content
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()
    return content, usage or {}


# ── Outcome Documentation Generation (Refactored) ─────────────────────

@app.post("/api/generate-outcome-documentation")
def generate_outcome_documentation(data: OutcomeDocumentationInput, request: Request):
    """Generate compliance documentation based on survey outcome and user answers."""
    _rate_limit(request.client.host)
    # Note: not checking invite for this endpoint to allow broader access
    
    # Load outcome requirements from markdown files
    outcome_title, requirements_text = _load_outcome_requirements(data.outcome)
    
    # DEMO mode: return outcome requirements with sample answers
    if DEMO_MODE:
        demo_report = f"""# {outcome_title}

{requirements_text}

---

## Your Provided Information

"""
        for qid, answer in data.answers.items():
            if answer:
                demo_report += f"**{qid}**: {answer[:200]}{'...' if len(answer) > 200 else ''}\n\n"
        
        if not data.answers:
            demo_report += "*No specific answers provided yet.*\n"
        
        demo_report += "\n*This is demo mode. In production, AI-generated personalized documentation would appear here.*"
        
        return {"documents": {"demo_report": demo_report}, "usage": {"total_tokens": 0}}
    
    # Check if outcome is "not regulated" (outcomes 1, 3, 4)
    # For these, return empty documents dict
    if data.outcome in ["outcome1", "outcome3", "outcome4"]:
        return {
            "documents": {},
            "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}
        }
    
    # Normal path with LLM for regulated outcomes
    client = get_openai_client()
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set on server")
    
    # Format user's detailed answers for the prompt
    answers_text = ""
    if data.answers:
        for qid, answer in data.answers.items():
            if answer:
                answers_text += f"\n**{qid}**: {answer}\n"
    
    # Determine which documents to generate based on outcome
    documents_to_generate = []
    
    if data.outcome == "outcome2":  # Exempt Deployer
        documents_to_generate = [
            ("consumer_notice", _generate_consumer_notice),
            ("adverse_action_notice", _generate_adverse_action_notice),
            ("public_website_statement", _generate_public_website_statement),
        ]
    elif data.outcome == "outcome5":  # General AI with Disclosure Duty
        documents_to_generate = [
            ("interaction_notice", _generate_interaction_notice),
            ("synthetic_content_disclosure", _generate_synthetic_content_disclosure),
        ]
    elif data.outcome == "outcome6":  # Not a Regulated System
        return {
            "documents": {},
            "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}
        }
    elif data.outcome == "outcome7":  # Developer of High-Risk AI
        documents_to_generate = [
            ("general_statement", _generate_general_statement),
            ("technical_summary", _generate_technical_summary),
            ("evaluation_artifact", _generate_evaluation_artifact),
            ("public_website_statement", _generate_public_website_statement),
        ]
    elif data.outcome == "outcome8":  # Deployer of High-Risk AI
        documents_to_generate = [
            ("risk_management_policy", _generate_risk_management_policy),
            ("impact_assessment", _generate_impact_assessment),
            ("consumer_notice", _generate_consumer_notice),
            ("adverse_action_notice", _generate_adverse_action_notice),
            ("public_website_statement", _generate_public_website_statement),
        ]
    elif data.outcome == "outcome9":  # Both Developer and Deployer
        documents_to_generate = [
            # Developer documents
            ("general_statement", _generate_general_statement),
            ("technical_summary", _generate_technical_summary),
            ("evaluation_artifact", _generate_evaluation_artifact),
            # Deployer documents
            ("risk_management_policy", _generate_risk_management_policy),
            ("impact_assessment", _generate_impact_assessment),
            ("consumer_notice", _generate_consumer_notice),
            ("adverse_action_notice", _generate_adverse_action_notice),
            # Shared
            ("public_website_statement", _generate_public_website_statement),
        ]
    else:
        # Unknown outcome - return empty
        return {
            "documents": {},
            "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}
        }
    
    # Determine user role for role-aware functions
    user_role = None
    if "Developer" in outcome_title and "Deployer" in outcome_title:
        user_role = "both"
    elif "Developer" in outcome_title:
        user_role = "developer"
    elif "Deployer" in outcome_title:
        user_role = "deployer"
    
    # Generate all documents in parallel using ThreadPoolExecutor
    documents = {}
    usage_stats = {
        "total_tokens": 0,
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "per_document": {}
    }
    
    with ThreadPoolExecutor(max_workers=len(documents_to_generate)) as executor:
        # Submit all document generation tasks
        future_to_doc = {
            executor.submit(
                doc_func, 
                client, 
                outcome_title, 
                requirements_text, 
                answers_text,
                user_role
            ): doc_name
            for doc_name, doc_func in documents_to_generate
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_doc):
            doc_name = future_to_doc[future]
            try:
                content, usage = future.result()
                documents[doc_name] = content
                
                # Aggregate usage stats
                usage_stats["per_document"][doc_name] = usage
                usage_stats["total_tokens"] += usage.get("total_tokens", 0)
                usage_stats["prompt_tokens"] += usage.get("prompt_tokens", 0)
                usage_stats["completion_tokens"] += usage.get("completion_tokens", 0)
            except Exception as e:
                log.error(f"Failed to generate {doc_name}: {e}")
                documents[doc_name] = f"# Error\n\nFailed to generate this document: {str(e)}"
    
    return {"documents": documents, "usage": usage_stats}


@app.post("/api/generate-checklist")
def generate_checklist(data: OutcomeDocumentationInput, request: Request):
    """Generate a dynamic compliance checklist based on survey outcome and user answers."""
    _rate_limit(request.client.host)
    
    # Load outcome requirements
    outcome_title, requirements_text = _load_outcome_requirements(data.outcome)

    # DEMO mode
    if DEMO_MODE:
        return {
            "checklist": [
                "Verify small business exemption criteria",
                "Review developer documentation",
                "Create internal AI use policy",
                "Designate consumer inquiry contact"
            ],
            "usage": {"total_tokens": 0}
        }

    # Not regulated outcomes -> empty checklist or simple message?
    # The plan says "Generate concise... list of action steps that are required for the business to be fully compliant."
    # If not regulated, checklist might be empty or just "Monitor for changes".
    # However, usually we just want to skip LLM if not regulated.
    if data.outcome in ["outcome1", "outcome3", "outcome4"]:
         return {
            "checklist": ["Monitor operations for changes that might trigger compliance obligations."],
            "usage": {"total_tokens": 0}
        }

    client = get_openai_client()
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set on server")

    # Format answers
    answers_text = ""
    if data.answers:
        for qid, answer in data.answers.items():
            if answer:
                answers_text += f"\n**{qid}**: {answer}\n"

    prompt = f"""You are an expert legal compliance assistant for the Colorado AI Act (CAIA).

CLASSIFICATION: {outcome_title}

LEGAL REQUIREMENTS:
{requirements_text}

USER'S DETAILED ANSWERS:
{answers_text or '<<No specific answers provided yet>>'}

TASK:
Generate a concise, bullet-point list of action steps required for this business to be fully compliant.
- Each item must be a singular responsibility.
- Each item must be 15 words or less.
- Address specific legal requirements from the provided text.
- Do NOT include random actions or guessing.
- ONLY include the bullet list.
- Denote bullet points with "*".

Example Output:
* Create Deployer safety plan
* Designate consumer inquiry contact
* Implement bias testing protocol
"""

    rsp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a precise legal assistant. Output only a bulleted list."},
            {"role": "user", "content": prompt},
        ]
    )

    content = rsp.choices[0].message.content
    
    # Parse bullet points
    checklist_items = []
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('*') or line.startswith('-'):
            # Remove the bullet and whitespace
            clean_line = line.lstrip('*- ').strip()
            if clean_line:
                checklist_items.append(clean_line)
    
    usage = getattr(rsp, "usage", None)
    if hasattr(usage, "model_dump"):
        usage = usage.model_dump()

    return {"checklist": checklist_items, "usage": usage}


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


@app.post("/api/chat/compliance-assistant")
def compliance_chat(data: ChatMessage, request: Request):
    """RAG-powered chatbot for SB 24-205 compliance questions"""
    _rate_limit(request.client.host)

    # DEMO mode: simple responses
    if DEMO_MODE:
        return {
            "message": f"Demo mode: I received your question '{data.message}'. In production, I would use RAG to answer based on SB 24-205.",
            "citations": [],
            "suggested_questions": [
                "What is algorithmic discrimination?",
                "When is the compliance deadline?",
                "What are deployer obligations?"
            ]
        }

    # Normal path with RAG
    client = get_openai_client()
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set on server")

    # Extract user context
    user_context = data.context or {}
    outcome = user_context.get('outcome', '')
    role = user_context.get('role', 'unknown')

    # Outcome titles for context
    outcome_titles = {
        "outcome1": "Not Subject to the Colorado AI Act",
        "outcome2": "Exempt Deployer",
        "outcome3": "Not an AI System Under CAIA",
        "outcome4": "Not a Developer Under CAIA",
        "outcome5": "General AI System with Disclosure Duty",
        "outcome6": "Not a Regulated System",
        "outcome7": "Developer of High-Risk AI System",
        "outcome8": "Deployer of High-Risk AI System",
        "outcome9": "Both Developer and Deployer of High-Risk AI System"
    }
    outcome_title = outcome_titles.get(outcome, "Unknown")

    # Build context-aware query for RAG
    enhanced_query = f"""
User Classification: {outcome_title}
User Question: {data.message}
"""

    # Retrieve relevant SB 24-205 sections using RAG
    top_snips = []
    regulatory_context = ""
    if REG_INDEX and retrieve:
        try:
            top_snips = retrieve(client, REG_INDEX, enhanced_query, k=5)
            regulatory_context = _compose_context_snippets(top_snips)
        except Exception as e:
            log.warning(f"Retrieval failed; continuing without context: {e}")

    # Build system prompt
    system_prompt = f"""You are a Colorado AI Act (SB 24-205) compliance advisor chatbot.

USER CONTEXT:
- Classification: {outcome_title}
- Role: {role}

Your job is to:
1. Answer questions using ONLY the provided SB 24-205 text below
2. Cite specific sections using format [SB 24-205 §X]
3. Focus on obligations relevant to their classification
4. Be concise and actionable (2-3 paragraphs max)
5. If the answer isn't in the provided text, say "I don't have that specific information in SB 24-205"

RELEVANT LAW SECTIONS FROM SB 24-205:
{regulatory_context or '<<No relevant sections found>>'}
"""

    # Call LLM
    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.message}
            ],
            temperature=0.1,  # Low temperature for accuracy
        )

        answer = response.choices[0].message.content

        # Generate suggested follow-up questions based on classification
        suggested_questions = []
        if "outcome7" in outcome or "outcome9" in outcome:  # Developer
            suggested_questions = [
                "What documentation must I provide to deployers?",
                "What are my notification obligations to the Attorney General?",
                "What is 'reasonable care' for developers?"
            ]
        elif "outcome8" in outcome or "outcome9" in outcome:  # Deployer
            suggested_questions = [
                "How often must I conduct impact assessments?",
                "What is required in a risk management program?",
                "What are consumer notification requirements?"
            ]
        else:
            suggested_questions = [
                "What is a 'consequential decision'?",
                "What is 'algorithmic discrimination'?",
                "When does SB 24-205 take effect?"
            ]

        return {
            "message": answer,
            "citations": [{"key": s.key, "title": s.title, "source": s.source} for s in top_snips],
            "suggested_questions": suggested_questions
        }

    except Exception as e:
        log.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate response")

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
