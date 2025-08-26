import os
import time
import random
import streamlit as st
from dotenv import load_dotenv
import openai

# --- Load env & client -------------------------------------------------------
load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY")
DEMO_MODE = os.getenv("DEMO_MODE", "").strip().lower() in {"1", "true", "yes"}
MODEL = os.getenv("OPENAI_MODEL", "gpt-5-nano")

if not API_KEY and not DEMO_MODE:
    st.error("OPENAI_API_KEY is not set and DEMO_MODE is off.")
    st.stop()

client = None
if not DEMO_MODE:
    client = openai.OpenAI(api_key=API_KEY, timeout=30, max_retries=2)

# --- Helper: safe chat with retries & graceful fallback ----------------------
def safe_chat(system_msg: str, user_msg: str, temperature: float = 0.2, max_attempts: int = 5):
    """
    Robust wrapper for OpenAI chat calls with exponential backoff.
    Falls back to a deterministic synthesized text on repeated failures.
    """
    if DEMO_MODE:
        return _fallback_text(user_msg)

    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                temperature=temperature,
            )
            return resp.choices[0].message.content
        except openai.APIConnectionError as e:
            last_err = e
        except openai.RateLimitError as e:
            last_err = e
        except openai.OpenAIError as e:
            # Retry server-side errors; surface client errors
            status = getattr(e, "status_code", None)
            if status and 500 <= int(status) < 600:
                last_err = e
            else:
                raise
        # backoff
        sleep_s = min(1.5 * (2 ** (attempt - 1)) + random.random(), 12)
        time.sleep(sleep_s)

    # Graceful fallback so users still see output
    st.warning("We're experiencing connectivity issues to the model. Showing a synthesized offline draft.")
    return _fallback_text(user_msg)

def _fallback_text(prompt: str) -> str:
    return (
        "*(Offline draft due to temporary connectivity; replace once online.)*\n\n"
        f"**Summary of your input**\n{prompt.strip()[:1600]}\n\n"
        "- Control 1: Add clear escalation & human-in-the-loop for low confidence cases.\n"
        "- Control 2: Minimize and hash logs; rotate keys; deletion on request.\n"
        "- Control 3: Weekly review of deflections/errors; re-train on redacted samples.\n"
    )

# --- UI: Title & note --------------------------------------------------------
st.title("AI Compliance Assistant Wizard")
st.info(
    "Tip: Each field below shows a helpful example. "
    "Click into a box to type your own, or press **Use examples for this step** to auto‑fill and edit."
)

# --- Suggested examples ------------------------------------------------------
EXAMPLES = {
    "system_name": "NovaChat AI Support Assistant",
    "provider_name": "AcmeAI, Inc.",
    "system_purpose": (
        "Provide first‑line customer support for a mid‑market e‑commerce platform. "
        "Scope: answer FAQs, track orders, summarize tickets for agents, and draft responses. "
        "Users: internal support agents and end‑customers via chat. "
        "Out of scope: issuing refunds, account deletions, or policy changes."
    ),
    "dev_process": (
        "Followed CRISP‑ML(Q) lifecycle with gated code reviews. "
        "Training data: synthetic + redacted transcripts; PII redaction; deduplication. "
        "Experiments tracked in W&B; approvals via PR templates."
    ),
    "algorithm_choices": (
        "Primary: Llama‑3.1‑8B‑Instruct fine‑tuned with LoRA for support tone. "
        "Retrieval: RAG over product KB (OpenSearch) with hybrid BM25+embedding. "
        "Guardrails: regex + policy filters for PII/PHI, length caps. "
        "Rationale: small model for latency/cost, RAG to reduce hallucinations."
    ),
    "capabilities_limits": (
        "Capabilities: grounded answers with citations; order lookups via internal API; agent summaries. "
        "Limits: struggles with ambiguous queries, non‑English inputs, or stale KB entries; "
        "conversational memory ~10 messages."
    ),
    "foreseeable_risks": (
        "Risks: inaccurate guidance; exposure of sensitive order info; biased tone. "
        "Mitigations: retrieval grounding; PII redaction; human‑in‑the‑loop for refunds; "
        "fallback to agent after 2 low‑confidence turns; weekly error review."
    ),
    "standards_used": (
        "Mapped to GDPR (lawful basis: legitimate interests for support, with opt‑out), "
        "NIST AI RMF (govern/map/measure/manage), and ISO/IEC 27001 inherited controls. "
        "Vendor DPA signed; DPIA performed and updated quarterly."
    ),
    "postmarket_monitoring": (
        "Log prompts/responses with hashes + minimal metadata; deflection/escalation metrics; "
        "thumbs up/down feedback; monthly bias/safety tests; incident runbooks; "
        "KB freshness SLA (48h) and rollback plan."
    ),
}

# --- Session state -----------------------------------------------------------
if "step" not in st.session_state:
    st.session_state.step = 0
if "responses" not in st.session_state:
    st.session_state.responses = {}

def next_step(): st.session_state.step += 1
def prev_step(): st.session_state.step -= 1
def set_fields(pairs): st.session_state.responses.update(pairs); st.rerun()
def clear_fields(keys):
    for k in keys: st.session_state.responses[k] = ""
    st.rerun()

# --- Field helpers with placeholders ----------------------------------------
def ti(key, label, placeholder):
    value = st.text_input(label, value=st.session_state.responses.get(key, ""), placeholder=placeholder)
    st.session_state.responses[key] = value

def ta(key, label, placeholder, height=160):
    value = st.text_area(label, value=st.session_state.responses.get(key, ""), placeholder=placeholder, height=height)
    st.session_state.responses[key] = value

# --- Steps -------------------------------------------------------------------
if st.session_state.step == 0:
    st.header("Step 1: General AI System Information")
    ti("system_name", "System Name", EXAMPLES["system_name"])
    ti("provider_name", "Provider Name", EXAMPLES["provider_name"])
    ta("system_purpose", "Intended Purpose & Scope", EXAMPLES["system_purpose"])
    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step"): set_fields({
            "system_name": EXAMPLES["system_name"],
            "provider_name": EXAMPLES["provider_name"],
            "system_purpose": EXAMPLES["system_purpose"],
        })
    with cols[1]:
        if st.button("Clear step"): clear_fields(["system_name","provider_name","system_purpose"])
    st.divider()
    if st.button("Next"): next_step()

elif st.session_state.step == 1:
    st.header("Step 2: Technical Development Details")
    ta("dev_process", "Development Process & Methodology", EXAMPLES["dev_process"])
    ta("algorithm_choices", "Algorithm Choices & Rationale", EXAMPLES["algorithm_choices"])
    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step", key="ex1"):
            set_fields({"dev_process":EXAMPLES["dev_process"], "algorithm_choices":EXAMPLES["algorithm_choices"]})
    with cols[1]:
        if st.button("Clear step", key="cl1"): clear_fields(["dev_process","algorithm_choices"])
    st.divider()
    c1,c2 = st.columns(2)
    with c1:
        if st.button("Previous"): prev_step()
    with c2:
        if st.button("Next"): next_step()

elif st.session_state.step == 2:
    st.header("Step 3: Performance & Risk Management")
    ta("capabilities_limits", "Capabilities & Limitations", EXAMPLES["capabilities_limits"])
    ta("foreseeable_risks", "Foreseeable Risks & Mitigation", EXAMPLES["foreseeable_risks"])
    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step", key="ex2"):
            set_fields({"capabilities_limits":EXAMPLES["capabilities_limits"], "foreseeable_risks":EXAMPLES["foreseeable_risks"]})
    with cols[1]:
        if st.button("Clear step", key="cl2"): clear_fields(["capabilities_limits","foreseeable_risks"])
    st.divider()
    c1,c2 = st.columns(2)
    with c1:
        if st.button("Previous"): prev_step()
    with c2:
        if st.button("Next"): next_step()

elif st.session_state.step == 3:
    st.header("Step 4: Compliance & Post‑Market Plans")
    ta("standards_used", "Standards/Technical Specifications Followed", EXAMPLES["standards_used"])
    ta("postmarket_monitoring", "Post‑Market Monitoring Plan", EXAMPLES["postmarket_monitoring"])
    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step", key="ex3"):
            set_fields({"standards_used":EXAMPLES["standards_used"], "postmarket_monitoring":EXAMPLES["postmarket_monitoring"]})
    with cols[1]:
        if st.button("Clear step", key="cl3"): clear_fields(["standards_used","postmarket_monitoring"])
    st.divider()
    c1,c2 = st.columns(2)
    with c1:
        if st.button("Previous"): prev_step()
    with c2:
        if st.button("Generate Compliance Documentation"): next_step()

else:
    # Generate both sections with retry/fallback
    with st.spinner("Generating documentation..."):
        r = st.session_state.responses

        rec_prompt = f"""
        Given this AI system info:
        - Intended purpose: {r.get('system_purpose','')}
        - Algorithms used: {r.get('algorithm_choices','')}
        - Known risks: {r.get('foreseeable_risks','')}
        Suggest 3 practical risk management controls with brief justifications.
        """
        recommendations = safe_chat(
            "You're an AI compliance expert providing actionable risk management advice.",
            rec_prompt,
            temperature=0.2,
        )

        doc_prompt = f"""
        Create a professional EU AI Act compliance report from the details below.
        - Synthesize; avoid verbatim repetition.
        - Map details to EU AI Act obligations and GDPR where relevant.
        - List missing items as 'Action items'.

        General Info
        Name: {r.get('system_name','')}
        Provider: {r.get('provider_name','')}
        Purpose: {r.get('system_purpose','')}

        Technical Development
        Process: {r.get('dev_process','')}
        Algorithms: {r.get('algorithm_choices','')}

        Performance & Risk
        Capabilities: {r.get('capabilities_limits','')}
        Risks: {r.get('foreseeable_risks','')}

        Compliance Plans
        Standards: {r.get('standards_used','')}
        Post-Market: {r.get('postmarket_monitoring','')}
        """
        documentation = safe_chat(
            "You are a compliance analyst creating robust EU AI Act documentation.",
            doc_prompt,
            temperature=0.2,
        )

        st.subheader("AI Compliance Documentation")
        st.markdown(documentation)

        st.subheader("Recommended Risk Controls")
        st.markdown(recommendations)

        st.download_button(
            "Download Documentation",
            documentation,
            file_name="AI_Compliance_Report.md",
            mime="text/markdown",
        )

    if st.button("Start Over"):
        st.session_state.step = 0
        st.session_state.responses = {}
