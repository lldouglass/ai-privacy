import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./styles.css";
import SurveyPage from "./pages/SurveyPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import DemoPage from "./pages/DemoPage.jsx";
import SharePage from "./pages/SharePage.jsx";

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
            <Link to="/demo">Demo</Link>
            <a className="btn btn-primary" href="#cta">Book intro</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1>Colorado AI Act compliance, minus the busywork</h1>
              <p className="lead">
                Clarynt produces the <strong>buyer‑ready evidence</strong> your customers and auditors ask for:
                impact assessments, risk management documentation, and transparency disclosures—delivered in <strong>3 weeks</strong>,
                using <strong>redacted or synthetic data</strong> (no production access required).
              </p>
              <div className="cta-row">
                <Link className="btn btn-primary" to="/survey">Run readiness check</Link>
                <Link className="btn btn-ghost" to="/demo">See live demo</Link>
              </div>
              <ul className="trust-bullets">
                <li>Built for AI developers & deployers in Colorado</li>
                <li>Map to Colorado AI Act compliance requirements</li>
                <li>No production access • deletion on request</li>
                <li><a href="/trust">Sub‑processors &amp; data handling</a></li>
              </ul>
            </div>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section className="section">
          <div className="container card-grid">
            <article className="card">
              <h3>Unblock deals</h3>
              <p>Answer security & compliance questionnaires with a concise, shareable evidence pack.</p>
            </article>
            <article className="card">
              <h3>Reduce risk</h3>
              <p>Impact assessments and risk management programs aligned to Colorado AI Act requirements.</p>
            </article>
            <article className="card">
              <h3>Stay current</h3>
              <p>Simple templates you can maintain as your models, vendors, or configs change.</p>
            </article>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section id="evidence" className="section">
          <div className="container">
            <h2>What you get</h2>
            <div className="card-grid">
              <article className="card">
                <h3>Impact Assessment</h3>
                <p>Purpose, algorithmic discrimination analysis, known risks, and mitigation strategies—written for Colorado compliance.</p>
              </article>
              <article className="card">
                <h3>Risk Management Program</h3>
                <p>Systems, vendors, retention, locations, and lawful basis—DPIA‑friendly.</p>
              </article>
              <article className="card">
                <h3>Disclosures &amp; Consumer Rights</h3>
                <p>Transparency notices, consumer rights documentation, and appeals process mapped to CAIA requirements.</p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section alt">
          <div className="container">
            <h2>How it works</h2>
            <ol className="steps">
              <li><strong>Kickoff (15–25 min).</strong> Map systems &amp; vendors; agree scope.</li>
              <li><strong>Draft &amp; review.</strong> We draft from redacted/synthetic inputs; you review inline.</li>
              <li><strong>Hand‑off.</strong> Final docs + a 1‑page summary you can share with customers.</li>
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="section">
          <div className="container cta-box">
            <div>
              <h2>Hold a pilot slot this month</h2>
              <p className="muted">Free 3‑week pilot for SMB AI teams. NDA + no production access required.</p>
            </div>
            <div className="cta-actions">
              <a
                className="btn btn-primary"
                href="mailto:logan42.ld@gmail.com?subject=Clarynt%20pilot%20intro&body=We%27d%20like%20to%20book%20a%2025-min%20intro.%20Our%20company%20is%20..."
              >
                Book intro
              </a>
              <Link className="btn btn-ghost" to="/survey">Run readiness check</Link>
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
      <Route path="/share/:shareId" element={<SharePage />} />
    </Routes>
  );
}
