import os, logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY") or ""
if not api_key:
    raise RuntimeError("OPENAI_API_KEY missing")

client = OpenAI(api_key=api_key)
app = FastAPI()
logging.basicConfig(level=logging.INFO)

# --- allow JS served elsewhere to call the API later ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten in prod
    allow_methods=["POST"],
    allow_headers=["*"],
)

# --- static files under /static ---
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# --- root returns index.html ---
@app.get("/")
def read_root():
    return FileResponse("frontend/index.html")

# --- input schema ---
class AIComplianceInput(BaseModel):
    system_name: str
    intended_purpose: str
    use_case: str

# --- POST endpoint ---
@app.post("/generate-compliance")
def generate_compliance(data: AIComplianceInput):
    logging.info(f"POST /generate-compliance for {data.system_name}")

    prompt = f"""
    You are an expert EU AI Act compliance analyst.

    Minimal input:
    - Name: {data.system_name}
    - Purpose: {data.intended_purpose}
    - Use‑Case: {data.use_case}

    TASKS:
    1. Obligations Summary
    2. Documentation Needed
    3. 3 Risk‑Control Recommendations
    4. Action Items (missing info)

    Return four labeled sections.
    """

    try:
        rsp = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "Helpful compliance assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {"compliance_report": rsp.choices[0].message.content}
