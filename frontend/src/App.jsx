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
              <h1>EU AI Act evidence, ready in 3&nbsp;weeks</h1>
              <p className="lead">
                We help small and mid‑size AI teams produce the few documents customers actually ask for—model
                cards, data inventories, and logging/transparency notes—without production access.
              </p>
              <div className="cta-row">
                <a className="btn btn-primary" href="/checkup">Start readiness check</a>
                <a className="btn btn-ghost" href="#cta">Book intro</a>
              </div>
              <ul className="trust-bullets">
                <li>Redacted / synthetic data by default</li>
                <li>No production access required</li>
                <li>Deletion on request</li>
                <li><a href="/trust">Sub‑processors &amp; data handling</a></li>
              </ul>
            </div>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section id="evidence" className="section">
          <div className="container">
            <h2>What you get</h2>
            <div className="card-grid">
              <article className="card">
                <h3>Model Card</h3>
                <p>Design intent, data sources, limitations, risks, and mitigations—written for buyers and auditors.</p>
              </article>
              <article className="card">
                <h3>Data Inventory</h3>
                <p>Systems, vendors, retention, locations, DPIA‑friendly mapping. Easy to keep current.</p>
              </article>
              <article className="card">
                <h3>Logging &amp; Transparency</h3>
                <p>Minimal set of logs and disclosures aligned to the Act and customer questionnaires.</p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section alt">
          <div className="container">
            <h2>How it works</h2>
            <ol className="steps">
              <li><strong>Kickoff (15–25 min).</strong> Map systems &amp; vendors; agree the 3 artifacts.</li>
              <li><strong>Draft &amp; review.</strong> We draft from redacted/synthetic inputs; you review in‑line.</li>
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
              {/* Replace with Calendly when ready */}
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
