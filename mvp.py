import streamlit as st
from dotenv import load_dotenv
import openai
import os

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=api_key)

st.title("AI Compliance Assistant Wizard")

# Step navigation
if 'step' not in st.session_state:
    st.session_state.step = 0

# Collect responses in session state
if 'responses' not in st.session_state:
    st.session_state.responses = {}

def next_step():
    st.session_state.step += 1

def prev_step():
    st.session_state.step -= 1

# Step 0: General Info
if st.session_state.step == 0:
    st.header("Step 1: General AI System Information")
    st.session_state.responses['system_name'] = st.text_input("System Name")
    st.session_state.responses['provider_name'] = st.text_input("Provider Name")
    st.session_state.responses['system_purpose'] = st.text_area("Intended Purpose & Scope")
    if st.button("Next"):
        next_step()

# Step 1: Technical Development Details
elif st.session_state.step == 1:
    st.header("Step 2: Technical Development Details")
    st.session_state.responses['dev_process'] = st.text_area("Development Process & Methodology")
    st.session_state.responses['algorithm_choices'] = st.text_area("Algorithm Choices & Rationale")
    if st.button("Previous"):
        prev_step()
    if st.button("Next"):
        next_step()

# Step 2: Performance & Risks
elif st.session_state.step == 2:
    st.header("Step 3: Performance & Risk Management")
    st.session_state.responses['capabilities_limits'] = st.text_area("Capabilities & Limitations")
    st.session_state.responses['foreseeable_risks'] = st.text_area("Foreseeable Risks & Mitigation")
    if st.button("Previous"):
        prev_step()
    if st.button("Next"):
        next_step()

# Step 3: Compliance Plans
elif st.session_state.step == 3:
    st.header("Step 4: Compliance & Post-Market Plans")
    st.session_state.responses['standards_used'] = st.text_area("Standards/Technical Specifications Followed")
    st.session_state.responses['postmarket_monitoring'] = st.text_area("Post-Market Monitoring Plan")
    if st.button("Previous"):
        prev_step()
    if st.button("Generate Compliance Documentation"):
        next_step()

# Final Step: Generate Documentation and Recommendations
elif st.session_state.step == 4:
    with st.spinner("Generating documentation..."):
        responses = st.session_state.responses

        # Intelligent recommendations
        recommendation_prompt = f"""
        Given this AI system info:
        - Intended purpose: {responses['system_purpose']}
        - Algorithms used: {responses['algorithm_choices']}
        - Known risks: {responses['foreseeable_risks']}

        Suggest 3 practical risk management controls this organization should implement, briefly explain why.
        """

        recommendation_response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role":"system", "content":"You're an AI compliance expert providing actionable risk management advice."},
                      {"role":"user", "content":recommendation_prompt}],
            temperature=0.2
        )
        recommendations = recommendation_response.choices[0].message.content

        # Enhanced generative documentation
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
            messages=[{"role":"system", "content":"You are a compliance analyst creating robust EU AI Act compliance documentation."},
                      {"role":"user", "content":enhanced_prompt}],
            temperature=0.2
        )
        documentation = documentation_response.choices[0].message.content

        st.subheader("AI Compliance Documentation")
        st.markdown(documentation)

        st.subheader("Recommended Risk Controls")
        st.markdown(recommendations)

        st.download_button("Download Documentation", documentation, file_name="AI_Compliance_Report.md", mime="text/markdown")

    if st.button("Start Over"):
        st.session_state.step = 0
        st.session_state.responses = {}
