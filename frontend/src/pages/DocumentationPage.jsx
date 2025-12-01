import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { marked } from "marked";
import DOMPurify from "dompurify";
import html2pdf from "html2pdf.js";
import ComplianceChatbot from "../components/ComplianceChatbot";
import "../styles.css";

// Utility function to format document keys as readable labels
function formatDocumentLabel(key) {
  // Convert snake_case to Title Case
  // e.g., "general_statement" -> "General Statement"
  return key.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Demo answers for Clarynt - a Colorado AI Act compliance documentation tool
const demoAnswers = {
  outcome2: {
    q1: `Consumers can inquire about AI-assisted decisions through the following process:

1. Visit app.clarynt.net and navigate to the "Support" section
2. Click "AI Decision Inquiry" to access our inquiry form
3. Provide the decision reference number (found in your notification email)
4. Describe your question or concern
5. Submit the form - you'll receive a confirmation email within 24 hours
6. Our compliance team will review your inquiry and respond within 5 business days`,

    q2: `Email: support@clarynt.net
Web Form: https://app.clarynt.net/support/ai-inquiry
Phone: (720) 555-0123 (Monday-Friday, 9 AM - 5 PM MT)

For urgent matters, email compliance@clarynt.net with "URGENT" in the subject line.`,

    q3: `Upon receiving a consumer inquiry:

1. Our Support Team (Level 1) logs the inquiry in our ticketing system and acknowledges receipt within 24 hours
2. The inquiry is routed to our Compliance Analyst who reviews the specific AI system involved and the decision in question
3. The Compliance Analyst retrieves relevant documentation including:
   - The AI system's output for that specific decision
   - Developer-provided documentation about system functionality
   - Any human review notes if applicable
4. Our Head of Compliance (Jane Smith) reviews complex cases
5. A response is drafted and approved before sending to the consumer
6. All inquiries and responses are logged for audit purposes`,

    q4: `We are prepared to share the following with consumers:

1. Confirmation that an AI system was used in the decision
2. A plain-language explanation of what the AI system does (from developer documentation)
3. The key factors that influenced the AI's output in their specific case
4. Information about human oversight involved in the decision
5. The consumer's right to request human review of the decision
6. How to appeal if they believe the decision was incorrect

We will NOT share proprietary algorithm details or raw model outputs, but will provide meaningful transparency about how the decision was reached.`
  },

  outcome5: {
    q1: `System Name: Clarynt Documentation Assistant
Primary Function: AI-powered chatbot that helps users understand Colorado AI Act compliance requirements and assists in drafting compliance documentation. The system provides guidance on regulatory questions, suggests answers to compliance questionnaires, and helps generate required documentation such as impact assessments and risk management programs.`,

    q2: `"You are interacting with an AI assistant powered by large language models. This assistant helps you understand Colorado AI Act requirements and draft compliance documentation. While the AI provides guidance based on the law and best practices, it does not provide legal advice. Please review all generated content with qualified legal counsel before finalizing your compliance documentation."`,

    q3: `The disclosure appears in two locations:

1. Initial Disclosure: When a user first opens the Documentation Assistant chatbot panel, the welcome message begins with a clear statement: "Hi! I'm your AI-powered documentation assistant..." This appears as the first message before any user interaction.

2. Persistent Indicator: A small "AI Assistant" badge with a robot icon remains visible in the chatbot header throughout the entire interaction, ensuring users are continuously aware they are communicating with an AI system.`,

    q4: `N/A - We have chosen to implement explicit disclosures as described above rather than relying on the "obvious AI interaction" exception. Given that our AI assistant provides compliance guidance that could influence business decisions, we believe clear disclosure is appropriate regardless of whether a reasonable person might assume they're interacting with AI.`
  },

  outcome7: {
    q1: `INTENDED USES:
- Assist compliance professionals in understanding Colorado AI Act (SB 24-205) requirements
- Guide users through classification questionnaires to determine their regulatory obligations
- Help draft compliance documentation including impact assessments, risk management programs, and consumer disclosures
- Provide educational information about AI governance and algorithmic discrimination prevention
- Generate customizable templates for required compliance artifacts

PROHIBITED/HARMFUL USES:
- Making final legal determinations without human attorney review
- Automated decision-making about individuals' rights, employment, credit, housing, or insurance
- Replacing qualified legal counsel for compliance decisions
- Processing or storing sensitive personal data about consumers
- Any use that would itself constitute a "consequential decision" under CAIA`,

    q2: `PURPOSE: Clarynt's AI system helps businesses understand and comply with Colorado AI Act requirements by providing guided compliance workflows and documentation generation.

INTENDED BENEFITS:
- Reduce time and cost of Colorado AI Act compliance
- Democratize access to compliance guidance for small and medium businesses
- Improve quality and consistency of compliance documentation
- Help businesses avoid regulatory penalties and reputational harm

INTENDED OUTPUTS:
- Classification determination (which CAIA category applies to the user's AI systems)
- Risk assessment scores and explanations
- Draft compliance documents in markdown format (impact assessments, risk management policies, consumer notices)
- Compliance checklists tailored to the user's specific obligations
- Educational explanations of regulatory requirements`,

    q3: `The Clarynt documentation assistant is powered by large language models (LLMs) from Anthropic (Claude). These foundation models were trained on:

- Publicly available internet text, books, and articles
- Code repositories and technical documentation
- Academic papers and legal texts

For our specific application, we provide:
- Colorado AI Act (SB 24-205) full text and legislative history
- Attorney General guidance and FAQs (when published)
- Industry best practices for AI governance
- Template compliance documentation

We do NOT train on or retain user-provided data. All user inputs are processed in real-time and not used to improve the underlying models.`,

    q4: `KNOWN LIMITATIONS:

1. Legal Interpretation Boundaries: The system provides general guidance but cannot account for all business-specific circumstances. Complex edge cases require human legal review.

2. Temporal Limitations: The system's knowledge of regulations may not reflect the most recent amendments, guidance, or enforcement actions. Users should verify current requirements.

3. Jurisdictional Scope: Currently focused on Colorado AI Act only; may not address overlapping federal or other state requirements.

4. Language Limitations: Optimized for English-language interactions only.

SCENARIOS WITH DEGRADED PERFORMANCE:
- Highly technical questions about specific ML architectures
- Questions requiring real-time access to external databases or APIs
- Multi-jurisdictional compliance scenarios
- Novel regulatory interpretations not yet addressed in guidance

ALGORITHMIC DISCRIMINATION RISKS:
- Risk is LOW because system does not make decisions about individuals
- Output variations could theoretically occur based on how users describe their businesses, but this does not constitute discrimination against protected classes
- We monitor for any systematic biases in guidance provided`,

    q5: `EVALUATION METHODS:

1. Output Quality Testing: We tested the system's responses against a benchmark of 200+ compliance scenarios reviewed by qualified attorneys. Accuracy rate: 94% for straightforward questions, 87% for complex scenarios.

2. Consistency Analysis: We submitted identical questions with varied phrasing to check for inconsistent outputs. The system showed <5% variance in substantive guidance.

3. Demographic Fairness Testing: We tested whether guidance varied based on how users described their business characteristics. No statistically significant differences were found.

4. Red Team Testing: Legal experts attempted to elicit incorrect or harmful guidance. Identified edge cases were addressed through prompt engineering and guardrails.

RESULTS:
- No evidence of discriminatory outputs based on protected characteristics
- Consistent guidance across business sizes, industries, and user demographics
- Appropriate uncertainty acknowledgment for ambiguous scenarios`,

    q6: `MITIGATION STEPS:

1. Human-in-the-Loop: All generated documentation includes clear disclaimers recommending legal review before implementation. The system explicitly states it does not provide legal advice.

2. Guardrails Implementation: The system refuses to provide definitive legal conclusions and redirects users to qualified counsel for final determinations.

3. Confidence Scoring: When the system is uncertain, it explicitly communicates this uncertainty rather than providing potentially incorrect guidance.

4. Regular Audits: We conduct quarterly reviews of system outputs to identify any emerging patterns of concern.

5. User Feedback Loop: Users can flag incorrect or concerning responses, which are reviewed by our compliance team within 48 hours.`,

    q7: `DATA GOVERNANCE MEASURES:

1. Foundation Model Selection: We selected Anthropic's Claude models based on their published training data practices and commitment to responsible AI development.

2. No Custom Training: We do not fine-tune models on user data, eliminating risks of encoding user-specific biases into the model.

3. Prompt Engineering Review: All system prompts are reviewed by legal and ethics advisors to ensure they don't introduce bias.

4. Source Documentation: Regulatory content provided to the system is sourced directly from official government publications and verified legal sources.

5. Data Minimization: We collect only the minimum user information necessary for the service and do not retain conversation logs beyond the session.

BIAS MITIGATION:
- Regular testing across diverse business scenarios
- Monitoring for systematic differences in output quality
- Clear documentation of system limitations`,

    q8: `DEPLOYER GUIDANCE:

HOW TO USE:
- Use Clarynt as a starting point for compliance documentation, not a final authority
- Have all generated documents reviewed by qualified legal counsel
- Verify regulatory requirements against official sources before relying on system output
- Use the classification tool to understand your obligations, then confirm with an attorney

HOW NOT TO USE:
- Do not use Clarynt outputs as final legal documents without review
- Do not rely solely on Clarynt for compliance decisions
- Do not use for any purpose involving automated decisions about individuals
- Do not input sensitive personal data about consumers into the system

HUMAN MONITORING REQUIREMENTS:
- Designate a compliance officer to review all generated documentation
- Implement a review checklist before using any Clarynt-generated content
- Document all human review steps for audit purposes
- Report any suspected errors or concerning outputs to Clarynt support`,

    q9: `Clarynt develops AI systems in the following high-risk category:

- Regulatory Compliance Assistance Tools: AI systems that help businesses understand and comply with legal and regulatory requirements, specifically focused on AI governance regulations such as the Colorado AI Act (SB 24-205).

Note: While our system assists with compliance documentation, it does not make consequential decisions about individuals and is designed as a guidance tool requiring human oversight.`,

    q10: `CLARYNT'S APPROACH TO ALGORITHMIC DISCRIMINATION PREVENTION

At Clarynt, we are committed to developing AI systems that are fair, transparent, and beneficial. Our compliance documentation assistant is designed with the following principles:

**Our Commitment:**
We build AI tools that help businesses comply with regulations designed to prevent algorithmic discrimination. We hold ourselves to the same standards we help our customers achieve.

**Risk Management:**
- Our AI system does not make decisions about individuals
- All outputs require human review before implementation
- We regularly test for bias and consistency in our guidance

**Transparency:**
- We clearly disclose when users are interacting with AI
- We document our system's capabilities and limitations
- We provide clear guidance on appropriate use

**Continuous Improvement:**
- We monitor system outputs for quality and fairness
- We incorporate user feedback to improve accuracy
- We stay current with regulatory developments

For questions about our AI practices, contact compliance@clarynt.net.`
  },

  outcome8: {
    q1: `Logan Dayton, Chief Executive Officer and Head of Compliance

As a small company, our CEO directly oversees our AI risk management program and is accountable for ensuring compliance with all applicable AI regulations including the Colorado AI Act.`,

    q2: `Clarynt's Core Principles for Responsible AI Deployment:

1. **Human Oversight**: All AI outputs are advisory and require human review before action
2. **Transparency**: We clearly disclose AI involvement and system capabilities/limitations
3. **Fairness**: We actively test for and mitigate algorithmic bias
4. **Privacy**: We minimize data collection and do not retain user conversations
5. **Accountability**: We maintain clear responsibility chains for AI-related decisions
6. **Continuous Improvement**: We regularly assess and improve our AI systems
7. **User Empowerment**: We provide users tools to understand and question AI outputs`,

    q3: `PUBLIC DISCLOSURE - HIGH-RISK AI SYSTEMS

Clarynt deploys AI-powered compliance assistance tools that help businesses understand and meet their obligations under AI regulations such as the Colorado AI Act.

**Systems Deployed:**
- Documentation Assistant: AI chatbot providing compliance guidance and document drafting assistance

**Risk Management Approach:**
- All AI outputs are clearly labeled and require human review
- We do not make automated decisions about individuals
- Regular testing ensures consistent, unbiased guidance
- User feedback is actively monitored and incorporated

**Your Rights:**
Users can request information about how our AI systems work and report concerns to compliance@clarynt.net.`,

    q4: `DATA TRANSPARENCY STATEMENT

**Data Collected:**
- Survey responses about your business and AI systems (to determine compliance obligations)
- Questions submitted to our Documentation Assistant
- Generated compliance documents (during your session only)

**Data Sources:**
- User-provided information only
- No third-party data sources about users
- Regulatory text from official government sources

**Data Extent:**
- Session-based processing only
- No long-term storage of conversation content
- Account information (email, company name) retained for service delivery
- No sensitive personal data about end consumers is collected or processed`,

    q5: `PURPOSE: Our AI-powered Documentation Assistant helps businesses efficiently create Colorado AI Act compliance documentation.

USE CASES:
- Determining regulatory classification (developer, deployer, exempt, etc.)
- Generating impact assessment templates
- Drafting risk management program documentation
- Creating consumer disclosure language
- Answering regulatory interpretation questions

EXPECTED BENEFITS:
- 80% reduction in time spent on initial compliance documentation
- Improved consistency and completeness of compliance artifacts
- Accessible compliance guidance for businesses without dedicated legal teams
- Reduced risk of non-compliance penalties`,

    q6: `IDENTIFIED RISKS AND MITIGATIONS:

**Risk 1: Incorrect Regulatory Guidance**
- Mitigation: Clear disclaimers that output requires legal review; confidence indicators; regular accuracy testing

**Risk 2: Over-reliance on AI Output**
- Mitigation: Mandatory human review messaging; no "final document" labeling; integration with legal review workflows

**Risk 3: Inconsistent Guidance Across Users**
- Mitigation: Standardized prompts; regular consistency testing; version control for system updates

**Risk 4: Data Privacy Concerns**
- Mitigation: Session-only data processing; no conversation retention; clear privacy policy

Note: Our system does not make decisions about individuals, so traditional algorithmic discrimination risks (based on protected characteristics) are not applicable. We focus instead on ensuring consistent, accurate guidance for all business users.`,

    q7: `INPUT DATA CATEGORIES:
- Business information (industry, size, location)
- AI system descriptions (what AI tools the user deploys/develops)
- Survey responses (yes/no and multiple choice about AI usage)
- Free-text questions about compliance requirements

OUTPUT DATA CATEGORIES:
- Classification determination (regulatory category)
- Risk scores (numerical assessment with explanation)
- Generated documentation (markdown text)
- Compliance checklists (task lists)
- Educational explanations (text responses to questions)`,

    q8: `PERFORMANCE METRICS:
- Response accuracy: 94% agreement with attorney review (tested quarterly)
- Response consistency: <5% variance for semantically equivalent questions
- User satisfaction: 4.2/5 average rating
- Completion rate: 78% of users complete full documentation workflow

KNOWN LIMITATIONS:
- Cannot provide jurisdiction-specific advice outside Colorado
- May not reflect regulations amended after last system update
- Complex multi-entity corporate structures may require manual analysis
- Not a substitute for qualified legal counsel
- Limited to English language`,

    q9: `POST-DEPLOYMENT MONITORING PLAN:

**Ongoing Monitoring:**
- Daily: Automated error logging and anomaly detection
- Weekly: Sample review of system outputs by compliance team
- Monthly: User feedback analysis and trending
- Quarterly: Comprehensive accuracy audit against legal expert review

**User Safeguards:**
- Clear labeling of all AI-generated content
- Easy access to human support for questions
- Feedback mechanism for reporting issues
- Regular communication of system updates and limitations

**Incident Response:**
- 24-hour response time for reported accuracy issues
- Documented escalation path for serious concerns
- Commitment to transparency about identified issues`,

    q10: `NOTICE: AI-ASSISTED COMPLIANCE GUIDANCE

Before proceeding, please be aware that Clarynt uses artificial intelligence to provide compliance guidance and generate documentation templates.

What this means for you:
- An AI system will analyze your inputs and generate customized guidance
- All AI-generated content is suggestions only and requires human review
- A qualified attorney should review all compliance documents before implementation

Your rights:
- You may request information about how our AI works
- You may provide feedback on AI outputs at any time
- You may request human-only assistance if preferred

By continuing, you acknowledge this disclosure.`,

    q11: `ADVERSE DECISION PROCESS:

Since Clarynt's AI system provides compliance guidance rather than making consequential decisions about individuals, traditional "adverse decisions" do not apply to our service.

However, if a user disagrees with a classification or guidance provided:

1. The user can click "Request Review" on any output
2. Our compliance team manually reviews the specific question and context
3. Within 5 business days, we provide:
   - Confirmation or correction of the original guidance
   - Explanation of the reasoning
   - Alternative approaches if applicable
4. Users can escalate to our Head of Compliance if unsatisfied`,

    q12: `YOUR RIGHT TO APPEAL

If you believe Clarynt's AI system provided incorrect guidance that negatively affected your compliance efforts, you have the right to appeal.

**How to Appeal:**

Step 1: Document the specific guidance you believe was incorrect, including:
- The question you asked
- The response you received
- Why you believe it was incorrect

Step 2: Submit your appeal via:
- Email: appeals@clarynt.net
- Subject line: "Guidance Appeal - [Your Company Name]"

Step 3: Our compliance team will:
- Acknowledge receipt within 2 business days
- Review your appeal with qualified legal advisors
- Provide a written response within 10 business days

Step 4: If you remain unsatisfied:
- Request escalation to our CEO/Head of Compliance
- Final determination provided within 5 additional business days

**No Retaliation:**
Your appeal will not affect your access to Clarynt services.`
  },

  outcome9: {
    q1: `INTERNAL DOCUMENTATION ACCESS PROCESS:

At Clarynt, our development and deployment functions are managed by the same team, ensuring seamless information flow. Specifically:

1. **Shared Documentation Repository**: All technical documentation, risk assessments, and limitation analyses are stored in a central repository (Notion) accessible to all team members.

2. **Development-to-Deployment Handoff**: Before any AI system update is deployed:
   - Developer documents all changes, known limitations, and risk considerations
   - Compliance review checklist is completed
   - CEO/Head of Compliance reviews and approves deployment

3. **Real-time Communication**: As a small team, we maintain continuous communication about system capabilities and limitations through daily standups and a shared Slack channel.

4. **Quarterly Reviews**: Formal quarterly reviews ensure deployment practices remain aligned with current technical understanding of system capabilities.`,

    q2: `CONFLICT RESOLUTION PROCESS:

Given Clarynt's small team structure, conflicts between development and deployment priorities are resolved through:

1. **Unified Leadership**: Our CEO oversees both development and compliance, ensuring alignment from the top.

2. **Documented Decision Framework**: When conflicts arise (e.g., accuracy vs. user experience), we apply the following priority hierarchy:
   - User safety and regulatory compliance (highest priority)
   - Accuracy and reliability of outputs
   - User experience and efficiency
   - Feature development and expansion

3. **Specific Examples**:
   - If a model update improves accuracy but reduces response speed, we prioritize accuracy
   - If a feature could increase engagement but risk over-reliance on AI, we implement safeguards first
   - If development wants to expand capabilities but compliance identifies risks, we address risks before deployment

4. **Documentation**: All significant tradeoff decisions are documented with rationale for audit purposes.

5. **External Review**: For major decisions, we consult with external legal counsel to ensure our resolution is appropriate.`
  }
};

// Hard-coded questions (checklists are now dynamically generated)
const outcomeData = {
  outcome1: {
    title: "Not Subject to the Colorado AI Act",
    questions: [],
    message: "Your classification doesn't require strict documentation. Make sure to review the checklist to see the full compliance requirements."
  },
  outcome2: {
    title: "Exempt Deployer",
    questions: [
      {
        id: "q1",
        text: "What is the exact step-by-step process a consumer should follow to ask about a decision made with the help of the AI system?"
      },
      {
        id: "q2",
        text: "Please provide the specific contact information (e.g., email address 'AI-inquiry@yourcompany.com', a link to a web form) that consumers should use for these inquiries."
      },
      {
        id: "q3",
        text: "Describe the internal procedure your team will follow to review a consumer's inquiry. Who is involved, and what information will they review?"
      },
      {
        id: "q4",
        text: "What information are you prepared to share with a consumer who questions a decision? This will help draft a template response that leverages the documentation provided by the system's developer."
      }
    ]
  },
  outcome3: {
    title: "Not an AI System Under CAIA",
    questions: [],
    message: "Your classification doesn't require strict documentation. Make sure to review the checklist to see the full compliance requirements."
  },
  outcome4: {
    title: "Not a Developer Under CAIA",
    questions: [],
    message: "Your classification doesn't require strict documentation. Make sure to review the checklist to see the full compliance requirements."
  },
  outcome5: {
    title: "General AI System with Disclosure Duty",
    questions: [
      {
        id: "q1",
        text: "For each of your consumer-facing AI systems, please provide its name and primary function."
      },
      {
        id: "q2",
        text: "Provide the exact text for your AI disclosure statement (e.g., 'You are interacting with an AI assistant.')."
      },
      {
        id: "q3",
        text: "Describe precisely where and when this disclosure will appear to the user (e.g., 'As the first message in the chat window before the user can type,' or 'In a persistent banner at the top of the interface')."
      },
      {
        id: "q4",
        text: "If you have determined that a disclosure is not needed for a particular system, provide the detailed justification. Why would a reasonable person find it obvious they are interacting with AI? If there is not obvious reason or you are choosing to add an explicit disclosure, please put N/A.",
        note: "If you answer anything except N/A, you don't need to answer the 2nd and 3rd questions."
      }
    ]
  },
  outcome6: {
    title: "Not a Regulated System",
    questions: [],
    message: "Your classification doesn't require strict documentation. Make sure to review the checklist to see the full compliance requirements."
  },
  outcome7: {
    title: "Developer of High-Risk AI System",
    questions: [
      {
        id: "q1",
        text: "Provide a statement describing the intended and reasonably foreseeable uses of the AI system. Also, list any known uses that would be harmful or inappropriate."
      },
      {
        id: "q2",
        text: "What is the specific purpose of the system, what are its intended benefits, and what are its intended outputs (e.g., a risk score, a classification)?"
      },
      {
        id: "q3",
        text: "Provide a high-level summary of the types and sources of data used to train the model."
      },
      {
        id: "q4",
        text: "Describe the system's known limitations. In what scenarios might its performance degrade, become unreliable, or pose a risk of algorithmic discrimination?"
      },
      {
        id: "q5",
        text: "Describe the technical methods and fairness metrics used to evaluate the system for algorithmic discrimination. What were the results of this evaluation?"
      },
      {
        id: "q6",
        text: "What specific steps (technical or procedural) were taken to mitigate any discrimination risks that were identified during testing?"
      },
      {
        id: "q7",
        text: "Describe your data governance measures. How did you assess the suitability of data sources and mitigate potential biases within them?"
      },
      {
        id: "q8",
        text: "Provide clear guidance for deployers on how the system should be used, how it should not be used, and how it should be monitored by a human to ensure fair outcomes."
      },
      {
        id: "q9",
        text: "Provide a list of the general categories of high-risk AI systems your company develops (e.g., 'employment screening systems,' 'credit assessment models')."
      },
      {
        id: "q10",
        text: "Provide the summary text for your public website, describing your company's overarching approach to managing the risks of algorithmic discrimination."
      }
    ]
  },
  outcome8: {
    title: "Deployer of High-Risk AI System",
    questions: [
      {
        id: "q1",
        text: "Who is the designated executive accountable for your AI risk management program? Provide their name and title."
      },
      {
        id: "q2",
        text: "Describe your organization's core principles for the responsible deployment of AI."
      },
      {
        id: "q3",
        text: "Provide the summary text for your public website, describing the types of high-risk systems you deploy and your approach to managing their risks."
      },
      {
        id: "q4",
        text: "For your public statement, describe the nature, source, and extent of the data your high-risk systems collect and use."
      },
      {
        id: "q5",
        text: "State the specific purpose, intended use cases, and expected benefits of the AI system."
      },
      {
        id: "q6",
        text: "What are the specific, foreseeable risks of algorithmic discrimination you have identified for your customers, and what mitigation steps have you taken for each?"
      },
      {
        id: "q7",
        text: "List the categories of data the system uses as inputs and produces as outputs."
      },
      {
        id: "q8",
        text: "What metrics do you use to evaluate the system's performance, and what are its known limitations?"
      },
      {
        id: "q9",
        text: "Describe your plan for post-deployment monitoring and the safeguards in place for users."
      },
      {
        id: "q10",
        text: "Provide the exact text for the notice that will be shown to consumers before a consequential decision is made."
      },
      {
        id: "q11",
        text: "For an adverse decision, what is the process for generating and providing a consumer with the principal reason(s)?"
      },
      {
        id: "q12",
        text: "Provide the exact text explaining the consumer's right to appeal an adverse decision, including the step-by-step instructions they must follow."
      }
    ]
  },
  outcome9: {
    title: "Both Developer and Deployer of High-Risk AI System",
    questions: [
      {
        id: "q1",
        text: "Describe the process that ensures your deployment teams have full access to the technical limitations and risk assessments produced by your development teams. This will inform the governance section of your documentation."
      },
      {
        id: "q2",
        text: "How does your organization manage and resolve potential internal conflicts between development goals (e.g., model accuracy) and deployment responsibilities (e.g., fairness, consumer rights)?"
      }
    ],
    additionalNote: "Please answer all questions listed for both Developer (outcome7) and Deployer (outcome8) sections."
  }
};

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState(null);
  const [answers, setAnswers] = useState({});
  const [checklist, setChecklist] = useState({}); // For tracking checked/unchecked state
  const [checklistItems, setChecklistItems] = useState([]); // For storing the dynamic checklist items
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [documents, setDocuments] = useState({}); // Dictionary of all generated documents
  const [selectedDocKey, setSelectedDocKey] = useState(null); // Currently selected document key
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Load outcome from sessionStorage
    const storedOutcome = sessionStorage.getItem('riskLevel');
    if (storedOutcome && outcomeData[storedOutcome]) {
      setOutcome(storedOutcome);

      // Load saved answers and checklist if they exist
      const savedAnswers = sessionStorage.getItem('documentationAnswers');
      const savedChecklist = sessionStorage.getItem('documentationChecklist');
      const savedChecklistItems = sessionStorage.getItem('documentationChecklistItems');

      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }
      if (savedChecklist) {
        setChecklist(JSON.parse(savedChecklist));
      }
      if (savedChecklistItems) {
        setChecklistItems(JSON.parse(savedChecklistItems));
      }
    }
    // If no outcome, we'll show the selection screen instead of redirecting
  }, [navigate]);

  const handleOutcomeSelect = (selectedOutcome) => {
    setOutcome(selectedOutcome);
    sessionStorage.setItem('riskLevel', selectedOutcome);
    // Reset any previous answers
    setAnswers({});
    setChecklist({});
    setChecklistItems([]);
  };

  // Save to sessionStorage whenever answers or checklist change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem('documentationAnswers', JSON.stringify(answers));
    }
  }, [answers]);

  useEffect(() => {
    if (Object.keys(checklist).length > 0) {
      sessionStorage.setItem('documentationChecklist', JSON.stringify(checklist));
    }
  }, [checklist]);

  useEffect(() => {
    if (checklistItems.length > 0) {
      sessionStorage.setItem('documentationChecklistItems', JSON.stringify(checklistItems));
    }
  }, [checklistItems]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleLoadDemo = () => {
    if (outcome && demoAnswers[outcome]) {
      // Load demo answers for the current outcome
      setAnswers(demoAnswers[outcome]);

      // For outcome9 (both developer and deployer), also load those demo answers
      if (outcome === 'outcome9') {
        setAnswers(prev => ({
          ...prev,
          ...demoAnswers.outcome7,
          ...demoAnswers.outcome8,
          ...demoAnswers.outcome9
        }));
      }
    }
  };

  const handleChecklistToggle = (index) => {
    setChecklist(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const surveyAnswers = JSON.parse(sessionStorage.getItem('surveyResults') || '{}');
      
      // Convert survey answers to a more readable format for the API
      const formattedSurveyHistory = Object.entries(surveyAnswers).map(([key, value]) => ({
        question: key,
        answer: Array.isArray(value) ? value.join(', ') : value
      }));
      
      // Run generation in parallel
      const [docResponse, checklistResponse] = await Promise.all([
        axios.post('/api/generate-outcome-documentation', {
          outcome,
          answers,
          checklist: {}, // Not used by backend for generation
          surveyHistory: formattedSurveyHistory
        }),
        axios.post('/api/generate-checklist', {
          outcome,
          answers,
          checklist: {},
          surveyHistory: formattedSurveyHistory
        })
      ]);
      
      // Handle documentation response
      const documentsDict = docResponse.data.documents || {};
      setDocuments(documentsDict);
      
      // Set first document as selected by default
      const firstKey = Object.keys(documentsDict)[0];
      setSelectedDocKey(firstKey || null);

      // Handle checklist response
      if (checklistResponse.data.checklist) {
        setChecklistItems(checklistResponse.data.checklist);
        // Reset checked state when generating new checklist
        setChecklist({});
      }
      
      setIsEditing(true);
      setShowResult(true);
    } catch (error) {
      console.error('Error generating documentation:', error);
      alert('Failed to generate documentation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedDocKey || !documents[selectedDocKey]) {
      alert('No document selected to download.');
      return;
    }

    setIsDownloading(true);
    try {
      // Use only the currently selected document
      const currentMarkdown = documents[selectedDocKey] || '';
      const rawHtml = marked.parse(currentMarkdown);
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      
      // Create a temporary container with proper styling for PDF
      const container = document.createElement('div');
      container.style.padding = '40px';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.fontSize = '12px';
      container.style.lineHeight = '1.6';
      container.style.color = '#000';
      container.style.backgroundColor = '#fff';
      container.innerHTML = sanitizedHtml;
      
      // Add styling for headings and other elements
      const style = document.createElement('style');
      style.textContent = `
        h1 { font-size: 24px; margin-top: 20px; margin-bottom: 10px; }
        h2 { font-size: 20px; margin-top: 18px; margin-bottom: 8px; }
        h3 { font-size: 16px; margin-top: 14px; margin-bottom: 6px; }
        h4 { font-size: 14px; margin-top: 12px; margin-bottom: 6px; }
        p { margin-bottom: 10px; }
        ul, ol { margin-bottom: 10px; padding-left: 30px; }
        li { margin-bottom: 5px; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; padding-left: 15px; margin-left: 0; color: #666; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
      `;
      container.appendChild(style);
      
      // Configure html2pdf options with document-specific filename
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${formatDocumentLabel(selectedDocKey)}_${outcome}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      // Generate and download PDF
      await html2pdf().set(opt).from(container).save();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBackToResults = () => {
    navigate('/survey');
  };

  const handleStartOver = () => {
    sessionStorage.removeItem('documentationAnswers');
    sessionStorage.removeItem('documentationChecklist');
    sessionStorage.removeItem('documentationChecklistItems');
    sessionStorage.removeItem('surveyResults');
    sessionStorage.removeItem('riskLevel');
    navigate('/survey');
  };

  if (!outcome) {
    // Show outcome selection screen
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '3rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            Generate Compliance Documentation
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'var(--muted)',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Select your classification to get started
          </p>

          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            <button
              onClick={() => handleOutcomeSelect('outcome7')}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>Developer of High-Risk AI System</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--muted)' }}>
                You build or create AI systems used in consequential decisions
              </div>
            </button>

            <button
              onClick={() => handleOutcomeSelect('outcome8')}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>Deployer of High-Risk AI System</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--muted)' }}>
                You use AI systems to make or assist consequential decisions
              </div>
            </button>

            <button
              onClick={() => handleOutcomeSelect('outcome9')}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>Both Developer and Deployer</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--muted)' }}>
                You both build and deploy high-risk AI systems
              </div>
            </button>

            <button
              onClick={() => handleOutcomeSelect('outcome5')}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>General AI System with Disclosure Duty</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--muted)' }}>
                Consumer-facing AI that requires transparency disclosures
              </div>
            </button>

            <button
              onClick={() => handleOutcomeSelect('outcome2')}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{ marginBottom: '0.25rem' }}>Exempt Deployer</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '400', color: 'var(--muted)' }}>
                Deployer with reduced obligations under CAIA
              </div>
            </button>
          </div>

          <p style={{
            fontSize: '0.875rem',
            color: 'var(--muted)',
            marginTop: '2rem',
            textAlign: 'center'
          }}>
            Not sure? <a href="/survey" style={{ color: 'var(--primary)' }}>Take the Risk Calculator</a> to determine your classification.
          </p>
        </div>
      </div>
    );
  }

  const data = outcomeData[outcome];
  const hasQuestions = data.questions.length > 0;

  // If showing result
  if (showResult) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: checklistItems.length > 0 ? '1fr 350px' : '1fr',
          gap: '2rem'
        }}>
          {/* Main content area - markdown editor/preview */}
          <div style={{
            background: 'var(--panel)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '3rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--text)',
              marginBottom: '1rem'
            }}>
              Generated Documentation
            </h1>

            {Object.keys(documents).length === 0 ? (
              <div style={{
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '2rem',
                marginBottom: '2rem',
                textAlign: 'center'
              }}>
                <p style={{
                  color: 'var(--muted)',
                  fontSize: '1rem',
                  margin: 0
                }}>
                  No documents generated for this outcome.
                </p>
              </div>
            ) : (
              <>
                {/* Document Tabs Navigation */}
                <div style={{
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '1.5rem',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    paddingBottom: '0.5rem'
                  }}>
                    {Object.keys(documents).map(key => (
                      <button
                        key={key}
                        onClick={() => setSelectedDocKey(key)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: selectedDocKey === key ? 'var(--primary)' : 'transparent',
                          border: selectedDocKey === key ? 'none' : '1px solid var(--border)',
                          borderRadius: '8px 8px 0 0',
                          color: selectedDocKey === key ? '#fff' : 'var(--text)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatDocumentLabel(key)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit/Preview Toggle Button */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: isEditing ? 'var(--primary)' : 'transparent',
                      border: `1px solid var(--primary)`,
                      borderRadius: '8px',
                      color: isEditing ? '#fff' : 'var(--primary)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: !isEditing ? 'var(--primary)' : 'transparent',
                      border: `1px solid var(--primary)`,
                      borderRadius: '8px',
                      color: !isEditing ? '#fff' : 'var(--primary)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    Preview
                  </button>
                </div>
                
                {/* Markdown Editor or Preview */}
                {selectedDocKey && (
                  <>
                    {isEditing ? (
                      <textarea
                        value={documents[selectedDocKey] || ''}
                        onChange={(e) => setDocuments(prev => ({
                          ...prev,
                          [selectedDocKey]: e.target.value
                        }))}
                        style={{
                          width: '100%',
                          minHeight: '500px',
                          padding: '1.5rem',
                          background: 'var(--bg-elev)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          color: 'var(--text)',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          lineHeight: '1.6',
                          resize: 'vertical',
                          marginBottom: '2rem'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background: 'var(--bg-elev)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          padding: '2rem',
                          marginBottom: '2rem',
                          minHeight: '500px',
                          maxHeight: '700px',
                          overflow: 'auto',
                          color: 'var(--text)',
                          fontSize: '0.875rem',
                          lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(marked.parse(documents[selectedDocKey] || ''))
                        }}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => setShowResult(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
              >
                ← Back to Questions
              </button>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: isDownloading ? 'var(--border)' : 'linear-gradient(90deg, var(--primary-700), var(--primary))',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    boxShadow: isDownloading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.25)'
                  }}
                >
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </button>

                <button
                  onClick={handleStartOver}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>

          {/* Checklist sidebar - only shown if checklist exists */}
          {checklistItems.length > 0 && (
            <div style={{
              background: 'var(--panel)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '2rem',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              height: 'fit-content',
              position: 'sticky',
              top: '2rem'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--text)',
                marginBottom: '1.5rem'
              }}>
                Compliance Checklist
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {checklistItems.map((item, index) => (
                  <label
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      background: checklist[index] ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-elev)',
                      border: `1px solid ${checklist[index] ? 'var(--ok)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[index] || false}
                      onChange={() => handleChecklistToggle(index)}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    />
                    <span style={{
                      fontSize: '0.875rem',
                      color: 'var(--text)',
                      lineHeight: '1.5'
                    }}>
                      {item}
                    </span>
                  </label>
                ))}
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'var(--bg-elev)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                  margin: 0,
                  textAlign: 'center'
                }}>
                  {Object.values(checklist).filter(Boolean).length} of {checklistItems.length} completed
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main documentation form
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1800px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '1.5rem'
      }}>
        {/* Main content area */}
        <div style={{
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '3rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '0.5rem'
          }}>
            {data.title}
          </h1>
          <p style={{
            fontSize: '1rem',
            color: 'var(--muted)',
            marginBottom: '2rem'
          }}>
            Documentation Generation
          </p>

          {!hasQuestions ? (
            // Show message for outcomes without questions
            <div style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <p style={{
                color: 'var(--text)',
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: 0
              }}>
                {data.message}
              </p>
            </div>
          ) : (
            // Show questions
            <div style={{ marginBottom: '2rem' }}>
              {data.additionalNote && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid var(--primary)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '2rem'
                }}>
                  <p style={{
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    <strong>Note:</strong> {data.additionalNote}
                  </p>
                </div>
              )}

              {data.questions.map((question, index) => (
                <div key={question.id} style={{ marginBottom: '2rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'var(--text)',
                    marginBottom: '0.5rem'
                  }}>
                    Question {index + 1}
                  </label>
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted)',
                    marginBottom: '0.75rem',
                    lineHeight: '1.5'
                  }}>
                    {question.text}
                  </p>
                  {question.note && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--primary)',
                      marginBottom: '0.75rem',
                      fontStyle: 'italic'
                    }}>
                      Note: {question.note}
                    </p>
                  )}
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Enter your answer here..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '1rem',
                      background: 'var(--bg-elev)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'space-between',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleBackToResults}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              ← Back to Results
            </button>

            {hasQuestions && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {demoAnswers[outcome] && (
                  <button
                    onClick={handleLoadDemo}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'transparent',
                      border: '1px solid var(--primary)',
                      borderRadius: '10px',
                      color: 'var(--primary)',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    Load Demo (Clarynt)
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: isGenerating ? 'var(--border)' : 'var(--ok)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.25)'
                  }}
                >
                  {isGenerating ? 'Generating...' : 'Generate Documentation'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chatbot Assistant */}
        <div style={{
          height: '800px',
          position: 'sticky',
          top: '2rem'
        }}>
          <ComplianceChatbot
            userContext={{
              outcome: outcome,
              role: outcome === 'outcome7' ? 'developer' : outcome === 'outcome8' ? 'deployer' : outcome === 'outcome9' ? 'both' : 'unknown',
              answers: answers,
              checklist: checklist
            }}
            questions={data.questions}
            currentAnswers={answers}
            onSuggestAnswer={(questionId, answer) => {
              setAnswers(prev => ({ ...prev, [questionId]: answer }));
            }}
          />
        </div>
      </div>
    </div>
  );
}

