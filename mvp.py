import streamlit as st
from dotenv import load_dotenv
import openai
import os

# Load API key from .env (recommended for Streamlit Cloud too)
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=api_key)

st.title("EU AI Act Compliance Documentation Generator")

with st.form("compliance_form"):
    st.header("1. General AI System Information")
    system_name = st.text_input("System Name")
    provider_name = st.text_input("Provider Name")
    system_purpose = st.text_area("Intended Purpose & Scope")
    delivery_method = st.selectbox("Delivery Method", ["Cloud API", "Standalone Software", "Embedded", "Other"])
    hardware_req = st.text_area("Hardware Requirements")
    user_interface = st.text_area("User Interface Description")

    st.header("2. Technical Development Details")
    dev_process = st.text_area("Development Process & Methodology")
    algorithm_choices = st.text_area("Algorithm Choices & Rationale")
    architecture_desc = st.text_area("System Architecture")
    training_data = st.text_area("Training Data Details")
    human_oversight = st.text_area("Human Oversight Measures")
    testing_procedures = st.text_area("Validation & Testing Procedures")
    cybersecurity_measures = st.text_area("Cybersecurity Measures")

    st.header("3. Performance & Risk Management")
    capabilities_limits = st.text_area("Capabilities & Limitations")
    foreseeable_risks = st.text_area("Foreseeable Risks & Mitigation")
    lifecycle_changes = st.text_area("Significant Lifecycle Changes")

    st.header("4. Compliance & Post-Market Plans")
    standards_used = st.text_area("Standards/Technical Specifications Followed")
    conformity_declaration = st.text_area("EU Declaration of Conformity (if available)")
    postmarket_monitoring = st.text_area("Post-Market Monitoring Plan")

    submitted = st.form_submit_button("Generate Documentation")

if submitted:
    with st.spinner("Generating compliance documentation..."):

        prompt = f"""
You are an expert AI compliance assistant. Using ONLY the information below, generate a clear, structured, and professional EU AI Act technical documentation draft covering all Annex IV sections (1-9), using concise, factual language and labeling each section accordingly. If a section has no input, mark as "Not provided by user".

1. General Description:
- System Name: {system_name}
- Provider Name: {provider_name}
- Intended Purpose: {system_purpose}
- Delivery Method: {delivery_method}
- Hardware Requirements: {hardware_req}
- User Interface: {user_interface}

2. Technical Development Details:
- Development Process: {dev_process}
- Algorithm Choices: {algorithm_choices}
- System Architecture: {architecture_desc}
- Training Data: {training_data}
- Human Oversight: {human_oversight}
- Validation & Testing: {testing_procedures}
- Cybersecurity: {cybersecurity_measures}

3. Performance & Risk Management:
- Capabilities & Limitations: {capabilities_limits}
- Risks & Mitigation: {foreseeable_risks}
- Lifecycle Changes: {lifecycle_changes}

4. Compliance & Post-Market Plans:
- Standards/Specs: {standards_used}
- EU Declaration of Conformity: {conformity_declaration}
- Post-Market Monitoring Plan: {postmarket_monitoring}

Format your output as a compliance-ready document for regulators.
"""

        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert EU AI Act compliance documentation generator. Follow the prompt exactly and do not invent details."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
            )
            documentation = response.choices[0].message.content
            st.subheader("Generated Compliance Documentation")
            st.markdown(documentation)

            st.download_button(
                "Download Documentation",
                documentation,
                file_name=f"{system_name.replace(' ', '_')}_AI_Act_Compliance.md",
                mime="text/markdown"
            )
        except Exception as e:
            st.error(f"Error generating documentation: {e}")
