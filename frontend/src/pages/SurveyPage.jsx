import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

// Survey questions configuration with 9 steps
const surveySteps = [
  // Step 0: Scope & role (gate)
  {
    id: 'step0',
    title: 'Scope & Role',
    description: 'Determine if the law applies to you',
    questions: [
      {
        id: 'q0_1',
        question: 'Do you offer products or services to people or businesses in Colorado?',
        type: 'single',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ],
        required: true
      },
      {
        id: 'q0_2',
        question: 'Which best describes you for this AI system?',
        type: 'single',
        options: [
          { label: 'Developer (we built it)', value: 'developer' },
          { label: 'Deployer (we use it)', value: 'deployer' },
          { label: 'Both', value: 'both' }
        ],
        required: true,
        showIf: (answers) => answers.q0_1 === 'yes'
      },
      {
        id: 'q0_3',
        question: 'Who built the system you use?',
        type: 'single',
        options: [
          { label: 'We built it', value: 'we_built' },
          { label: 'A vendor', value: 'vendor' },
          { label: 'Open-source model we configured', value: 'open_source' }
        ],
        required: true,
        showIf: (answers) => answers.q0_1 === 'yes'
      }
    ]
  },

  // Step 1: What the AI actually does
  {
    id: 'step1',
    title: 'What the AI Does',
    description: 'Describe your AI system capabilities',
    questions: [
      {
        id: 'q1_1',
        question: 'What does the AI do? (select all that apply)',
        type: 'multi',
        options: [
          { label: 'Screens, ranks, scores, or approves/denies people', value: 'screening' },
          { label: 'Sets terms for people (price, rate, limits, eligibility)', value: 'terms' },
          { label: 'Recommends options to a human decision-maker', value: 'recommends' },
          { label: 'Summarizes, classifies, or labels content/data', value: 'summarizes' },
          { label: 'Detects patterns or anomalies', value: 'detects' },
          { label: 'Other', value: 'other' }
        ],
        required: true
      },
      {
        id: 'q1_1_other',
        question: 'Please describe what the AI does:',
        type: 'text',
        required: false,
        showIf: (answers) => answers.q1_1?.includes('other')
      },
      {
        id: 'q1_2',
        question: 'Does a person interact directly with the AI (chatbot, voice bot, auto-reply, etc.)?',
        type: 'single',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ],
        required: true
      },
      {
        id: 'q1_3',
        question: 'If Yes, would a reasonable person know it\'s an AI?',
        type: 'single',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Not sure', value: 'not_sure' }
        ],
        required: true,
        showIf: (answers) => answers.q1_2 === 'yes'
      }
    ]
  },

  // Step 2: Is it a "consequential decision" (high-risk)?
  {
    id: 'step2',
    title: 'High-Risk Assessment',
    description: 'Determine if this is a consequential decision',
    questions: [
      {
        id: 'q2_1',
        question: 'In which areas is the AI a substantial factor in decisions about a person? (select all that apply)',
        type: 'multi',
        options: [
          { label: 'Employment', value: 'employment' },
          { label: 'Housing', value: 'housing' },
          { label: 'Financial/lending', value: 'financial' },
          { label: 'Education', value: 'education' },
          { label: 'Healthcare', value: 'healthcare' },
          { label: 'Insurance', value: 'insurance' },
          { label: 'Essential government service', value: 'govt_service' },
          { label: 'Legal services', value: 'legal' },
          { label: 'None of the above', value: 'none' }
        ],
        required: true
      },
      {
        id: 'q2_2',
        question: 'How is the final decision made, in practice?',
        type: 'single',
        options: [
          { label: 'AI auto-decides with no human review', value: 'auto' },
          { label: 'Human reviews/overrides most of the time', value: 'mostly_human' },
          { label: 'Human reviews only edge cases or appeals', value: 'edge_cases' }
        ],
        required: true,
        showIf: (answers) => answers.q2_1 && !answers.q2_1.includes('none')
      },
      {
        id: 'q2_3',
        question: 'Roughly, what % of decisions are automated end-to-end?',
        type: 'slider',
        options: [
          { label: '0%', value: '0' },
          { label: '<25%', value: '25' },
          { label: '25–75%', value: '50' },
          { label: '>75%', value: '100' }
        ],
        required: true,
        showIf: (answers) => answers.q2_1 && !answers.q2_1.includes('none')
      }
    ]
  },

  // Step 3: Publishing & contacts
  {
    id: 'step9',
    title: 'Publishing & Contacts',
    description: 'Public disclosure and consumer contact',
    questions: [
      {
        id: 'q9_1',
        question: 'Do you want us to generate a public "AI in use" web page for you?',
        type: 'single',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ],
        required: true
      },
      {
        id: 'q9_2',
        question: 'Where should consumers send questions/appeals?',
        type: 'text',
        placeholder: 'email@company.com or support URL',
        required: true
      }
    ]
  }
];

export default function SurveyPage() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [currentStepAnswers, setCurrentStepAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  // Filter questions based on showIf conditions
  const getVisibleQuestions = (step) => {
    return step.questions.filter(q => {
      if (!q.showIf) return true;
      return q.showIf(answers);
    });
  };

  const currentStep = surveySteps[currentStepIndex];
  const visibleQuestions = currentStep ? getVisibleQuestions(currentStep) : [];
  const isLastStep = currentStepIndex === surveySteps.length - 1;

  // Check if all required questions in current step are answered
  const canProceed = () => {
    return visibleQuestions.every(q => {
      if (!q.required) return true;
      const answer = currentStepAnswers[q.id];
      if (q.type === 'multi') return answer && answer.length > 0;
      if (q.type === 'text') return answer && answer.trim().length > 0;
      return answer !== undefined && answer !== null && answer !== '';
    });
  };

  const handleAnswerChange = (questionId, value, questionType) => {
    setCurrentStepAnswers(prev => {
      if (questionType === 'multi') {
        const current = prev[questionId] || [];
        if (current.includes(value)) {
          return { ...prev, [questionId]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [questionId]: [...current, value] };
        }
      }
      return { ...prev, [questionId]: value };
    });
  };

  const handleNext = () => {
    // Save current step answers
    setAnswers(prev => ({ ...prev, ...currentStepAnswers }));

    if (isLastStep) {
      // Show results
      setShowResults(true);
    } else {
      // Move to next step
      setCurrentStepIndex(prev => prev + 1);
      setCurrentStepAnswers({});
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setCurrentStepAnswers({});
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setAnswers({});
    setCurrentStepAnswers({});
    setShowResults(false);
  };

  const handleDownloadDocuments = async () => {
    try {
      const classification = getRiskClassification();
      const allAnswers = { ...answers, ...currentStepAnswers };

      const response = await fetch('/api/generate-survey-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: allAnswers,
          classification: classification
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate documents');
      }

      const data = await response.json();

      // Create a zip-like download by combining all documents into one markdown file
      let combinedMarkdown = '# Colorado AI Act Compliance Documents\n\n';
      combinedMarkdown += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      combinedMarkdown += `**Classification:** ${classification.title}\n\n`;
      combinedMarkdown += '---\n\n';

      Object.entries(data.documents).forEach(([key, content]) => {
        combinedMarkdown += `\n\n${content}\n\n---\n\n`;
      });

      // Create download
      const blob = new Blob([combinedMarkdown], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caia-compliance-documents-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`Successfully generated ${data.document_count} compliance documents!`);
    } catch (error) {
      console.error('Error generating documents:', error);
      alert('Failed to generate documents. Please try again or contact support.');
    }
  };

  // Calculate risk classification
  const getRiskClassification = () => {
    if (answers.q0_1 === 'no') {
      return {
        title: 'Not Subject to Colorado AI Act',
        color: '#22c55e',
        description: 'Your organization does not do business in Colorado.'
      };
    }

    const isHighRisk = answers.q2_1 && !answers.q2_1.includes('none');
    const isConsumerFacing = answers.q1_2 === 'yes';
    const needsDisclosure = isConsumerFacing && answers.q1_3 !== 'yes';
    const role = answers.q0_2;

    if (!isHighRisk && !isConsumerFacing) {
      return {
        title: 'Not a Regulated System',
        color: '#22c55e',
        description: 'Your AI system is not high-risk and not consumer-facing.'
      };
    }

    if (!isHighRisk && needsDisclosure) {
      return {
        title: 'General AI with Disclosure Duty',
        color: '#f59e0b',
        description: 'You must disclose to consumers that they are interacting with AI.'
      };
    }

    if (isHighRisk) {
      const roleText = role === 'both' ? 'Developer & Deployer' :
                      role === 'developer' ? 'Developer' : 'Deployer';
      return {
        title: `High-Risk ${roleText}`,
        color: '#ef4444',
        description: 'You have full compliance duties under the Colorado AI Act.'
      };
    }

    return {
      title: 'General AI System',
      color: '#22c55e',
      description: 'Basic compliance requirements apply.'
    };
  };

  // Generate document pack summary
  const getDocumentPackSummary = () => {
    const docs = [];
    const isHighRisk = answers.q2_1 && !answers.q2_1.includes('none');
    const isConsumerFacing = answers.q1_2 === 'yes';
    const isDeveloper = answers.q0_2 === 'developer' || answers.q0_2 === 'both';
    const isDeployer = answers.q0_2 === 'deployer' || answers.q0_2 === 'both';

    if (isConsumerFacing && answers.q1_3 !== 'yes') {
      docs.push('Consumer pre-use disclosure notice');
    }

    if (isHighRisk && isDeployer) {
      docs.push('Impact Assessment template');
      docs.push('Risk Management Program checklist');
      docs.push('Adverse action notice template');
      docs.push('Consumer rights & appeals process');
      docs.push('Evidence log template');
    }

    if (isDeployer && answers.q6_1 !== 'all') {
      docs.push('Vendor documentation request letter');
    }

    if (isHighRisk && isDeveloper) {
      docs.push('Developer documentation pack');
      docs.push('AG notification playbook');
    }

    if (answers.q9_1 === 'yes') {
      docs.push('Public "AI in use" disclosure page');
    }

    if (answers.q8_1 === 'yes' || answers.q8_1 === 'not_sure') {
      docs.push('Bias testing starter plan');
    }

    docs.push('Personalized action checklist');

    return docs;
  };

  if (showResults) {
    const classification = getRiskClassification();
    const documents = getDocumentPackSummary();

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '3rem',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Classification Badge */}
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: `linear-gradient(135deg, ${classification.color}22, ${classification.color}11)`,
            border: `2px solid ${classification.color}`,
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <span style={{
              color: classification.color,
              fontWeight: '700',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Assessment Complete
            </span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: classification.color,
            marginBottom: '1rem',
            lineHeight: '1.2'
          }}>
            {classification.title}
          </h1>

          <p style={{
            fontSize: '1.25rem',
            color: 'var(--text)',
            marginBottom: '2rem',
            lineHeight: '1.5'
          }}>
            {classification.description}
          </p>

          {/* Document Pack */}
          <div style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: 'var(--text)',
              marginBottom: '1rem'
            }}>
              Your Personalized Documentation Pack
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {documents.map((doc, idx) => (
                <li key={idx} style={{
                  padding: '0.5rem 0',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ color: classification.color }}>✓</span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleDownloadDocuments}
              style={{
                flex: '1',
                minWidth: '200px',
                padding: '1rem 2rem',
                background: `linear-gradient(90deg, ${classification.color}, ${classification.color}dd)`,
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Download Documents
            </button>

            <button
              onClick={() => navigate('/')}
              style={{
                padding: '1rem 2rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Back to Home
            </button>

            <button
              onClick={handleRestart}
              style={{
                padding: '1rem 2rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                color: 'var(--text)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Retake Survey
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'var(--panel)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '3rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '0.5rem',
          textAlign: 'center'
        }}>
          Colorado AI Compliance Assessment
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--muted)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Step {currentStepIndex + 1} of {surveySteps.length}
        </p>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '8px',
          background: 'var(--border)',
          borderRadius: '4px',
          marginBottom: '2rem',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${((currentStepIndex + 1) / surveySteps.length) * 100}%`,
            height: '100%',
            background: 'var(--primary)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Step title */}
        <div style={{
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid var(--border)'
        }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: '600',
            color: 'var(--text)',
            marginBottom: '0.5rem'
          }}>
            {currentStep.title}
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'var(--muted)'
          }}>
            {currentStep.description}
          </p>
        </div>

        {/* Questions */}
        <div style={{ marginBottom: '2rem' }}>
          {visibleQuestions.map((question, idx) => (
            <div key={question.id} style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '1.125rem',
                fontWeight: '500',
                color: 'var(--text)',
                marginBottom: '1rem'
              }}>
                {question.question}
                {question.required && <span style={{ color: '#ef4444' }}> *</span>}
              </label>

              {/* Single select */}
              {question.type === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {question.options.map(option => {
                    const isSelected = currentStepAnswers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleAnswerChange(question.id, option.value, 'single')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-elev)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '10px',
                          color: 'var(--text)',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          flexShrink: 0
                        }} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Multi select */}
              {question.type === 'multi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {question.options.map(option => {
                    const isSelected = (currentStepAnswers[question.id] || []).includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleAnswerChange(question.id, option.value, 'multi')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem',
                          background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-elev)',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: '10px',
                          color: 'var(--text)',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Text input */}
              {question.type === 'text' && (
                <input
                  type="text"
                  value={currentStepAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, 'text')}
                  placeholder={question.placeholder || ''}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--bg-elev)',
                    border: '2px solid var(--border)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    fontFamily: 'inherit'
                  }}
                />
              )}

              {/* Date input */}
              {question.type === 'date' && (
                <input
                  type="date"
                  value={currentStepAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value, 'date')}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--bg-elev)',
                    border: '2px solid var(--border)',
                    borderRadius: '10px',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    fontFamily: 'inherit'
                  }}
                />
              )}

              {/* Slider */}
              {question.type === 'slider' && (
                <div>
                  <input
                    type="range"
                    min="0"
                    max={question.options.length - 1}
                    value={question.options.findIndex(o => o.value === currentStepAnswers[question.id])}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      handleAnswerChange(question.id, question.options[idx].value, 'slider');
                    }}
                    style={{
                      width: '100%',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: 'var(--muted)'
                  }}>
                    {question.options.map(opt => (
                      <span key={opt.value}>{opt.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)'
        }}>
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              color: 'var(--text)',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentStepIndex === 0 ? 0.4 : 1,
              fontFamily: 'inherit'
            }}
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            style={{
              padding: '0.75rem 1.5rem',
              background: canProceed() ? 'var(--ok)' : 'var(--border)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              opacity: canProceed() ? 1 : 0.6,
              fontFamily: 'inherit'
            }}
          >
            {isLastStep ? 'Get Results →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
