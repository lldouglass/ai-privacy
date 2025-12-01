import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SpeedIcon from '@mui/icons-material/Speed';
import GavelIcon from '@mui/icons-material/Gavel';
import DescriptionIcon from '@mui/icons-material/Description';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ShieldIcon from '@mui/icons-material/Shield';
import UpdateIcon from '@mui/icons-material/Update';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
          <div className="container hero-centered">
            <h1 className="text-center">
              <span className="text-gradient">Colorado AI Act Compliance</span>, Simplified.
            </h1>
            <p className="lead text-center">
              Generate buyer-ready evidence in <strong>3 weeks</strong>. Impact assessments, risk docs, and transparency disclosures—without touching production.
            </p>

            <div className="cta-row">
              <Link className="btn btn-primary btn-lg" to="/documentation">Get Started</Link>
              <Link className="btn btn-ghost btn-lg" to="/survey">Risk Calculator</Link>
            </div>

            <div className="trust-badges-row">
              <div className="trust-badge">
                <GavelIcon /> Built for Colorado
              </div>
              <div className="trust-badge">
                <VerifiedUserIcon /> No Prod Access
              </div>
              <div className="trust-badge">
                <DescriptionIcon /> Sub-processors Mapped
              </div>
              <div className="trust-badge">
                <SpeedIcon /> Deal Unblocker
              </div>
            </div>
          </div>
        </section>

        {/* VALUE PROPS */}
        <section className="section">
          <div className="container card-grid">
            <article className="card text-center">
              <div className="feature-icon-wrapper">
                <HandshakeIcon />
              </div>
              <h3>Unblock deals</h3>
              <p>Answer security & compliance questionnaires with a concise, shareable evidence pack.</p>
            </article>
            <article className="card text-center">
              <div className="feature-icon-wrapper">
                <ShieldIcon />
              </div>
              <h3>Reduce risk</h3>
              <p>Impact assessments and risk management programs aligned to Colorado AI Act requirements.</p>
            </article>
            <article className="card text-center">
              <div className="feature-icon-wrapper">
                <UpdateIcon />
              </div>
              <h3>Stay current</h3>
              <p>Simple templates you can maintain as your models, vendors, or configs change.</p>
            </article>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section id="evidence" className="section">
          <div className="container">
            <h2 className="text-center">What you get</h2>
            <div className="card-grid">
              <article className="card text-center">
                <div className="feature-icon-wrapper">
                  <AssessmentIcon />
                </div>
                <h3>Impact Assessment</h3>
                <p>Purpose, discrimination analysis, known risks, and mitigation strategies for Colorado compliance.</p>
              </article>
              <article className="card text-center">
                <div className="feature-icon-wrapper">
                  <SecurityIcon />
                </div>
                <h3>Risk Management Program</h3>
                <p>Systems, vendors, retention, locations, and lawful basis. DPIA-friendly.</p>
              </article>
              <article className="card text-center">
                <div className="feature-icon-wrapper">
                  <VisibilityIcon />
                </div>
                <h3>Disclosures and Consumer Rights</h3>
                <p>Transparency notices, consumer rights docs, and appeals process mapped to CAIA requirements.</p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section alt">
          <div className="container">
            <h2 className="text-center">How it works</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Kickoff</h3>
                <p>Map systems and vendors, agree on scope. (15-25 min)</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Draft and review</h3>
                <p>We draft from redacted inputs, you review inline.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Hand-off</h3>
                <p>Final docs plus a 1-page summary to share with customers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="section">
          <div className="container cta-box">
            <div>
              <h2>Hold a pilot slot this month</h2>
              <p className="muted">Free 3-week pilot for SMB AI teams. NDA available, no production access required.</p>
            </div>
            <div className="cta-actions">
              <a
                className="btn btn-primary"
                href="mailto:logan42.ld@gmail.com?subject=Clarynt%20pilot%20intro&body=We%27d%20like%20to%20book%20a%2025-min%20intro.%20Our%20company%20is%20..."
              >
                Book intro
              </a>
              <Link className="btn btn-ghost" to="/survey">Risk Calculator</Link>
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
