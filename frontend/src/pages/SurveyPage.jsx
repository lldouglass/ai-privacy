import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

// Result configurations for different risk outcomes
const riskResults = {
  outcome1: {
    title: "Not Subject to the Colorado AI Act",
    color: "#ef4444",
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))",
    description: "Your organization is likely not subject to this act.",
    details: "The Colorado AI Act applies to persons or entities \"doing business in this state.\"  If your organization has no business nexus with Colorado, the Act's requirements do not apply.",
    reason: "The Act's jurisdiction is established by the \"doing business in Colorado\" clause. Without this, there are no compliance obligations."
  },
  outcome2: {
    title: "Exempt Deployer",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))",
    description: "You are a small business deployer with reduced obligations.",
    details: "You are exempt from some of the Act's more burdensome requirements, such as the notice to consumers.  However, you must still use reasonable care to protect consumers from algorithmic discrimination and make impact assessment information available to them.",
    reason: "The Act provides a narrow exemption for deployers that meet four specific criteria related to size, data usage, and adherence to developer guidelines, aiming to reduce the compliance burden on small businesses."
  },
  outcome3: {
    title: "Not an AI System Under CAIA",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))",
    description: "Your technology does not meet the Act's definition.",
    details: "Your system is not subject to the requirements of the Colorado AI Act.",
    reason: "The Act defines an AI system as one that infers from inputs to generate outputs that influence environments.  If your technology does not perform this core function, it falls outside the scope of the legislation."
  },
 outcome4: {
    title: "Not a Developer Under CAIA",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))",
    description: "Your role does not meet the Act's definition.",
    details: "You are not subject to the specific obligations for Developers under the Act. If you use a high-risk AI system, you may still have obligations as a Deployer.",
    reason: "A \"Developer\" is defined as an entity that either creates an AI system or \"intentionally and substantially modifies\" one, creating a new risk of discrimination.  Simply using a system without modifying it in this way does not make you a Developer."
  },
  outcome5: {
    title: "General AI System with Disclosure Duty",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))",
    description: "Your system requires a basic consumer disclosure.",
    details: "You must disclose to any consumer interacting with the AI system that they are, in fact, interacting with an AI system. This is not required if it would be obvious to a reasonable person.",
    reason: "The Act includes a broad transparency rule that applies to all consumer-facing AI, not just high-risk systems, to ensure consumers are aware of the nature of their interaction."
  },
  outcome6: {
    title: "Not a Regulated System",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "Your AI system is not currently regulated by CAIA.",
    details: "Your AI system is not considered \"high-risk\" and is not consumer-facing, so it is not subject to the Act's primary obligations or its general disclosure rule.",
    reason: "The Act focuses its most stringent requirements on \"high-risk\" systems used for consequential decisions.  It also has a general disclosure rule for consumer-facing AI.  Systems that are neither high-risk nor consumer-facing fall outside these provisions."
  },
  outcome7: {
    title: "Developer of High-Risk AI System",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "You have full compliance duties as a Developer.",
    details: "You must use reasonable care to protect consumers from known or reasonably foreseeable risks of algorithmic discrimination. You must provide deployers with a general statement on foreseeable uses and documentation covering the system's purpose, training data summaries, known limitations, performance evaluation, and risk mitigation measures. You must maintain a statement on your website summarizing the types of high-risk AI systems you've developed and how you manage discrimination risks. You must disclose to the Attorney General and all known deployers within 90 days if you discover the system has caused or is likely to cause algorithmic discrimination.",
    reason: "Your AI system is classified as \"high-risk\" because it is a substantial factor in making a \"consequential decision\" and does not qualify for an exemption.  The Act places specific obligations on the creators of these systems to ensure transparency and accountability down the supply chain."
  },
  outcome8: {
    title: "Deployer of High-Risk AI System",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "You have full compliance duties as a Deployer.",
    details: "You must use reasonable care to protect consumers from known or reasonably foreseeable risks of algorithmic discrimination. You must implement and maintain a risk management policy and program, considering frameworks like the NIST AI Risk Management Framework. You must conduct and document an impact assessment for the system at least annually and within 90 days of any substantial modification. You must notify consumers before a consequential decision is made. If a decision is adverse, you must provide the reason(s) and an opportunity for the consumer to correct data and appeal the decision. You must maintain a statement on your website summarizing the types of high-risk systems you deploy and how you manage discrimination risks. You must disclose to the Attorney General within 90 days if you discover the system has caused algorithmic discrimination.",
    reason: "Your use of the AI system classifies you as a \"Deployer\" of a \"high-risk\" system because it is a substantial factor in making a \"consequential decision.\"  The Act places the most extensive obligations on Deployers as they are the entities directly impacting consumers."
  },
  outcome9: {
    title: "Both Developer and Deployer of High-Risk AI System",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "You must comply with the duties of both roles.",
    details: "You must fulfill all obligations related to both roles. This includes providing documentation about the system you developed and conducting impact assessments for how you deploy it, among all other duties.",
    reason: "An entity that develops a high-risk AI system and also uses it to make consequential decisions about consumers is subject to the full set of requirements for both roles under the Act."
  }
};

// Survey questions configuration - easy to modify and extend
const surveyQuestions = [
  {
    id: 'q1',
    question: 'Does your organization conduct business in the state of Colorado, such as offering products or services to Colorado residents? ',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q2' },
      { label: 'No', value: 'no', nextQuestion: 'outcome1' }
    ]
  },
  {
    id: 'q2',
    question: 'Did you or your organization build the AI system in question, or make deliberate, significant changes to an existing AI system? ',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q2a' },
      { label: 'No', value: 'no', nextQuestion: 'q2b' }
    ]
  },
  {
    id: 'q2a',
    question: 'Does your organization also use this AI system to make, or help make, important decisions that have a significant effect on consumers (e.g., in areas like employment, housing, or lending)?',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q3' },
      { label: 'No', value: 'no', nextQuestion: 'q4' }
    ]
  },
  {
    id: 'q2b',
    question: 'Does your organization use an AI system to make, or help make, important decisions that have a significant effect on consumers (e.g., in areas like employment, housing, or lending)?',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q3' },
      { label: 'No', value: 'no', nextQuestion: 'q6' }
    ]
  },
  {
    id: 'q3',
    question: '(For Deployers): Select the criteria that your organization meets, or all of the above:',
    options: [
      { label: 'Employs fewer than 50 full-time equivalent employees.', value: 'employees', nextQuestion: 'q4' },
      { label: 'Does NOT use its own data to train the AI system.', value: 'data', nextQuestion: 'q6' },
      { label: 'The AI system is used only for the intended purposes disclosed by the developer.', value: 'purpose', nextQuestion: 'q6' },
      { label: 'You make information from the developer\'s impact assessment available to consumers.', value: 'impact_assessment', nextQuestion: 'q6' },
      { label: 'None of the above', value: 'none', nextQuestion: 'q6' },
      { label: 'All of the above', value: 'all', nextQuestion: 'outcome2' }
    ]
  },
  {
    id: 'q4',
    question: 'Does your technology meet the definition of an "Artificial Intelligence System" – a machine-based system that infers from inputs how to generate outputs (like content, decisions, or predictions) that can influence physical or virtual environments?',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q5' },
      { label: 'No', value: 'no', nextQuestion: 'outcome3' }
    ]
  },
  {
    id: 'q5',
    question: 'Did your organization create the AI system, or did you make an "intentional and substantial modification" to an existing AI system?',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q6' },
      { label: 'No', value: 'no', nextQuestion: 'outcome4' }
    ]
  },
  {
    id: 'q6',
    question: 'In which areas is your AI system making, or is it a "substantial factor" in making, a "consequential decision" affecting a consumer?',
    options: [
      { label: 'Employment or employment opportunity', value: 'employment', nextQuestion: 'q8' },
      { label: 'Housing', value: 'housing', nextQuestion: 'q8' },
      { label: 'Financial or lending service', value: 'financial', nextQuestion: 'q8' },
      { label: 'Education enrollment or opportunity', value: 'education', nextQuestion: 'q8' },
      { label: 'Healthcare services', value: 'healthcare_services', nextQuestion: 'q8' },
      { label: 'Insurance', value: 'insurance', nextQuestion: 'q8' },
      { label: 'An essential government service', value: 'essential_government_service', nextQuestion: 'q8' },
      { label: 'Legal services', value: 'legal_services', nextQuestion: 'q8' },
      { label: 'None of the above', value: 'none', nextQuestion: 'q7' }
    ]
  },
  {
    id: 'q7',
    question: 'Is the AI system intended to interact directly with consumers?',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'outcome5' },
      { label: 'No', value: 'no', nextQuestion: 'outcome6' },
    ]
  },
  {
    id: 'q8',
    question: 'Which of the following categories does your AI system fall into? (If your AI system makes a "consequential decision" affecting a consumer, please select "Consequential Decision"):',
    options: [
      { 
        label: 'Consequential Decision', 
        value: 'consequential_decision', 
        nextQuestion: (answerHistory) => {
          // Find previous answers from q2a and q2b
          const q2aAnswer = answerHistory.find(a => a.questionId === 'q2a')?.answer?.value;
          const q2bAnswer = answerHistory.find(a => a.questionId === 'q2b')?.answer?.value;
          
          // Conditional logic based on previous answers
          if (q2aAnswer === 'no') return 'outcome7';
          if (q2bAnswer === 'yes') return 'outcome8';
          return 'outcome9';
        }
      },
      { label: 'Performs ONLY a narrow procedural task.', value: 'narrow_procedural_task', nextQuestion: 'q7' },
      { label: 'Detects decision-making patterns without replacing or influencing human assessment.', value: 'detect_decision_making_patterns', nextQuestion: 'q7' },
      { label: 'Is a technology like a spam filter, firewall, spreadsheet, or calculator.', value: 'simple_technology', nextQuestion: 'q7' },
      { label: 'None of the above', value: 'none', nextQuestion: (answerHistory) => {
        // Find previous answers from q2a and q2b
        const q2aAnswer = answerHistory.find(a => a.questionId === 'q2a')?.answer?.value;
        const q2bAnswer = answerHistory.find(a => a.questionId === 'q2b')?.answer?.value;
        
        // Conditional logic based on previous answers
        if (q2aAnswer === 'no') return 'outcome7';
        if (q2bAnswer === 'yes') return 'outcome8';
        return 'outcome9';
      }
    }
    ]
  }
];

export default function SurveyPage() {
  const navigate = useNavigate();
  const [currentQuestionId, setCurrentQuestionId] = useState('q1');
  const [selectedOption, setSelectedOption] = useState(null);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [resultId, setResultId] = useState(null); // Track if we're showing a result

  // Find current question or result
  const currentQuestion = surveyQuestions.find(q => q.id === currentQuestionId);
  const currentResult = riskResults[resultId];

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (!selectedOption) return;

    const newAnswerHistory = [...answerHistory, {
      questionId: currentQuestionId,
      question: currentQuestion.question,
      answer: selectedOption
    }];
    setAnswerHistory(newAnswerHistory);

    // Determine next question (handle both string and function)
    let nextQuestionId;
    if (typeof selectedOption.nextQuestion === 'function') {
      // Pass current answer history to the function so it can access previous answers
      nextQuestionId = selectedOption.nextQuestion(answerHistory);
    } else {
      nextQuestionId = selectedOption.nextQuestion;
    }

    // Check if nextQuestion is a result page
    if (riskResults[nextQuestionId]) {
      // Store results in session storage
      sessionStorage.setItem('surveyResults', JSON.stringify(newAnswerHistory));
      sessionStorage.setItem('riskLevel', nextQuestionId);
      // Show result
      setResultId(nextQuestionId);
      setSelectedOption(null);
      return;
    }

    // Navigate to next question
    setCurrentQuestionId(nextQuestionId);
    setSelectedOption(null);
  };

  const handleBack = () => {
    // If on result page, go back to last question
    if (resultId) {
      const previousAnswer = answerHistory[answerHistory.length - 1];
      setResultId(null);
      setCurrentQuestionId(previousAnswer.questionId);
      setSelectedOption(previousAnswer.answer);
      setAnswerHistory(answerHistory.slice(0, -1));
      return;
    }

    if (answerHistory.length === 0) return;

    // Get previous question from history
    const previousAnswer = answerHistory[answerHistory.length - 1];
    setCurrentQuestionId(previousAnswer.questionId);
    setSelectedOption(previousAnswer.answer);
    setAnswerHistory(answerHistory.slice(0, -1));
  };

  // Show result page if we have a result
  if (currentResult) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '900px',
          width: '100%',
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '3rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Risk Level Badge */}
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: currentResult.gradient,
            border: `2px solid ${currentResult.color}`,
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <span style={{
              color: currentResult.color,
              fontWeight: '700',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Assessment Complete
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: currentResult.color,
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            {currentResult.title}
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '1.25rem',
            color: 'var(--text)',
            marginBottom: '1.5rem',
            fontWeight: '500',
            lineHeight: '1.5'
          }}>
            {currentResult.description}
          </p>

          {/* Details */}
          <p style={{
            fontSize: '1rem',
            color: 'var(--muted)',
            marginBottom: '1.5rem',
            lineHeight: '1.7'
          }}>
            {currentResult.details}
          </p>

          {/* Reason box */}
          <div style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '2.5rem'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              color: 'var(--muted)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Why this classification?
            </h3>
            <p style={{
              color: 'var(--text)',
              fontSize: '1rem',
              margin: 0,
              lineHeight: '1.6'
            }}>
              {currentResult.reason}
            </p>
          </div>

          {/* Call to action */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => navigate('/checkup')}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '1rem 2rem',
                background: 'linear-gradient(90deg, var(--primary-700), var(--primary))',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Generate Documentation →
            </button>

            <button
              onClick={() => navigate('/demo')}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '1rem 2rem',
                background: 'transparent',
                border: '1px solid var(--primary)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              See live demo
            </button>

            <button
              onClick={handleBack}
              style={{
                padding: '1rem 2rem',
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
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }}
            >
              &lt; Back
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('surveyResults');
                sessionStorage.removeItem('riskLevel');
                setResultId(null);
                setCurrentQuestionId('q1');
                setAnswerHistory([]);
                setSelectedOption(null);
              }}
              style={{
                padding: '1rem 2rem',
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
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }}
            >
              Retake Survey
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div>Error: Question not found</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
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
        {/* Title */}
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          Colorado AI Compliance Survey
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--muted)',
          marginBottom: '3rem',
          textAlign: 'center'
        }}>
          Determine Your Risk Level
        </p>

        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          justifyContent: 'center'
        }}>
          {surveyQuestions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                width: '3rem',
                height: '4px',
                background: answerHistory.some(a => a.questionId === q.id) || q.id === currentQuestionId
                  ? 'var(--primary)'
                  : 'var(--border)',
                borderRadius: '2px',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Question */}
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '600',
          color: 'var(--text)',
          marginBottom: '2rem',
          lineHeight: '1.4'
        }}>
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOption?.value === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-elev)',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-elev)';
                  }
                }}
              >
                {/* Checkbox indicator */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleBack}
            disabled={answerHistory.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text)',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: answerHistory.length === 0 ? 'not-allowed' : 'pointer',
              opacity: answerHistory.length === 0 ? 0.4 : 1,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (answerHistory.length > 0) {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (answerHistory.length > 0) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
          >
            &lt; Back
          </button>

          <button
            onClick={handleNext}
            disabled={!selectedOption}
            style={{
              padding: '0.75rem 1.5rem',
              background: selectedOption ? 'var(--ok)' : 'var(--border)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: selectedOption ? 'pointer' : 'not-allowed',
              opacity: selectedOption ? 1 : 0.6,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              boxShadow: selectedOption ? '0 4px 14px rgba(34, 197, 94, 0.25)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (selectedOption) {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedOption) {
                e.currentTarget.style.filter = 'brightness(1)';
              }
            }}
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

