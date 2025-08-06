import streamlit as st
from dotenv import load_dotenv
import openai
import os

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

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

    submitted = st.form_submit_button("Generate Documentation")

if submitted:
    prompt = f"""
    Generate structured EU AI Act compliance technical documentation based on Annex IV.

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

    Format clearly with sections numbered according to Annex IV.
    """

    with st.spinner("Generating compliance document..."):
        response = openai.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are an AI compliance assistant creating documentation for the EU AI Act."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
        )
        documentation = response.choices[0].message.content
        st.subheader("Generated Compliance Documentation")
        st.markdown(documentation)

        # Optional download button
        st.download_button(
            "Download Documentation",
            documentation,
            file_name=f"{system_name.replace(' ', '_')}_AI_Act_Compliance.md",
            mime="text/markdown"
        )
