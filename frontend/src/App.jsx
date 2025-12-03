import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./styles.css";
import SurveyPage from "./pages/SurveyPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import DemoPage from "./pages/DemoPage.jsx";
import SharePage from "./pages/SharePage.jsx";
import DocumentationPage from "./pages/DocumentationPage.jsx";

function MainLandingPage() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Top nav */}
      <header className="nav">
        <div className="container nav-row">
          <Link className="brand" to="/">Clarynt</Link>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#evidence">Evidence pack</a>
            <a href="/trust">Trust</a>
            <a className="btn btn-primary" href="#cta">Book intro</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1>Colorado AI Act Compliance Tools</h1>
              <p className="lead">
                Determine your obligations under the Colorado AI Act and generate the documentation you need: impact assessments, risk management programs, and disclosure notices.
              </p>
              <div className="cta-row">
                <Link className="btn btn-primary btn-lg" to="/survey">Risk Calculator</Link>
                <Link className="btn btn-primary btn-lg" to="/documentation">Generate Documentation</Link>
              </div>
              <ul className="trust-bullets">
                <li>Identify if you are a developer, deployer, or both</li>
                <li>Generate CAIA-compliant documentation</li>
                <li>AI assistant to answer compliance questions</li>
              </ul>
            </div>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section className="section">
          <div className="container card-grid">
            <article className="card">
              <h3>Risk Calculator</h3>
              <p>Answer questions about your AI system to determine your classification and obligations under CAIA.</p>
            </article>
            <article className="card">
              <h3>Document Generator</h3>
              <p>Generate impact assessments, risk management programs, and disclosure notices tailored to your role.</p>
            </article>
            <article className="card">
              <h3>AI Assistant</h3>
              <p>Get answers to your Colorado AI Act compliance questions from our AI chatbot.</p>
            </article>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section id="evidence" className="section">
          <div className="container">
            <h2>Documentation Output</h2>
            <div className="card-grid">
              <article className="card">
                <h3>Impact Assessment</h3>
                <p>System purpose, discrimination analysis, known risks, and mitigation strategies.</p>
              </article>
              <article className="card">
                <h3>Risk Management Program</h3>
                <p>Governance structure, monitoring procedures, and accountability measures.</p>
              </article>
              <article className="card">
                <h3>Consumer Disclosures</h3>
                <p>Transparency notices, consumer rights information, and appeals process documentation.</p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section alt">
          <div className="container">
            <h2>How it works</h2>
            <ol className="steps">
              <li><strong>Take the Risk Calculator.</strong> Answer questions about your AI system to determine your CAIA classification.</li>
              <li><strong>Answer documentation questions.</strong> Provide details about your system, governance, and processes.</li>
              <li><strong>Generate and download.</strong> Get your compliance documentation as an editable PDF.</li>
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="section">
          <div className="container cta-box">
            <div>
              <h2>Get started with compliance</h2>
              <p className="muted">Free to use. Determine your obligations and generate documentation today.</p>
            </div>
            <div className="cta-actions">
              <Link className="btn btn-primary" to="/survey">Risk Calculator</Link>
              <Link className="btn btn-ghost" to="/documentation">Generate Documentation</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="brand">Clarynt</div>
            <div className="muted">Colorado AI Act compliance for AI developers and deployers.</div>
          </div>
          <nav className="footer-links">
            <a href="/trust">Trust</a>
            <a href="mailto:security@clarynt.net">Report a security issue</a>
            <a href="mailto:logan42.ld@gmail.com">Contact</a>
          </nav>
        </div>
        <div className="container tiny">© {year} Clarynt.</div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLandingPage />} />
      <Route path="/survey" element={<SurveyPage />} />
      <Route path="/checkup" element={<HomePage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/documentation" element={<DocumentationPage />} />
      <Route path="/share/:shareId" element={<SharePage />} />
    </Routes>
  );
}
