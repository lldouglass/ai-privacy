import React from "react";
import "./styles.css";

export default function App() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Top nav */}
      <header className="nav">
        <div className="container nav-row">
          <a className="brand" href="/">Clarynt</a>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#evidence">Evidence pack</a>
            <a href="/trust">Trust</a>
            <a href="/demo">Demo</a>
            <a className="btn btn-primary" href="#cta">Book intro</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1>EU AI Act compliance, minus the busywork</h1>
              <p className="lead">
                Clarynt produces the <strong>buyer‑ready evidence</strong> your customers and auditors ask for:
                model cards, a data inventory, and logging/transparency notes—delivered in <strong>3 weeks</strong>,
                using <strong>redacted or synthetic data</strong> (no production access required).
              </p>
              <div className="cta-row">
                <a className="btn btn-primary" href="/checkup">Run readiness check</a>
                <a className="btn btn-ghost" href="/demo">See live demo</a>
              </div>
              <ul className="trust-bullets">
                <li>Built for SMB/Mid‑market AI vendors</li>
                <li>Map to EU AI Act & GDPR evidence</li>
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
              <p>Lightweight logging and disclosures aligned to EU AI Act obligations and GDPR.</p>
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
                <h3>Model Card</h3>
                <p>Purpose, data sources, limitations, risks, and mitigations—written for buyers and auditors.</p>
              </article>
              <article className="card">
                <h3>Data Inventory</h3>
                <p>Systems, vendors, retention, locations, and lawful basis—DPIA‑friendly.</p>
              </article>
              <article className="card">
                <h3>Logging &amp; Transparency</h3>
                <p>Minimal logs and disclosures mapped to customer questionnaires and the Act.</p>
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
              <a className="btn btn-ghost" href="/checkup">Run readiness check</a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="brand">Clarynt</div>
            <div className="muted">EU‑AI‑Act evidence for SMB AI vendors.</div>
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
