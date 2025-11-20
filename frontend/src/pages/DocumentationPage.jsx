import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { marked } from "marked";
import DOMPurify from "dompurify";
import html2pdf from "html2pdf.js";
import ComplianceChatbot from "../components/ComplianceChatbot";
import "../styles.css";

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
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [editedMarkdown, setEditedMarkdown] = useState("");
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
        // If we have saved items, we can assume we should show the result view
        // provided we have generated doc content (or we might want to clear it?)
        // But logic for showing result depends on if user has clicked generate.
        // We won't auto-show result unless we persist the report too, which we don't seem to do in the original code (only answers).
      }
    } else {
      // No outcome found, redirect to survey
      navigate('/survey');
    }
  }, [navigate]);

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
      const markdown = docResponse.data.report;
      setGeneratedDoc(markdown);
      setEditedMarkdown(markdown);

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
    setIsDownloading(true);
    try {
      // Parse markdown to HTML
      const rawHtml = marked.parse(editedMarkdown);
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
      
      // Configure html2pdf options
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${outcome}_compliance_documentation.pdf`,
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
    return <div>Loading...</div>;
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
            {isEditing ? (
              <textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
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
                  __html: DOMPurify.sanitize(marked.parse(editedMarkdown))
                }}
              />
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
          />
        </div>
      </div>
    </div>
  );
}

