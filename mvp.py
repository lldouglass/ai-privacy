import streamlit as st
from dotenv import load_dotenv
import openai
import os

# --- Load env & OpenAI client ---
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=api_key)

st.title("AI Compliance Assistant Wizard")

# ------------------------------
# Suggested example content
# ------------------------------
EXAMPLES = {
    # Step 0
    "system_name": "NovaChat AI Support Assistant",
    "provider_name": "AcmeAI, Inc.",
    "system_purpose": (
        "Provide first‑line customer support for a mid‑market e‑commerce platform. "
        "Scope: answer FAQs, track orders, summarize tickets for agents, and draft responses. "
        "Users: internal support agents and end‑customers via chat. "
        "Out of scope: issuing refunds, account deletions, or policy changes."
    ),

    # Step 1
    "dev_process": (
        "Followed CRISP‑ML(Q) style lifecycle with gated code reviews. "
        "Training data: synthetic + redacted chat transcripts annotated for intent. "
        "Data pipeline includes PII redaction, deduplication, and prompt‑leak checks. "
        "Model experiments tracked with Weights & Biases; approvals via PR templates."
    ),
    "algorithm_choices": (
        "Primary: Llama‑3.1‑8B‑Instruct fine‑tuned with LoRA for support tone. "
        "Retrieval: RAG over product KB (OpenSearch) with hybrid BM25+embedding search. "
        "Guardrails: regex + policy filters for PII/PHI, and response length caps. "
        "Rationale: small model for latency/cost, RAG to reduce hallucinations."
    ),

    # Step 2
    "capabilities_limits": (
        "Capabilities: answers grounded in KB; order lookups via internal API; summary for agents. "
        "Limits: may underperform for ambiguous queries, non‑English inputs, or stale KB entries; "
        "multi‑turn memory limited to ~10 messages."
    ),
    "foreseeable_risks": (
        "Risks: inaccurate guidance; disclosure of sensitive order info; biased tone with escalation. "
        "Mitigations: retrieval grounding with citations; PII redaction; human‑in‑the‑loop for refunds; "
        "fallback to agent after 2 low‑confidence turns; weekly error review."
    ),

    # Step 3
    "standards_used": (
        "Mapped to GDPR (lawful basis: legitimate interests for support, with opt‑out), "
        "NIST AI RMF (govern, map, measure, manage), and ISO/IEC 27001 controls inherited from cloud. "
        "Vendor DPA in place; DPIA performed and updated quarterly."
    ),
    "postmarket_monitoring": (
        "Log prompts/responses with hashes + minimal metadata; stats on deflections and escalations; "
        "user feedback thumbs up/down; monthly bias & safety tests; incident runbooks; "
        "KB freshness SLA (48h) and rollback plan for regressions."
    ),
}

# ------------------------------
# Session state
# ------------------------------
if "step" not in st.session_state:
    st.session_state.step = 0

if "responses" not in st.session_state:
    st.session_state.responses = {}

def next_step():
    st.session_state.step += 1

def prev_step():
    st.session_state.step -= 1

def set_fields(pairs: dict):
    """Bulk set responses then rerender."""
    st.session_state.responses.update(pairs)
    st.rerun()

def clear_fields(keys):
    """Clear given keys for the step then rerender."""
    for k in keys:
        st.session_state.responses[k] = ""
    st.rerun()

# ------------------------------
# Field helpers with placeholders
# ------------------------------
def ti(key, label, placeholder):
    value = st.text_input(
        label,
        value=st.session_state.responses.get(key, ""),
        placeholder=placeholder,
    )
    st.session_state.responses[key] = value

def ta(key, label, placeholder, height=160):
    value = st.text_area(
        label,
        value=st.session_state.responses.get(key, ""),
        placeholder=placeholder,
        height=height,
    )
    st.session_state.responses[key] = value

st.info(
    "ℹ️ Each field shows suggested **placeholder examples**. "
    "Click into a box to type your own, or press **Use examples for this step** to auto‑fill and edit."
)

# ------------------------------
# Step 0: General Info
# ------------------------------
if st.session_state.step == 0:
    st.header("Step 1: General AI System Information")

    # Inputs with placeholders
    ti("system_name", "System Name", EXAMPLES["system_name"])
    ti("provider_name", "Provider Name", EXAMPLES["provider_name"])
    ta("system_purpose", "Intended Purpose & Scope", EXAMPLES["system_purpose"])

    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step"):
            set_fields({
                "system_name": EXAMPLES["system_name"],
                "provider_name": EXAMPLES["provider_name"],
                "system_purpose": EXAMPLES["system_purpose"],
            })
    with cols[1]:
        if st.button("Clear step"):
            clear_fields(["system_name", "provider_name", "system_purpose"])
    with cols[2]:
        st.caption("Tip: Clarify scope, end‑users, and actions that are explicitly out‑of‑scope.")

    st.divider()
    if st.button("Next"):
        next_step()

# ------------------------------
# Step 1: Technical Development Details
# ------------------------------
elif st.session_state.step == 1:
    st.header("Step 2: Technical Development Details")

    ta("dev_process", "Development Process & Methodology", EXAMPLES["dev_process"])
    ta("algorithm_choices", "Algorithm Choices & Rationale", EXAMPLES["algorithm_choices"])

    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step", key="ex1"):
            set_fields({
                "dev_process": EXAMPLES["dev_process"],
                "algorithm_choices": EXAMPLES["algorithm_choices"],
            })
    with cols[1]:
        if st.button("Clear step", key="cl1"):
            clear_fields(["dev_process", "algorithm_choices"])
    with cols[2]:
        st.caption("Tip: Mention data handling (redaction/synthetic), approvals, and traceability of experiments.")

    st.divider()
    c1, c2 = st.columns(2)
    with c1:
        if st.button("Previous"):
            prev_step()
    with c2:
        if st.button("Next"):
            next_step()

# ------------------------------
# Step 2: Performance & Risks
# ------------------------------
elif st.session_state.step == 2:
    st.header("Step 3: Performance & Risk Management")

    ta("capabilities_limits", "Capabilities & Limitations", EXAMPLES["capabilities_limits"])
    ta("foreseeable_risks", "Foreseeable Risks & Mitigation", EXAMPLES["foreseeable_risks"])

    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step", key="ex2"):
            set_fields({
                "capabilities_limits": EXAMPLES["capabilities_limits"],
                "foreseeable_risks": EXAMPLES["foreseeable_risks"],
            })
    with cols[1]:
        if st.button("Clear step", key="cl2"):
            clear_fields(["capabilities_limits", "foreseeable_risks"])
    with cols[2]:
        st.caption("Tip: Pair each risk with a mitigation and specify monitoring cadence or fallback behavior.")

    st.divider()
    c1, c2 = st.columns(2)
    with c1:
        if st.button("Previous"):
            prev_step()
    with c2:
        if st.button("Next"):
            next_step()

# ------------------------------
# Step 3: Compliance Plans
# ------------------------------
elif st.session_state.step == 3:
    st.header("Step 4: Compliance & Post‑Market Plans")

    ta("standards_used", "Standards/Technical Specifications Followed", EXAMPLES["standards_used"])
    ta("postmarket_monitoring", "Post‑Market Monitoring Plan", EXAMPLES["postmarket_monitoring"])

    cols = st.columns([1,1,2])
    with cols[0]:
        if st.button("Use examples for this step", key="ex3"):
            set_fields({
                "standards_used": EXAMPLES["standards_used"],
                "postmarket_monitoring": EXAMPLES["postmarket_monitoring"],
            })
    with cols[1]:
        if st.button("Clear step", key="cl3"):
            clear_fields(["standards_used", "postmarket_monitoring"])
    with cols[2]:
        st.caption("Tip: Call out DPIA status, logging strategy, and how you act on feedback/incidents.")

    st.divider()
    c1, c2 = st.columns(2)
    with c1:
        if st.button("Previous"):
            prev_step()
    with c2:
        if st.button("Generate Compliance Documentation"):
            next_step()

# ------------------------------
# Step 4: Generate Documentation and Recommendations
# ------------------------------
elif st.session_state.step == 4:
    with st.spinner("Generating documentation..."):
        responses = st.session_state.responses

        recommendation_prompt = f"""
        Given this AI system info:
        - Intended purpose: {responses['system_purpose']}
        - Algorithms used: {responses['algorithm_choices']}
        - Known risks: {responses['foreseeable_risks']}

        Suggest 3 practical risk management controls this organization should implement, briefly explain why.
        """

        recommendation_response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You're an AI compliance expert providing actionable risk management advice."},
                {"role": "user", "content": recommendation_prompt},
            ],
            temperature=0.2,
        )
        recommendations = recommendation_response.choices[0].message.content

        enhanced_prompt = f"""
        Create a professional EU AI Act compliance report based on the provided information.
        - Avoid repeating inputs verbatim; instead, synthesize and enhance clarity.
        - Explain clearly how each provided detail meets specific compliance requirements.
        - Clearly identify if essential compliance details are missing, list as 'Action items'.

        General Info:
        Name: {responses['system_name']}
        Provider: {responses['provider_name']}
        Purpose: {responses['system_purpose']}

        Technical Development:
        Process: {responses['dev_process']}
        Algorithms: {responses['algorithm_choices']}

        Performance & Risk:
        Capabilities: {responses['capabilities_limits']}
        Risks: {responses['foreseeable_risks']}

        Compliance Plans:
        Standards: {responses['standards_used']}
        Post-Market: {responses['postmarket_monitoring']}
        """

        documentation_response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are a compliance analyst creating robust EU AI Act compliance documentation."},
                {"role": "user", "content": enhanced_prompt},
            ],
            temperature=0.2,
        )
        documentation = documentation_response.choices[0].message.content

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
