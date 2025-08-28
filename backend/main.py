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
DEMO_MD = (DEMO_DIR / "sample_annex_iv.md").read_text(encoding="utf-8") if DEMO_DIR.exists() else ""
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
    # DEMO fast‑path: canned Annex IV + injected metadata
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
You are an EU AI Act compliance analyst. Using ONLY the regulatory excerpts below for citations, draft a
structured Annex IV Technical Documentation for the described AI system. Use [S#] inline citations only where supported.

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
        "use_case": "HR hiring (recruitment & selection)",
        "risk_notes": (
            "- Risk of indirect discrimination via correlated features (education, employment gaps)\n"
            "- Automation bias among recruiters; over‑reliance on score\n"
            "- Drift across geographies/roles; calibration degradation\n"
            "- PII leakage in features; explanation text revealing sensitive info\n"
        ),
        "free_text_notes": "Model: gradient‑boosted trees; PII masking + fairness checks; human approval required.",
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
