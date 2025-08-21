# backend/outreach.py
# Drop-in outreach utilities for Clarynt
# Endpoints:
#   POST /api/outreach/invite           -> {invite_url}
#   POST /api/outreach/share-sample     -> {share_url, token}
#   GET  /api/outreach/share/{token}    -> {title, doc, completeness, evidence}

import os, secrets, hashlib, json
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, create_engine, Session, select

# ---------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clarynt.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

APP_ORIGIN = os.getenv("APP_ORIGIN", "https://app.clarynt.net")
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ADMIN_KEY = os.getenv("ADMIN_KEY")  # set in Render → Environment

router = APIRouter(prefix="/api/outreach", tags=["outreach"])

def _hash(token: str) -> str:
    return hashlib.sha256((token + SECRET_KEY).encode()).hexdigest()

def get_session():
    with Session(engine) as session:
        yield session

def require_admin(x_admin_key: Optional[str] = Header(default=None)):
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(401, "Admin key required")
    return True

# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------
class Invite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: Optional[str] = None
    token_hash: str
    max_uses: int = 3
    uses: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    created_by_email: Optional[str] = None

class ShareDoc(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token_hash: str
    title: str
    payload_json: str  # JSON string of the rendered Annex IV doc
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    created_by_email: Optional[str] = None

SQLModel.metadata.create_all(engine)

# ---------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------
class InviteCreate(BaseModel):
    email: Optional[str] = None
    max_uses: int = 3
    days_valid: int = 14
    created_by_email: Optional[str] = None

class ShareSampleCreate(BaseModel):
    days_valid: int = 30
    created_by_email: Optional[str] = None
    sample_type: str = "hr"

# ---------------------------------------------------------------------
# Sample Annex IV payload (HR resume screener)
# ---------------------------------------------------------------------
SAMPLE_ANNEX_IV: Dict[str, Any] = {
    "model_name": "Clarynt HR Resume Screening (Demo)",
    "version": "1.0.0-demo",
    "generated_at": datetime.utcnow().isoformat() + "Z",
    "intended_purpose": (
        "Assist recruiters by prioritizing applicant resumes for screening in entry-level "
        "engineering roles within the EU. The system surfaces candidates to human reviewers; "
        "final decisions remain with recruiting staff."
    ),
    "deployment_context": "Used by an EU-based SaaS SMB across Germany, Sweden, and the Netherlands.",
    "data_sources": (
        "Historical resumes and recruiter dispositions from 2019–2024; public job descriptions; "
        "PII minimized and anonymized where possible; class imbalance addressed with stratified sampling."
    ),
    "risk_management": (
        "Key risks: indirect bias, data drift, spurious correlations, automation bias. "
        "Mitigations: bias evals by gender proxy and region, calibrated thresholds, human-in-the-loop, "
        "periodic fairness audits, incident response runbook."
    ),
    "human_oversight": (
        "Recruiters must review all recommendations; override tools and an appeal path exist. "
        "All automated recommendations are logged with rationale excerpts."
    ),
    "performance_metrics": (
        "Top-k recall@20 on held-out 2024 data = 0.86; false-positive override rate (human) = 0.18; "
        "no significant adverse impact detected at 95% CI across monitored groups."
    ),
    "post_deployment_monitoring": (
        "Weekly drift check on embedding distribution, monthly fairness audit, ticketed incident workflow, "
        "rollback to previous model version available."
    ),
    "evidence": [
        {"id": "E-1", "type": "Policy", "name": "AI Use & Oversight Policy v1.2"},
        {"id": "E-2", "type": "Test Result", "name": "Bias & Performance Evaluation (Feb 2025)"},
        {"id": "E-3", "type": "DPIA", "name": "HR Screening DPIA Summary"},
    ],
    "completeness": 0.84
}

# ---------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------
@router.post("/invite")
def create_invite(body: InviteCreate, admin_ok: bool = Depends(require_admin), session: Session = Depends(get_session)):
    token = secrets.token_urlsafe(32)
    inv = Invite(
        email=body.email,
        token_hash=_hash(token),
        max_uses=body.max_uses,
        uses=0,
        expires_at=datetime.utcnow() + timedelta(days=body.days_valid),
        created_by_email=body.created_by_email
    )
    session.add(inv); session.commit()
    invite_url = f"{APP_ORIGIN}/register?invite={token}"
    return {"invite_url": invite_url}

@router.post("/share-sample")
def share_sample(body: ShareSampleCreate, admin_ok: bool = Depends(require_admin), session: Session = Depends(get_session)):
    token = secrets.token_urlsafe(24)
    sh = ShareDoc(
        token_hash=_hash(token),
        title="EU AI Act Annex IV — HR Screening (Sample)",
        payload_json=json.dumps(SAMPLE_ANNEX_IV),
        expires_at=datetime.utcnow() + timedelta(days=body.days_valid),
        created_by_email=body.created_by_email
    )
    session.add(sh); session.commit()
    share_url = f"{APP_ORIGIN}/share/{token}"
    return {"share_url": share_url, "token": token}

@router.get("/share/{token}")
def get_shared_doc(token: str, session: Session = Depends(get_session)):
    token_hash = _hash(token)
    sh = session.exec(select(ShareDoc).where(ShareDoc.token_hash == token_hash)).first()
    if not sh:
        raise HTTPException(404, "Not found")
    if sh.expires_at and sh.expires_at < datetime.utcnow():
        raise HTTPException(410, "Link expired")
    payload = json.loads(sh.payload_json)
    return {
        "title": sh.title,
        "doc": payload,
        "completeness": payload.get("completeness", None),
        "evidence": payload.get("evidence", []),
        "created_at": sh.created_at.isoformat() + "Z"
    }

@router.get("/health")
def health():
    return {"ok": True, "service": "outreach"}
