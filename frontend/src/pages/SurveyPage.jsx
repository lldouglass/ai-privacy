import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

// Result configurations for different risk outcomes
const riskResults = {
  unacceptableA: {
    title: "Unacceptable Risk",
    color: "#ef4444",
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))",
    description: "Your AI system falls under the Unacceptable Risk category according to EU AI Act Article 5.",
    details: "Systems in this category are banned in the European Union.",
    reason: "Your AI system is considered a clear threat to people's safety and fundamental rights."
  },
  highRiskA: {
    title: "High-Risk AI System",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))",
    description: "Your AI system is classified as High-Risk under EU AI Act Annex III.",
    details: "High-risk AI systems are subject to strict requirements including risk management, data governance, technical documentation, record-keeping, transparency, human oversight, and accuracy standards. You must establish a quality management system and undergo conformity assessment before placing your system on the EU market.",
    reason: "Your system operates in a critical sector (healthcare, finance, etc.) and makes automated decisions affecting individuals."
  },
  highRiskB: {
    title: "High-Risk AI System",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))",
    description: "Your AI system is classified as High-Risk under EU AI Act Annex III.",
    details: "You are subject to a comprehensive set of strict requirements, including: establishing a risk management system, ensuring high-quality data governance, creating detailed technical documentation, enabling human oversight, and undergoing a conformity assessment before placing the system on the market.",
    reason: "Your system is used as a safety component in a regulated product."
  },
  limitedA: {
    title: "Potential Exemption from High-Risk",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))",
    description: "Your AI system has a High-Risk Use Case with Potential Exemption",
    details: "This is not a complete exemption. You are still required to formally document your assessment justifying why your system is not high-risk and register your system in the EU database before it is placed on the market.",
    reason: "While your AI system is used in a high-risk area, it may be exempt from the full set of high-risk obligations because it does not pose a significant risk of harm."
  },
  limitedB: {
    title: "General-Purpose AI with Systemic Risk",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))",
    description: "Your AI system is considered a systemic risk.",
    details: "You must comply with all standard GPAI obligations plus additional stringent requirements, such as conducting advanced model evaluations, assessing and mitigating systemic risks, tracking serious incidents, and ensuring robust cybersecurity.",
    reason: "Your GPAI model is powerful enough to require sufficient documentation."
  },
  limitedC: {
    title: "Limited Risk",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "Your AI system poses a limited risk, primarily related to transparency.",
    details: "You must ensure users are aware they are interacting with an AI system or viewing AI-generated content. For example, chatbots must disclose they are not human, and \"deepfake\" content must be labeled as manipulated.",
    reason: "Your AI system directly interacts with humans or generates content that could appear authentic."
  },
  minimalA: {
    title: "Excluded from the Act",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "Your AI system is likely excluded from the obligations of the EU AI Act.",
    details: "Excluded AI systems are not subject to mandatory requirements under the EU AI Act.",
    reason: "Your AI system is used exclusively for military, personal non-professional, or scientific R&D purposes"
  },
  minimalB: {
    title: "General-Purpose AI (Standard)",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "Your AI system is classified as a General Purpose AI.",
    details: "You are subject to specific obligations, including creating technical documentation, complying with EU copyright law, and publishing a detailed summary of the content used to train your model.",
    reason: "Your GPAI model is not powerful enough to require advanced documentation, but still requires submitting training content."
  },
  minimalC: {
    title: "Minimal Risk",
    color: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1))",
    description: "Your AI system is considered to pose minimal or no risk.",
    details: "The EU AI Act imposes no specific legal obligations on your system. You are free to use it, though voluntary codes of conduct are encouraged.",
    reason: "Your AI system is used for non-high-risk purposes."
  }
};

// Survey questions configuration - easy to modify and extend
const surveyQuestions = [
  {
    id: 'q1',
    question: 'Does your organization conduct business in the state of Colorado, such as offering products or services to Colorado residents? ',
    options: [
      { label: 'Military or defense.', value: 'military/defense', nextQuestion: 'minimalA' },
      { label: 'Purely personal, non-professional activities (e.g., a personal hobby project).', value: 'personal', nextQuestion: 'minimalA' },
      { label: 'Scientific research and development only.', value: 'research', nextQuestion: 'minimalA' },
      { label: 'None of the above', value: 'other', nextQuestion: 'q2' }
    ]
  },
  {
    id: 'q2',
    question: 'Does your AI system do any of the following?',
    options: [
      { label: 'Use hidden techniques to significantly change a person\'s behavior in a way that could cause them or someone else physical or psychological harm.', value: 'hidden_techniques', nextQuestion: 'unacceptableA' },
      { label: 'Exploit the vulnerabilities of a specific group of people (due to their age, disability, or social/economic situation) to change their behavior in a harmful way.', value: 'vulnerabilities', nextQuestion: 'unacceptableA' },
      { label: 'Assign a "social score" to individuals based on their behavior or characteristics, leading to unfair treatment in unrelated situations.', value: 'social_score', nextQuestion: 'unacceptableA' },
      { label: 'Create or expand facial recognition databases by indiscriminately scraping images from the internet or CCTV footage.', value: 'indiscriminate_scraping', nextQuestion: 'unacceptableA' },
      { label: 'Analyze or infer the emotions of people in workplaces or educational institutions (unless for specific medical or safety reasons).', value: 'analyze_emotions', nextQuestion: 'unacceptableA' },
      { label: 'Categorize people based on sensitive data (like race, political opinions, religion, or sexual orientation) using their biometric information.', value: 'categorize_people', nextQuestion: 'unacceptableA' },
      { label: 'Assess the risk of an individual committing a crime based only on their personality profile or personal traits.', value: 'profile_traits', nextQuestion: 'unacceptableA' },
      { label: 'Use "real-time" remote biometric identification (like live facial recognition) in public spaces, with very limited exceptions for law enforcement.', value: 'biometric_identification', nextQuestion: 'unacceptableA' },
      { label: 'None of the above', value: 'none', nextQuestion: 'q3' }
    ]
  },
  {
    id: 'q3',
    question: 'Is your AI system a safety component of, or is it itself, a product that falls under specific EU safety laws? Think of things like:',
    options: [
      { label: 'Medical devices', value: 'medical_devices', nextQuestion: 'q4' },
      { label: 'Machinery', value: 'machinery', nextQuestion: 'q4' },
      { label: 'Toys', value: 'toys', nextQuestion: 'q4' },
      { label: 'Vehicles (Cars, Agricultural machinery, etc.)', value: 'vehicles', nextQuestion: 'q4' },
      { label: 'Lifts', value: 'lifts', nextQuestion: 'q4' },
      { label: 'Personal Protective Equipment', value: 'protective_equipment', nextQuestion: 'q4' },
      { label: 'Radio Equipment', value: 'radio_equipment', nextQuestion: 'q4' },
      { label: 'None of the above', value: 'none', nextQuestion: 'q5' }
    ]
  },
  {
    id: 'q4',
    question: 'Does the product you selected legally require a safety check (a "third-party conformity assessment") by an authorized body before it can be sold in the EU?',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'highRiskB' },
      { label: 'No', value: 'no', nextQuestion: 'q5' }
    ]
  },
  {
    id: 'q5',
    question: 'Is your AI system intended to be used for any of the following purposes? (Select all that apply)',
    options: [
      { label: 'Biometrics: Identifying or categorizing people based on biometric data (like face or fingerprint scans).', value: 'biometrics', nextQuestion: 'q6' },
      { label: 'Education: Making key decisions about a person\'s education, such as for admissions, scoring exams, or assigning them to schools.', value: 'education', nextQuestion: 'q6' },
      { label: 'Employment: Making decisions in the workplace, like sorting resumes for hiring, deciding on promotions, or monitoring employee performance.', value: 'employment', nextQuestion: 'q6' },
      { label: 'Essential Services: Determining a person\'s access to essential public services (like welfare benefits) or private services (like credit scoring for loans or pricing for health insurance).', value: 'essential_services', nextQuestion: 'q6' },
      { label: 'Law Enforcement, Migration, or Justice: Use by authorities for purposes like assessing the reliability of evidence, evaluating visa applications, or assisting a judge in legal research.', value: 'law_enforcement', nextQuestion: 'q6' },
      { label: 'None of the above', value: 'none', nextQuestion: 'q8' }
    ]
  },
  {
    id: 'q6',
    question: 'Does your AI system perform "profiling"? This means automatically processing personal data to evaluate or predict aspects of a person\'s life, such as their work performance, economic situation, health, personal preferences, or location.',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'highRiskA' },
      { label: 'No', value: 'no', nextQuestion: 'q7' }
    ]
  },
  {
    id: 'q7',
    question: 'Can you demonstrate that your AI system does not pose a significant risk of harm to people\'s health, safety, or fundamental rights because it is only used for one of the following limited purposes?',
    options: [
      { label: 'It performs a narrow, specific procedural task.', value: 'specific_procedural_task', nextQuestion: 'limitedA' },
      { label: 'It is only used to improve the result of a task a human has already completed.', value: 'improve_human_task', nextQuestion: 'limitedA' },
      { label: 'It only detects patterns in decisions and does not replace or influence human judgment without a proper human review.', value: 'pattern_detection', nextQuestion: 'limitedA' },
      { label: 'It only performs a preparatory task before a human makes the final assessment.', value: 'diagnostics_task', nextQuestion: 'limitedA' },
      { label: 'None of the above', value: 'none', nextQuestion: 'highRiskA' }
    ]
  },
  {
    id: 'q8',
    question: 'Is your AI a "general-purpose AI model"? This means it can perform a wide range of distinct tasks and can be integrated into many other AI systems (e.g., a large language model like GPT-4).',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'q9' },
      { label: 'No', value: 'no', nextQuestion: 'q10' }
    ]
  },
  {
    id: 'q9',
    question: 'Does your general-purpose AI model have "systemic risk"? This is typically determined if it was trained using an exceptionally large amount of computing power (greater than 10^25 FLOPs).',
    options: [
      { label: 'Yes', value: 'yes', nextQuestion: 'limitedB' },
      { label: 'No / I don\'t know', value: 'no', nextQuestion: 'minimalB' }
    ]
  },
  {
    id: 'q10',
    question: 'Does your AI system do any of the following? (Select all that apply)',
    options: [
      { label: 'Interact directly with humans (e.g., a chatbot).', value: 'interact_with_humans', nextQuestion: 'limitedC' },
      { label: 'Generate or manipulate image, audio, or video content that appears authentic (e.g., "deepfakes").', value: 'generate_manipulate_content', nextQuestion: 'limitedC' },
      { label: 'Detect emotions or categorize people based on their biometric data (and was not already classified as high-risk or prohibited).', value: 'detect_emotions', nextQuestion: 'limitedC' },
      { label: 'None of the above', value: 'none', nextQuestion: 'minimalC' }
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

    // Check if nextQuestion is a result page
    if (riskResults[selectedOption.nextQuestion]) {
      // Store results in session storage
      sessionStorage.setItem('surveyResults', JSON.stringify(newAnswerHistory));
      sessionStorage.setItem('riskLevel', selectedOption.nextQuestion);
      // Show result
      setResultId(selectedOption.nextQuestion);
      setSelectedOption(null);
      return;
    }

    // Navigate to next question
    setCurrentQuestionId(selectedOption.nextQuestion);
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
          EU AI Compliance Survey
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

