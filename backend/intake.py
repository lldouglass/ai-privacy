"""
Documentation helper chat endpoint for assisting users in filling out compliance questions.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import os
import logging
import re

router = APIRouter()
log = logging.getLogger("uvicorn")

DEMO_MODE = os.getenv("DEMO_MODE", "0") == "1"


class DocumentationHelperRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


DOCUMENTATION_HELPER_PROMPT = """You are a Colorado AI Act compliance documentation assistant.
Your job is to help users fill out compliance documentation questions by:
1. Understanding their AI system from natural language descriptions
2. Providing guidance on what each question is asking for
3. Suggesting draft answers based on the information they provide

The user is filling out documentation for: {outcome_title}

Current questions they need to answer:
{questions_text}

Their current answers so far:
{current_answers}

When helping:
- Be specific and provide concrete language they can use
- Reference Colorado AI Act (SB 24-205) requirements when relevant
- If you can draft an answer, include it in a "suggested_answer" field
- Always specify which question your suggestion is for using "for_question_id"

Respond in JSON format:
{{
  "message": "Your helpful response text",
  "suggested_answer": "Draft answer text if applicable",
  "for_question_id": "q1" (or null if not for a specific question),
  "suggested_questions": ["follow-up question 1", "follow-up question 2"]
}}
"""


OUTCOME_TITLES = {
    "outcome1": "Not Subject to the Colorado AI Act",
    "outcome2": "Exempt Deployer",
    "outcome3": "Not an AI System Under CAIA",
    "outcome4": "Not a Developer Under CAIA",
    "outcome5": "General AI System with Disclosure Duty",
    "outcome6": "Not a Regulated System",
    "outcome7": "Developer of High-Risk AI System",
    "outcome8": "Deployer of High-Risk AI System",
    "outcome9": "Both Developer and Deployer of High-Risk AI System",
}


# Detailed guidance for each question by outcome
QUESTION_GUIDANCE = {
    "outcome2": {  # Exempt Deployer
        "q1": {
            "title": "Consumer Inquiry Process",
            "guidance": "This question asks for the exact steps a consumer should take to inquire about an AI-assisted decision. Think about your customer service flow.",
            "tips": [
                "Include specific channels (email, phone, web form)",
                "Specify expected response times",
                "Note any information the consumer should have ready"
            ],
            "example": "To inquire about a decision made with AI assistance:\n1. Visit [company website]/ai-inquiry or email ai-questions@company.com\n2. Include your account number and the date of the decision\n3. Describe which decision you're inquiring about\n4. Our team will respond within 5 business days with an explanation of how the AI system contributed to your decision."
        },
        "q2": {
            "title": "Contact Information",
            "guidance": "Provide specific, dedicated contact methods for AI-related inquiries. This should be easy for consumers to find and use.",
            "tips": [
                "Consider a dedicated email address (e.g., ai-inquiry@company.com)",
                "Include a web form URL if available",
                "Provide phone hours if applicable"
            ],
            "example": "Email: ai-decisions@company.com\nWeb Form: www.company.com/ai-inquiry\nPhone: 1-800-XXX-XXXX (Mon-Fri 9am-5pm MT)\nMail: AI Inquiry Department, [Address]"
        },
        "q3": {
            "title": "Internal Review Procedure",
            "guidance": "Describe who handles consumer inquiries internally and what they review. This demonstrates you have a real process in place.",
            "tips": [
                "Name the team or role responsible",
                "List what information they'll review",
                "Describe the escalation path if needed"
            ],
            "example": "Consumer inquiries are reviewed by our Customer Experience team, supervised by the Director of Customer Operations. For each inquiry, they review:\n- The consumer's account history and the specific decision in question\n- The AI system's output and the factors it considered\n- Any human review that occurred before the final decision\n- Developer-provided documentation about the system's logic\n\nComplex cases are escalated to our Compliance Officer for additional review."
        },
        "q4": {
            "title": "Information Disclosure Template",
            "guidance": "Define what information you'll share with consumers who question a decision. This becomes your template response.",
            "tips": [
                "Explain the general factors the AI considered",
                "Clarify the role of human oversight",
                "Offer next steps if they disagree"
            ],
            "example": "We will share:\n- Confirmation that an AI system assisted in the decision\n- The general categories of information the AI analyzed (e.g., application data, account history)\n- Whether a human reviewed the AI's recommendation before the final decision\n- How to request a human review of the decision\n- Your rights under Colorado law, including how to appeal"
        }
    },
    "outcome5": {  # General AI with Disclosure
        "q1": {
            "title": "AI System Inventory",
            "guidance": "List each consumer-facing AI system with its name and what it does. This helps you track what needs disclosures.",
            "tips": [
                "Include chatbots, virtual assistants, recommendation engines",
                "Note which are customer-facing vs. internal",
                "Be specific about what each system does"
            ],
            "example": "1. 'Ask Alex' Customer Support Chatbot - Answers customer questions about products, order status, and returns via website chat widget\n\n2. Product Recommendation Engine - Suggests products to customers based on browsing history and purchase patterns\n\n3. Virtual Sizing Assistant - Uses customer measurements to recommend clothing sizes"
        },
        "q2": {
            "title": "Disclosure Statement Text",
            "guidance": "Write the exact text consumers will see informing them they're interacting with AI. Keep it clear and simple.",
            "tips": [
                "Use plain language (avoid jargon)",
                "Be upfront about AI involvement",
                "Keep it brief but clear"
            ],
            "example": "You are chatting with an AI assistant. A human representative is available if you prefer - just type 'human' at any time."
        },
        "q3": {
            "title": "Disclosure Placement",
            "guidance": "Describe exactly where and when the disclosure appears. It should be visible BEFORE the consumer engages with the AI.",
            "tips": [
                "Specify the location (banner, first message, popup)",
                "Note when it appears (before interaction starts)",
                "Confirm it can't be missed or dismissed without reading"
            ],
            "example": "The disclosure appears as the first message in the chat window, displayed automatically before the user can type their first message. The message is displayed in a highlighted box and remains visible at the top of the chat throughout the conversation."
        },
        "q4": {
            "title": "Obviousness Justification (if applicable)",
            "guidance": "Only complete this if you believe disclosure is unnecessary because AI involvement is obvious. Most systems need explicit disclosure.",
            "tips": [
                "Consider: would a reasonable person know it's AI?",
                "Robot avatars alone may not be sufficient",
                "When in doubt, add the disclosure"
            ],
            "example": "N/A - We have chosen to provide explicit disclosure for all consumer-facing AI systems to ensure transparency."
        }
    },
    "outcome7": {  # Developer of High-Risk AI
        "q1": {
            "title": "Intended Uses & Misuse Prevention",
            "guidance": "Describe what the AI is designed for AND what it should NOT be used for. This protects you and guides deployers.",
            "tips": [
                "Be specific about intended use cases",
                "List prohibited uses explicitly",
                "Consider edge cases and misuse scenarios"
            ],
            "example": "INTENDED USES:\nThis system is designed to assist human recruiters in prioritizing job applications by analyzing resume content against job requirements. It provides a ranked list of candidates with match scores to help recruiters focus their review time.\n\nPROHIBITED USES:\n- Making final hiring decisions without human review\n- Screening candidates for roles it wasn't trained for\n- Using the system to evaluate candidates on protected characteristics\n- Deploying without the bias monitoring dashboard enabled"
        },
        "q2": {
            "title": "System Purpose, Benefits & Outputs",
            "guidance": "Clearly define what the system does, why it's valuable, and what it produces. Be specific about outputs.",
            "tips": [
                "State the core purpose in one sentence",
                "List concrete benefits",
                "Describe exact outputs (scores, categories, recommendations)"
            ],
            "example": "PURPOSE: To help loan officers assess credit risk by analyzing applicant financial data.\n\nBENEFITS:\n- Reduces loan processing time by 40%\n- Provides consistent evaluation criteria across all applications\n- Flags applications that need additional human review\n\nOUTPUTS:\n- Risk score (1-100 scale)\n- Risk category (Low/Medium/High/Needs Review)\n- List of key factors influencing the score\n- Confidence level of the assessment"
        },
        "q3": {
            "title": "Training Data Summary",
            "guidance": "Describe what data trained the model without revealing proprietary details. Focus on types and sources.",
            "tips": [
                "Categories of data (not specific datasets)",
                "Time period covered",
                "Any data quality measures applied"
            ],
            "example": "The model was trained on:\n- Historical loan application data (2018-2023) including application details, credit reports, and loan outcomes\n- Publicly available financial indicator datasets\n- Synthetic data generated to balance underrepresented demographic groups\n\nAll training data was reviewed for quality, deduplicated, and validated against known outcomes. Personal identifiers were removed before training."
        },
        "q4": {
            "title": "Known Limitations",
            "guidance": "Be honest about when the system might fail or produce unreliable results. This builds trust and helps deployers.",
            "tips": [
                "Describe scenarios with degraded performance",
                "Note any demographic disparities found",
                "Mention edge cases or unusual inputs"
            ],
            "example": "KNOWN LIMITATIONS:\n- Performance may degrade for applicants with thin credit files (<2 years of history)\n- The system has not been validated for self-employment income verification\n- Accuracy decreases for loan amounts above $500,000 (underrepresented in training data)\n- Testing showed slightly higher false-positive rates for applicants under age 25\n\nRECOMMENDED MITIGATIONS:\n- Require human review for all applications flagged with limitations\n- Do not use for jumbo loan decisions"
        },
        "q5": {
            "title": "Fairness Testing Methods & Results",
            "guidance": "Describe how you tested for bias and what you found. Be specific about metrics and demographic groups.",
            "tips": [
                "Name the fairness metrics used",
                "List demographic groups tested",
                "Report actual results, not just methods"
            ],
            "example": "TESTING METHODS:\n- Demographic parity analysis across race, gender, and age groups\n- Equalized odds testing to measure false positive/negative rates by group\n- Disparate impact ratio calculations\n\nRESULTS:\n- Gender: Approval rate ratio of 0.96 (within acceptable range of 0.8-1.2)\n- Age: Identified 8% higher false positive rate for under-25 group\n- Race: Approval rates within 4% across all groups tested\n\nAll results are documented in our Model Card (v2.3, dated [date])."
        },
        "q6": {
            "title": "Discrimination Mitigation Steps",
            "guidance": "Explain what you did to address any bias issues found during testing. Include both technical and process solutions.",
            "tips": [
                "Link mitigations to specific findings",
                "Include technical adjustments",
                "Describe ongoing monitoring"
            ],
            "example": "MITIGATIONS IMPLEMENTED:\n\n1. For under-25 false positive disparity:\n   - Added synthetic training data for this demographic\n   - Adjusted classification threshold to equalize error rates\n   - Added mandatory human review for this group\n\n2. Ongoing protections:\n   - Weekly bias monitoring dashboard reviews\n   - Quarterly retraining with updated data\n   - Automatic alerts if disparities exceed thresholds"
        },
        "q7": {
            "title": "Data Governance Measures",
            "guidance": "Describe how you ensure training data is appropriate and doesn't introduce bias.",
            "tips": [
                "Data source vetting process",
                "How you handle missing or biased data",
                "Ongoing data quality monitoring"
            ],
            "example": "DATA GOVERNANCE:\n\n1. Source Assessment:\n   - All data sources reviewed by Data Ethics Committee\n   - Historical bias analysis before inclusion\n   - Documentation of known limitations\n\n2. Bias Mitigation:\n   - Removed proxy variables for protected characteristics\n   - Applied resampling to balance demographic representation\n   - Excluded data from time periods with known discriminatory practices\n\n3. Ongoing Monitoring:\n   - Monthly data drift detection\n   - Quarterly demographic distribution reviews"
        },
        "q8": {
            "title": "Deployer Guidance",
            "guidance": "Write clear instructions for organizations using your system. This is critical for compliance.",
            "tips": [
                "Appropriate use cases",
                "Required human oversight",
                "Monitoring requirements"
            ],
            "example": "DEPLOYER GUIDANCE:\n\nAPPROPRIATE USE:\n- Use only for [specific use case]\n- Ensure human review of all high-stakes decisions\n- Monitor system outputs weekly using provided dashboard\n\nREQUIRED OVERSIGHT:\n- Designate a human reviewer for all decisions\n- Do not allow fully automated consequential decisions\n- Review flagged cases within 24 hours\n\nMONITORING:\n- Review bias dashboard weekly\n- Report anomalies to [developer contact]\n- Conduct quarterly impact assessments"
        },
        "q9": {
            "title": "High-Risk AI System Categories",
            "guidance": "List the general categories of high-risk AI systems your company develops. This is for your public disclosure.",
            "tips": [
                "Use clear, plain language categories",
                "Group similar systems together",
                "Be comprehensive"
            ],
            "example": "Our company develops high-risk AI systems in the following categories:\n\n- Employment screening and candidate evaluation systems\n- Credit and lending decision support tools\n- Insurance underwriting and claims assessment systems\n- Tenant screening and rental application tools"
        },
        "q10": {
            "title": "Public Website Statement",
            "guidance": "Write a summary for your website about how you manage algorithmic discrimination risks. This will be publicly visible.",
            "tips": [
                "Write for a general audience",
                "Focus on your commitment and process",
                "Keep it concise but substantive"
            ],
            "example": "[Company Name] is committed to developing AI systems that are fair, transparent, and free from unlawful discrimination. We manage algorithmic discrimination risks through:\n\n- Rigorous testing across demographic groups before deployment\n- Ongoing monitoring of system outputs for disparate impact\n- Regular third-party audits of our high-risk systems\n- Clear documentation and guidance for organizations using our systems\n- A dedicated AI Ethics team overseeing all high-risk development\n\nFor questions about our AI practices, contact: ai-ethics@company.com"
        }
    },
    "outcome8": {  # Deployer of High-Risk AI
        "q1": {
            "title": "Accountable Executive",
            "guidance": "Name the specific executive responsible for your AI risk management program. This should be a senior leader.",
            "tips": [
                "Choose someone with actual authority",
                "Typically C-level or VP",
                "This person signs off on compliance"
            ],
            "example": "Jane Smith, Chief Operating Officer\n\nThe COO has been designated as the accountable executive for our AI Risk Management Program, with authority to make decisions regarding AI system deployment, modification, or discontinuation based on risk assessments."
        },
        "q2": {
            "title": "AI Principles",
            "guidance": "Describe your organization's guiding principles for responsible AI deployment. These should guide decision-making.",
            "tips": [
                "Focus on fairness, transparency, accountability",
                "Make them actionable, not just aspirational",
                "Align with your organization's values"
            ],
            "example": "Our organization deploys AI in accordance with these principles:\n\n1. HUMAN OVERSIGHT: AI assists but does not replace human decision-making for consequential decisions\n\n2. FAIRNESS: We actively test for and mitigate discriminatory outcomes\n\n3. TRANSPARENCY: We inform consumers when AI significantly influences decisions affecting them\n\n4. ACCOUNTABILITY: We maintain clear documentation and accept responsibility for AI-assisted decisions\n\n5. CONTINUOUS IMPROVEMENT: We regularly assess and improve our AI systems based on outcomes"
        },
        "q3": {
            "title": "Public Risk Statement",
            "guidance": "Write a public-facing statement about the high-risk AI systems you use and how you manage risks.",
            "tips": [
                "Be transparent about AI use",
                "Focus on consumer protections",
                "Include contact information"
            ],
            "example": "[Company Name] uses AI-assisted systems to help evaluate [loan applications/job candidates/insurance claims]. We are committed to ensuring these systems are fair and do not discriminate.\n\nOur approach includes:\n- Testing all AI systems for bias before deployment\n- Ensuring human review of all significant decisions\n- Providing clear explanations when AI influences decisions\n- Offering an appeals process for consumers who disagree with outcomes\n\nQuestions? Contact: ai-questions@company.com"
        },
        "q4": {
            "title": "Data Practices Disclosure",
            "guidance": "Describe what data your high-risk AI systems collect and use. This is for public disclosure.",
            "tips": [
                "Categories of data, not specific fields",
                "Sources of data",
                "How data influences decisions"
            ],
            "example": "Our AI systems analyze the following types of data to assist in [decision type]:\n\n- Application information provided by consumers (e.g., income, employment history)\n- Credit bureau data (credit scores, payment history)\n- Public records (property records, court records where permitted)\n\nThis data is used to generate risk assessments that inform, but do not solely determine, our decisions. All automated assessments are reviewed by qualified human staff before final decisions."
        },
        "q5": {
            "title": "System Purpose & Benefits",
            "guidance": "State what the AI system does, how you use it, and the benefits you expect. Be specific.",
            "tips": [
                "Clear purpose statement",
                "Specific use cases",
                "Benefits to consumers and organization"
            ],
            "example": "PURPOSE: We use an AI-powered risk assessment system to evaluate [loan/insurance/rental] applications.\n\nUSE CASES:\n- Initial screening of applications to identify those needing additional review\n- Generating risk scores to inform pricing decisions\n- Flagging potentially fraudulent applications\n\nBENEFITS:\n- Faster processing times for applicants (average 2 days vs. 5 days)\n- More consistent evaluation criteria\n- Reduced human error in data review"
        },
        "q6": {
            "title": "Discrimination Risks & Mitigations",
            "guidance": "Identify specific discrimination risks for YOUR customers and what you're doing about each one.",
            "tips": [
                "Be specific to your use case",
                "Match each risk with a mitigation",
                "Include monitoring plans"
            ],
            "example": "IDENTIFIED RISKS AND MITIGATIONS:\n\n1. Risk: Historical data may reflect past discriminatory practices\n   Mitigation: We work with our vendor to ensure training data exclusions and review approval rates by demographic quarterly\n\n2. Risk: Proxy discrimination through zip codes or other geographic factors\n   Mitigation: Geographic factors are not included in the model; we monitor for geographic disparities\n\n3. Risk: Disparate impact on applicants with non-traditional credit histories\n   Mitigation: Alternative data sources available; human review required for thin-file applicants"
        },
        "q7": {
            "title": "Data Inputs & Outputs",
            "guidance": "List what data goes into the system and what comes out. Be comprehensive.",
            "tips": [
                "Group inputs by category",
                "Describe output formats",
                "Note what humans see vs. what's automated"
            ],
            "example": "INPUTS:\n- Applicant-provided: Name, address, income, employment, assets\n- Credit bureau: Credit score, payment history, outstanding debt\n- Public records: Property ownership, bankruptcy filings\n\nOUTPUTS:\n- Risk score (1-1000 scale)\n- Risk tier (A/B/C/D)\n- Key factors affecting score (top 5)\n- Recommended decision (Approve/Review/Decline)\n- Confidence level (High/Medium/Low)"
        },
        "q8": {
            "title": "Performance Metrics & Limitations",
            "guidance": "Describe how you measure the system's performance and its known weaknesses.",
            "tips": [
                "Quantitative metrics where possible",
                "Known edge cases or failure modes",
                "How you monitor performance"
            ],
            "example": "PERFORMANCE METRICS:\n- Accuracy: 87% alignment with human reviewer decisions\n- False positive rate: 12% (applicants declined who would have been approved manually)\n- False negative rate: 3% (applicants approved who defaulted)\n\nKNOWN LIMITATIONS:\n- Lower accuracy for self-employed applicants\n- Not validated for commercial applications\n- Performance may degrade for applications from new geographic markets\n\nWe monitor these metrics monthly and investigate deviations >5%."
        },
        "q9": {
            "title": "Post-Deployment Monitoring Plan",
            "guidance": "Describe your ongoing monitoring and safeguards after the system is deployed.",
            "tips": [
                "Frequency of reviews",
                "What triggers investigation",
                "Who is responsible"
            ],
            "example": "MONITORING PLAN:\n\n1. Weekly: Review of approval/denial rates by demographic group\n2. Monthly: Full bias audit comparing outcomes across protected classes\n3. Quarterly: Comparison of AI recommendations to actual loan performance\n\nSAFEGUARDS:\n- Automatic alerts if demographic disparities exceed 10%\n- Human review required for all denials\n- Monthly calibration meetings with decision reviewers\n- Annual third-party audit\n\nResponsibility: Director of Risk Management"
        },
        "q10": {
            "title": "Pre-Decision Consumer Notice",
            "guidance": "Write the exact text shown to consumers BEFORE an AI-assisted consequential decision is made.",
            "tips": [
                "Clear and simple language",
                "Explain AI involvement",
                "Note human oversight"
            ],
            "example": "IMPORTANT NOTICE ABOUT AI IN OUR DECISION PROCESS\n\nWe use an artificial intelligence (AI) system to help evaluate your [application/claim/request]. The AI analyzes information you provide along with other relevant data to generate a recommendation.\n\nA qualified human reviewer will make the final decision on your [application]. You have the right to request information about how AI was used in your case and to appeal any adverse decision.\n\nQuestions? Contact us at [phone/email]."
        },
        "q11": {
            "title": "Adverse Decision Explanation Process",
            "guidance": "Describe how you'll explain the reasons when AI contributes to a negative decision.",
            "tips": [
                "How reasons are generated",
                "What the consumer receives",
                "Timeline for providing explanation"
            ],
            "example": "When an application is denied:\n\n1. The AI system generates the top 4 factors that most influenced the negative recommendation\n2. A human reviewer confirms these factors and adds any additional relevant reasons\n3. Within 5 business days, the consumer receives written notice including:\n   - The decision and effective date\n   - The principal reasons for the decision (top 4 factors)\n   - Confirmation that AI was used in the evaluation\n   - How to request more information or appeal\n\nReasons are stated in plain language, not technical terms."
        },
        "q12": {
            "title": "Appeal Rights & Instructions",
            "guidance": "Write the exact text explaining how consumers can appeal an adverse decision.",
            "tips": [
                "Step-by-step instructions",
                "Clear deadlines",
                "What happens during appeal"
            ],
            "example": "YOUR RIGHT TO APPEAL\n\nIf you disagree with this decision, you have the right to appeal and request a human review.\n\nHOW TO APPEAL:\n1. Submit your appeal within 30 days of this notice\n2. Email appeal@company.com or call 1-800-XXX-XXXX\n3. Include your application number and explain why you believe the decision should be reconsidered\n4. Provide any additional information you want us to consider\n\nWHAT HAPPENS NEXT:\n- Your appeal will be reviewed by a human reviewer not involved in the original decision\n- We will respond within 15 business days\n- You may request additional information about how AI was used in your case\n- If your appeal is successful, we will [process your application/reinstate coverage/etc.]"
        }
    },
    "outcome9": {  # Both Developer and Deployer
        "q1": {
            "title": "Internal Knowledge Transfer Process",
            "guidance": "Describe how your development team shares technical details and risks with your deployment team.",
            "tips": [
                "Specific handoff procedures",
                "Documentation requirements",
                "Ongoing communication channels"
            ],
            "example": "KNOWLEDGE TRANSFER PROCESS:\n\n1. Pre-Deployment Review:\n   - Development team provides complete Model Card including all limitations and test results\n   - Deployment team reviews and signs off before any production use\n   - Joint meeting to discuss edge cases and monitoring requirements\n\n2. Documentation:\n   - All technical limitations documented in internal wiki\n   - Risk assessments shared via [system name]\n   - Deployment team has read access to all development documentation\n\n3. Ongoing Communication:\n   - Weekly sync between development and deployment leads\n   - Shared Slack channel for immediate issues\n   - Deployment team included in all model update reviews"
        },
        "q2": {
            "title": "Internal Conflict Resolution",
            "guidance": "Explain how you resolve tensions between development goals (accuracy, features) and deployment responsibilities (fairness, consumer rights).",
            "tips": [
                "Clear escalation path",
                "Who has final authority",
                "How fairness concerns are prioritized"
            ],
            "example": "CONFLICT RESOLUTION PROCESS:\n\n1. Escalation Path:\n   - Initial conflicts discussed between development and deployment leads\n   - Unresolved issues escalate to AI Ethics Committee (monthly meetings)\n   - Final authority rests with Chief Ethics Officer\n\n2. Decision Framework:\n   - Consumer safety and fairness take priority over model performance\n   - Any identified discrimination risk blocks deployment until resolved\n   - Trade-offs documented in decision log with rationale\n\n3. Examples:\n   - If development wants to ship a more accurate model that shows higher bias, deployment can block until bias is addressed\n   - Performance targets are adjusted if they would require accepting fairness trade-offs"
        }
    }
}


def _get_question_by_id(questions: list, question_id: str) -> dict:
    """Find a question by its ID."""
    for q in questions:
        if q.get("id") == question_id:
            return q
    return None


def _demo_documentation_helper(message: str, context: dict) -> dict:
    """Demo mode response generator for documentation help."""
    msg_lower = message.lower()
    questions = context.get("questions", [])
    outcome = context.get("outcome", "")
    current_answers = context.get("currentAnswers", {})
    active_question_id = context.get("activeQuestionId")

    # Check if asking about a specific question number
    question_match = re.search(r'question (\d+)', msg_lower)
    if question_match:
        q_num = int(question_match.group(1)) - 1
        if 0 <= q_num < len(questions):
            q = questions[q_num]
            q_id = q.get("id")

            # Get detailed guidance if available
            guidance_data = QUESTION_GUIDANCE.get(outcome, {}).get(q_id, {})

            if guidance_data:
                title = guidance_data.get("title", "Question Guidance")
                guidance = guidance_data.get("guidance", "")
                tips = guidance_data.get("tips", [])
                example = guidance_data.get("example", "")

                tips_text = "\n".join([f"• {tip}" for tip in tips]) if tips else ""

                response_text = f"**{title}**\n\n"
                response_text += f"📋 **Question:** \"{q.get('text', '')}\"\n\n"
                response_text += f"**What to include:**\n{guidance}\n\n"
                if tips_text:
                    response_text += f"**Tips:**\n{tips_text}\n\n"
                response_text += "Click 'Use this answer' below to start with a template, then edit it for your specific situation."

                return {
                    "message": response_text,
                    "suggested_answer": example,
                    "for_question_id": q_id,
                    "suggested_questions": [
                        f"Help me with Question {q_num + 2}" if q_num + 1 < len(questions) else "What else do I need to complete?",
                        "Can you customize this for my situation?",
                        "What's the most important part of this answer?"
                    ]
                }
            else:
                # Fallback generic guidance
                return {
                    "message": f"**Question {q_num + 1}:** \"{q.get('text', '')}\"\n\n**Guidance:** This question asks about your organization's specific practices. Consider:\n\n• Be specific and concrete - use actual names, titles, or processes\n• Reference any existing policies or procedures\n• If you don't have a formal process, describe what you plan to implement\n\nDescribe your situation and I'll help draft a specific answer.",
                    "for_question_id": q_id,
                    "suggested_questions": [
                        "What's our current approach?",
                        "Give me an example answer",
                        f"Help me with Question {q_num + 2}" if q_num + 1 < len(questions) else "What else do I need?"
                    ]
                }

    # Check if describing their AI system
    ai_keywords = ["we use", "our system", "our ai", "we have", "we built", "our platform", "our tool", "we deploy", "i have", "i use"]
    if any(kw in msg_lower for kw in ai_keywords):
        # Parse their description and try to suggest answers
        suggested_answer = None
        for_question_id = None

        if questions and len(questions) > 0:
            q1 = questions[0]
            q1_id = q1.get("id")
            guidance = QUESTION_GUIDANCE.get(outcome, {}).get(q1_id, {})

            # Build a contextual answer based on their description
            if outcome == "outcome7":  # Developer
                suggested_answer = f"INTENDED USES:\n{message}\n\nThe system is designed to assist human decision-makers by providing data-driven insights. It should be used to inform, not replace, human judgment.\n\nPROHIBITED USES:\n- Making fully automated consequential decisions without human review\n- Using the system for purposes outside its designed scope\n- Deploying without appropriate bias monitoring"
                for_question_id = q1_id
            elif outcome == "outcome8":  # Deployer
                if "q1" in [q.get("id") for q in questions]:  # Executive question
                    suggested_answer = None  # They need to provide a name
                    response = {
                        "message": f"Thanks for describing your AI system! For your documentation, I'll need some specific information.\n\n**First, let's start with Question 1:**\nWho is the executive accountable for your AI risk management? This should be a senior leader (C-level or VP) with authority over AI decisions.\n\nPlease provide their name and title.",
                        "suggested_questions": [
                            "Our [Title] oversees AI decisions",
                            "Help me with Question 2",
                            "What responsibilities does this person have?"
                        ]
                    }
                    return response
            elif outcome == "outcome5":  # Disclosure
                suggested_answer = f"1. {message}\n\nPrimary function: [Describe what this AI system does for consumers]"
                for_question_id = q1_id

        response = {
            "message": f"Thanks for describing your AI system! Based on what you've shared, I can help draft your compliance documentation.\n\n**Your system:** {message[:150]}{'...' if len(message) > 150 else ''}\n\nI've prepared a draft answer for Question 1. Click 'Use this answer' to add it to the form, then customize it for your specific situation.\n\nAfter that, click Q2 or say 'help with Question 2' to continue.",
            "suggested_questions": [
                "Help me with Question 2",
                "What other information do I need?",
                "Review what I have so far"
            ]
        }

        if suggested_answer:
            response["suggested_answer"] = suggested_answer
            response["for_question_id"] = for_question_id

        return response

    # Check for general help questions
    if "what information" in msg_lower or "what do i need" in msg_lower or "gather" in msg_lower:
        info_needed = []
        if outcome == "outcome7":
            info_needed = [
                "• **Intended uses** - What the AI does and what it shouldn't be used for",
                "• **Training data** - Types and sources of data used to train the model",
                "• **Known limitations** - When the AI might not perform well",
                "• **Fairness testing** - How you tested for bias and what you found",
                "• **Mitigations** - What you did to address any bias issues",
                "• **Deployer guidance** - Instructions for safe deployment"
            ]
        elif outcome == "outcome8":
            info_needed = [
                "• **Accountable executive** - Name and title of person responsible",
                "• **AI principles** - Your guidelines for responsible AI use",
                "• **Risk assessment** - Discrimination risks and your mitigations",
                "• **Consumer notices** - Text for pre-decision and adverse decision notices",
                "• **Appeal process** - How consumers can contest decisions"
            ]
        elif outcome == "outcome5":
            info_needed = [
                "• **AI system list** - Names and functions of consumer-facing AI",
                "• **Disclosure text** - Exact wording consumers will see",
                "• **Placement details** - Where and when disclosure appears"
            ]
        elif outcome == "outcome2":
            info_needed = [
                "• **Inquiry process** - How consumers can ask about AI decisions",
                "• **Contact info** - Specific email/phone for AI questions",
                "• **Review procedure** - How you handle consumer inquiries",
                "• **Response template** - What you'll share with consumers"
            ]
        else:
            info_needed = ["• Information about your AI system and how it's used"]

        return {
            "message": f"For **{OUTCOME_TITLES.get(outcome, 'your classification')}**, you'll need:\n\n" + "\n".join(info_needed) + "\n\n**Tip:** Start by clicking Q1 or describing your AI system, and I'll help you draft each answer.",
            "suggested_questions": [
                "Help me with Question 1",
                "Describe my AI system",
                "What's most important to complete first?"
            ]
        }

    # Default helpful response
    return {
        "message": "I'm here to help you complete your compliance documentation. Here's how I can help:\n\n• **Click Q1, Q2, etc.** - Get specific guidance and example answers for each question\n• **Describe your AI system** - Tell me about it and I'll draft answers for you\n• **Ask questions** - I can explain what each question is asking for\n\nWhat would you like to start with?",
        "suggested_questions": [
            "Help me with Question 1",
            "Describe my AI system",
            "What information do I need to gather?"
        ]
    }


@router.post("/api/chat/documentation-helper")
async def documentation_helper(data: DocumentationHelperRequest, request: Request):
    """
    Chat endpoint to help users fill out compliance documentation questions.
    """
    context = data.context or {}

    # Demo mode - return intelligent mock responses
    if DEMO_MODE:
        return _demo_documentation_helper(data.message, context)

    # Try to get OpenAI client
    try:
        from main import get_openai_client, OPENAI_MODEL
        client = get_openai_client()
    except ImportError:
        return _demo_documentation_helper(data.message, context)

    if client is None:
        return _demo_documentation_helper(data.message, context)

    # Build context for the prompt
    outcome = context.get("outcome", "unknown")
    outcome_title = OUTCOME_TITLES.get(outcome, "Unknown Classification")
    questions = context.get("questions", [])
    current_answers = context.get("currentAnswers", {})

    questions_text = "\n".join([
        f"- {q.get('id', f'q{i+1}')}: {q.get('text', '')}"
        for i, q in enumerate(questions)
    ]) if questions else "No specific questions provided."

    answers_text = "\n".join([
        f"- {qid}: {answer[:200]}..." if len(answer) > 200 else f"- {qid}: {answer}"
        for qid, answer in current_answers.items()
    ]) if current_answers else "No answers provided yet."

    system_prompt = DOCUMENTATION_HELPER_PROMPT.format(
        outcome_title=outcome_title,
        questions_text=questions_text,
        current_answers=answers_text
    )

    try:
        rsp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.message}
            ],
            response_format={"type": "json_object"}
        )

        result = json.loads(rsp.choices[0].message.content)
        return result

    except Exception as e:
        log.error(f"Documentation helper failed: {e}")
        return _demo_documentation_helper(data.message, context)
