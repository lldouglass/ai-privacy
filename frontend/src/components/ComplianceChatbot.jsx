import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function ComplianceChatbot({ userContext }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial suggested questions
  useEffect(() => {
    const initialQuestions = getInitialSuggestions(userContext?.outcome);
    setSuggestedQuestions(initialQuestions);

    // Welcome message
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm your Colorado AI Act compliance assistant. I can help you understand SB 24-205 requirements specific to your classification: **${getOutcomeTitle(userContext?.outcome)}**.\n\nAsk me anything about your obligations!`,
      },
    ]);
  }, [userContext]);

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

  const getInitialSuggestions = (outcome) => {
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

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/chat/compliance-assistant", {
        message,
        context: userContext,
      });

      // Add assistant response
      const assistantMessage = {
        role: "assistant",
        content: response.data.message,
        citations: response.data.citations || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update suggested questions
      if (response.data.suggested_questions) {
        setSuggestedQuestions(response.data.suggested_questions);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = {
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please try again or rephrase your question.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(inputValue);
  };

  const handleSuggestedClick = (question) => {
    sendMessage(question);
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
          padding: "1.5rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>💬</span>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "700",
              color: "var(--text)",
              margin: 0,
            }}
          >
            AI Compliance Assistant
          </h3>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--muted)",
            margin: 0,
          }}
        >
          Ask me about SB 24-205 requirements
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
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
                maxWidth: "85%",
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
              {msg.citations && msg.citations.length > 0 && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    fontSize: "0.75rem",
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
      {suggestedQuestions.length > 0 && messages.length <= 1 && (
        <div
          style={{
            padding: "0 1.5rem 1rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            Suggested questions:
          </p>
          {suggestedQuestions.map((question, idx) => (
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
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-elev)",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your compliance obligations..."
            disabled={isLoading}
            rows={2}
            style={{
              flex: 1,
              padding: "0.75rem",
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
              padding: "0.75rem 1.5rem",
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
