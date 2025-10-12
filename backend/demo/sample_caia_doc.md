# CAIA Compliance Documentation — HireAI Resume Screener

## 0. High-Risk Classification Determination
- **Category:** High‑risk AI system under CAIA § 6-1-1701(9)(a) — makes consequential decisions in employment.
- **Rationale:**
  - System substantially influences hiring decisions by screening and ranking candidates. [S1]
  - Affects provision or denial of employment opportunities; material impact on applicants. [S2]
  - Deployer must conduct impact assessments and maintain risk management program. [S7]
  - Human review remains final decision-maker, but AI outputs materially influence outcomes.

## 1. General Description & Intended Use
- **Intended purpose:** Analyze CVs and applications to produce candidate shortlists and rankings for recruiters.
- **Users:** Recruiters and hiring managers; administered by HR Operations.
- **Deployment context:** Cloud-based API with web UI; hosted in Colorado-compliant data centers.
- **Developer/Deployer roles:** Developer: FutureHire Technologies; Deployer: hiring organization conducting business in Colorado.
- **Scope:** Applies to high-risk AI systems deployed in Colorado affecting employment decisions.

## 2. Impact Assessment
**Purpose & Beneficiaries:** Assist recruiters in identifying qualified candidates; benefits hiring organizations and applicants by reducing review time.

**Known or Foreseeable Risks of Algorithmic Discrimination** [S3]
| Risk | Affected Parties | Likelihood | Severity | Protected Class Impact |
|---|---|---:|---:|---|
| Indirect discrimination via education proxy | Applicants | Medium | High | Race, ethnicity, national origin |
| Employment gap bias | Applicants | Medium | High | Sex (pregnancy/caregiving), disability |
| Geographic bias in training data | Applicants | Low | Medium | Race, ethnicity |
| Language processing bias in CV parsing | Applicants | Medium | Medium | National origin, race |

**Summary of Impact Assessment:**
- System trained on historical hiring data with fairness constraints applied.
- Regular bias testing across protected characteristics required.
- Mitigation measures include feature selection review, fairness metrics monitoring, and human oversight.
- Statement available to deployer explaining purpose, limitations, and known risks.

{{MODEL_META_BLOCK}}

## 3. Risk Management Program  [S2]
**Duty of Care:** Developer and deployer exercise reasonable care to protect consumers from known or reasonably foreseeable risks of algorithmic discrimination.

**Risk Management Policy:**
- Identification: Ongoing fairness audits, disparate impact testing, user feedback review.
- Mitigation: Remove/reweight biased features; apply fairness constraints; maintain human-in-the-loop.
- Testing: Pre-deployment validation across demographic cohorts; shadow mode evaluation.
- Post-deployment: Quarterly fairness audits; drift monitoring; incident reporting.

**Risk Register**
| Hazard | Mitigation | Owner | Residual Risk |
|---|---|---|---|
| Algorithmic discrimination by education | Feature review; fairness constraints; cohort audits | Data Science | Medium |
| Automation bias (over-reliance) | UI warnings; mandatory human review; training | Product | Low |
| Model drift by geography/role | Drift monitors; retraining schedule; performance tracking | ML Ops | Low |
| Sensitive attribute leakage | PII masking; explanation filters; DLP scanning | Engineering | Low |

**Rebuttable Presumption:** Deployer maintains presumption of reasonable care by complying with CAIA requirements and implementing risk management program aligned with NIST AI RMF.

## 4. Data Governance & Sources  [S4]
| Source | Type | Sensitive Data? | Retention | Notes |
|---|---|---:|---|---|
| Applicant CVs | Text | Yes | 90 days post-decision | PII masked before feature extraction |
| ATS Events | Tabular | Limited | 1 year | Timestamps, status; no sensitive free-text |
| Historical labels | Tabular | Yes | 3 years | Hire/no-hire; balanced across demographics |

**Data Practices:**
- Data minimization and quality checks applied to reduce discrimination risks.
- Clear retention policies tied to business need and legal requirements.
- Training data reviewed for representation across protected classes.
- Lineage tracking for all datasets used in model development.

## 5. Human Oversight & Review  [S5]
**Meaningful Human Review:**
- Recruiters must review and approve all shortlists; cannot auto-reject based solely on AI score.
- Override mechanism available for recruiters to adjust rankings with documented rationale.
- Escalation path to HR Legal for suspected bias or algorithmic discrimination concerns.

**Training:** Recruiters trained on system limitations, bias risks, and proper use of AI-generated recommendations.

## 6. Testing, Validation & Performance Metrics  [S6]
**Validation Approach:**
- K-fold cross-validation and hold-out testing by job family and geographic region.
- Fairness metrics: demographic parity, equalized odds, calibration by protected class.
- Performance metrics: AUC, precision-recall by role; tracked in model registry.

**Standards Compliance:**
- Testing procedures aligned with NIST AI RMF for trustworthy AI systems.
- Documentation maintained for technical file and Attorney General review if requested.

## 7. Consumer Disclosures & Rights  [S7]
**Transparency to Consumers:**
- Applicants informed that AI system is used in screening process (unless obvious).
- If adverse decision made: deployer provides statement of reasons, opportunity to correct information, and right to appeal for human review.

**Disclosures to Internal Users:**
- Recruiters receive documentation of intended purpose, limitations, known risks, and uncertainty measures.
- Information on how to identify and report potential algorithmic discrimination.

**Consumer Rights Implementation:**
- Appeal process documented with clear timeframes and review procedures.
- Mechanism for applicants to access and correct personal data used in decision-making.

## 8. Post‑Deployment Monitoring  [S8]
**Key Performance Indicators:**
- Disparate impact ratios (demographic parity) across protected classes
- True positive rate / false positive rate gaps by demographic group
- Calibration metrics by cohort; prediction-outcome alignment
- Appeal rate and outcomes by demographic group

**Incident Response:**
- Serious incidents of algorithmic discrimination reported to deployer's compliance team.
- Root cause analysis and corrective action plan documented.
- Attorney General notification procedures established per CAIA enforcement requirements.

## 9. Documentation & Record‑Keeping  [S9]
**Technical Documentation:** Maintained for 3 years post-deployment; includes:
- Impact assessment and supporting materials
- Risk management program documentation
- Testing and validation results
- Data governance and lineage records
- Consumer disclosure templates
- Training materials for human reviewers

**Availability to Attorney General:**
- Documentation provided within 90 days upon request per CAIA § 6-1-1702(7), 6-1-1703(9).
- Trade secrets and security-sensitive information may be withheld with documented basis.
- Colorado Open Records Act exemption applies to disclosures to AG.

## Action Items (Missing Info)
- Finalize impact assessment with deployer input on deployment context (owner: Compliance).
- Complete Q4 fairness audit with demographic breakdown (owner: Data Science).
- Document consumer rights appeal process and train support team (owner: HR Operations).
- Obtain NIST AI RMF alignment documentation for affirmative defense (owner: Legal).
- Update privacy notice with CAIA-required AI disclosures (owner: Privacy).
