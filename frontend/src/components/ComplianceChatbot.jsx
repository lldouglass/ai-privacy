import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function ComplianceChatbot({ userContext, questions, currentAnswers, onSuggestAnswer }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial setup
  useEffect(() => {
    const initialSuggestions = getInitialSuggestions(userContext?.outcome, questions);
    setSuggestedQuestions(initialSuggestions);

    // Welcome message
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm your documentation assistant. I'll help you answer the compliance questions for **${getOutcomeTitle(userContext?.outcome)}**.\n\nTell me about your AI system and I'll help draft answers, or click on any question below to get specific guidance.`,
      },
    ]);
  }, [userContext?.outcome]);

  const getOutcomeTitle = (outcome) => {
    const titles = {
      outcome1: "Not Subject to the Colorado AI Act",
      outcome2: "Exempt Deployer",
      outcome3: "Not an AI System Under CAIA",
      outcome4: "Not a Developer Under CAIA",
      outcome5: "General AI System with Disclosure Duty",
      outcome6: "Not a Regulated System",
      outcome7: "Developer of High-Risk AI System",
      outcome8: "Deployer of High-Risk AI System",
      outcome9: "Both Developer and Deployer of High-Risk AI System",
    };
    return titles[outcome] || "Unknown Classification";
  };

  const getInitialSuggestions = (outcome, questionsList) => {
    // If we have questions, suggest help with specific ones
    if (questionsList && questionsList.length > 0) {
      return [
        "Describe your AI system so I can help draft answers",
        `Help me with Question 1: ${questionsList[0]?.text?.substring(0, 50)}...`,
        "What information do I need to gather?",
      ];
    }

    // Fallback general suggestions
    if (outcome === "outcome7" || outcome === "outcome9") {
      return [
        "What documentation must I provide to deployers?",
        "What are my notification obligations to the Attorney General?",
        "What is 'reasonable care' for developers?",
      ];
    } else if (outcome === "outcome8" || outcome === "outcome9") {
      return [
        "How often must I conduct impact assessments?",
        "What is required in a risk management program?",
        "What are consumer notification requirements?",
      ];
    } else {
      return [
        "What is a 'consequential decision'?",
        "What is 'algorithmic discrimination'?",
        "When does SB 24-205 take effect?",
      ];
    }
  };

  const sendMessage = async (message, questionContext = null) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/chat/documentation-helper", {
        message,
        context: {
          ...userContext,
          questions: questions,
          currentAnswers: currentAnswers,
          activeQuestionId: questionContext || activeQuestionId,
        },
      });

      // Add assistant response
      const assistantMessage = {
        role: "assistant",
        content: response.data.message,
        suggestedAnswer: response.data.suggested_answer,
        forQuestionId: response.data.for_question_id,
        citations: response.data.citations || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update suggested questions
      if (response.data.suggested_questions) {
        setSuggestedQuestions(response.data.suggested_questions);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Fallback to demo mode response
      const demoResponse = generateDemoResponse(message, questions, userContext?.outcome);
      const assistantMessage = {
        role: "assistant",
        content: demoResponse.message,
        suggestedAnswer: demoResponse.suggested_answer,
        forQuestionId: demoResponse.for_question_id,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo mode response generator
  const generateDemoResponse = (message, questionsList, outcome) => {
    const msgLower = message.toLowerCase();

    // Check if asking about a specific question
    const questionMatch = msgLower.match(/question (\d+)/);
    if (questionMatch && questionsList) {
      const qNum = parseInt(questionMatch[1]) - 1;
      if (qNum >= 0 && qNum < questionsList.length) {
        const q = questionsList[qNum];
        return {
          message: `**Question ${qNum + 1}:** "${q.text}"\n\n**Guidance:** This question is asking about your organization's specific practices. Consider:\n\n• Be specific and concrete\n• Include names, titles, or departments where applicable\n• Reference any existing policies or procedures\n• If you don't have a formal process, describe what you plan to implement\n\nWould you like me to help draft an answer? Just describe your current approach.`,
          for_question_id: q.id,
        };
      }
    }

    // Check if describing an AI system
    if (msgLower.includes("ai") || msgLower.includes("system") || msgLower.includes("we use") || msgLower.includes("our")) {
      let suggestedAnswers = {};

      // Try to extract info for Q1 and Q2 based on description
      if (questionsList && questionsList.length >= 2) {
        suggestedAnswers = {
          message: `Based on your description, I can help draft some answers:\n\n**For Question 1 (Purpose/Uses):**\nI'll need to know:\n• What decisions does the AI help make?\n• Who are the intended users?\n• Are there any uses you want to explicitly prohibit?\n\n**For Question 2 (Specific Purpose & Outputs):**\n• What outputs does the system produce (scores, classifications, recommendations)?\n• What benefits do you expect from using this system?\n\nTell me more about these aspects and I'll draft specific language.`,
        };
      }

      return suggestedAnswers;
    }

    // General help
    return {
      message: `I can help you fill out the compliance documentation. Here's what I can do:\n\n• **Describe your AI system** - Tell me what it does and I'll help draft answers\n• **Ask about a specific question** - Say "help with question 3" and I'll explain what's needed\n• **Get guidance** - Ask about Colorado AI Act requirements\n\nWhat would you like help with?`,
    };
  };

  const handleSend = () => {
    sendMessage(inputValue);
  };

  const handleSuggestedClick = (question) => {
    sendMessage(question);
  };

  const handleQuestionClick = (questionId, questionIndex) => {
    setActiveQuestionId(questionId);
    sendMessage(`Help me with Question ${questionIndex + 1}`, questionId);
  };

  const handleUseAnswer = (answer, questionId) => {
    if (onSuggestAnswer && questionId) {
      onSuggestAnswer(questionId, answer);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I've added the suggested answer to the form. Feel free to edit it to better match your specific situation.",
        },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--panel)",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.25rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>🤖</span>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "700",
              color: "var(--text)",
              margin: 0,
            }}
          >
            Documentation Assistant
          </h3>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--muted)",
            margin: 0,
          }}
        >
          Describe your AI system and I'll help fill out the questions
        </p>
      </div>

      {/* Question shortcuts - show if questions exist */}
      {questions && questions.length > 0 && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {questions.slice(0, 6).map((q, idx) => (
              <button
                key={q.id}
                onClick={() => handleQuestionClick(q.id, idx)}
                disabled={isLoading}
                style={{
                  padding: "0.375rem 0.75rem",
                  background: activeQuestionId === q.id ? "var(--primary)" : "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  color: activeQuestionId === q.id ? "#fff" : "var(--text)",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
              >
                Q{idx + 1}
              </button>
            ))}
            {questions.length > 6 && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", padding: "0.375rem" }}>
                +{questions.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "90%",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                background:
                  msg.role === "user"
                    ? "var(--primary)"
                    : "var(--bg-elev)",
                color: msg.role === "user" ? "#fff" : "var(--text)",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}

              {/* Show "Use this answer" button if there's a suggested answer */}
              {msg.suggestedAnswer && msg.forQuestionId && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      background: "var(--panel)",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      marginBottom: "0.5rem",
                      fontSize: "0.8rem",
                      color: "var(--text)",
                    }}
                  >
                    <strong>Suggested answer:</strong>
                    <div style={{ marginTop: "0.5rem" }}>{msg.suggestedAnswer}</div>
                  </div>
                  <button
                    onClick={() => handleUseAnswer(msg.suggestedAnswer, msg.forQuestionId)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "var(--ok)",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Use this answer
                  </button>
                </div>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "0.7rem",
                    opacity: 0.8,
                  }}
                >
                  <strong>Sources:</strong>
                  {msg.citations.map((citation, i) => (
                    <div key={i} style={{ marginTop: "0.25rem" }}>
                      • {citation.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--muted)",
              fontSize: "0.875rem",
            }}
          >
            <div className="loading-dots">●●●</div>
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length <= 2 && (
        <div
          style={{
            padding: "0.5rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            Try:
          </p>
          {suggestedQuestions.slice(0, 3).map((question, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestedClick(question)}
              disabled={isLoading}
              style={{
                padding: "0.5rem 0.75rem",
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "0.75rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.background = "var(--primary)";
                  e.target.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "var(--bg-elev)";
                e.target.style.color = "var(--text)";
              }}
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your AI system or ask for help..."
            disabled={isLoading}
            rows={2}
            style={{
              flex: 1,
              padding: "0.625rem",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              resize: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            style={{
              padding: "0.625rem 1rem",
              background:
                isLoading || !inputValue.trim()
                  ? "var(--border)"
                  : "var(--primary)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor:
                isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
