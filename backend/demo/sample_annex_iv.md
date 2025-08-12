# Annex IV Technical Documentation — HireAI Resume Screener

## 0. Risk Classification (Guess)
- **Category:** High‑risk — Annex III (employment, workers management and access to self‑employment). [S1]
- **Rationale:**
  - System is used to evaluate candidates for hiring decisions (screening/ranking). [S1]
  - Affects access to employment; requires risk management, documentation, and oversight. [S2][S7]
  - Human decision remains final, but outputs materially influence outcomes.

## 1. General Description
- **Intended purpose:** Analyse CVs / applications and produce a short‑list and rank for recruiters.
- **Users:** Recruiters and hiring managers; admin by HR Ops.
- **Deployment:** Cloud API + web UI; hosted in EU/US regions with data residency controls.
- **Provider/Deployer roles:** Provider: FutureHire Technologies; Deployer: hiring organisation.

## 2. Design, Development & Validation
- **Architecture:** Ingestion → PII masking → feature extraction → model scoring → shortlist → UI explanations.
- **Versioning:** Model registry with lineage; CI for data drift guardrails and bias checks.
- **Validation:** K‑fold CV and hold‑out by role; report AUC/PR by job family; calibration plots kept in technical file.
- **Change management:** All model/config changes ticketed; risk review gates before production.

{{MODEL_META_BLOCK}}

## 3. Data & Data Governance  [S3]
| Source | Type | Personal Data? | Jurisdiction | Notes |
|---|---|---:|---|---|
| Applicant CVs | Text | Yes | EU/US | PII masking + minimisation before features |
| ATS Events | Tabular | Possible | EU/US | Status, timestamps; no sensitive free‑text |
| Historical labels | Tabular | Yes | EU/US | “Hired/Not hired”; balanced across cohorts |

- **Practices:** Data minimisation, quality checks, deduplication, leakage tests; clear retention and deletion tied to ATS IDs. [S3]

## 4. Risk Management System  [S2]
**Risk Register**
| Hazard | Affected | Sev(1‑5) | Likelihood(1‑5) | Rating | Mitigations | Residual |
|---|---|---:|---:|---|---|---|
| Indirect discrimination by education proxy | Candidates | 5 | 2 | High | Remove/weight features; fairness constraints; periodic audits by cohort | Med |
| Over‑reliance (automation bias) | Recruiters | 3 | 3 | Med | UI warnings; require human confirmation; sample review | Low |
| Data drift by role / market change | Candidates | 3 | 2 | Med | Drift monitors; re‑train schedule; shadow eval | Low |
| PII leakage in features | Any | 4 | 1 | Med | PII masking, DLP scanners, redaction | Low |
| Model explanations reveal sensitive attributes | Candidates | 3 | 2 | Med | Explanation filters; no sensitive terms | Low |

- **Residual risk acceptance:** Documented criteria; incidents reviewed in change advisory board.

## 5. Human Oversight  [S5]
- Recruiters must review/approve shortlists; cannot auto‑reject solely by score.
- Escalation path to HR Legal for suspected bias; appeal/override workflow available.

## 6. Technical Robustness & Cybersecurity  [S6]
- Adversarial tests (poisoned CV text, repeated spam entries).
- RBAC; audit logs; encryption in transit/at rest; dependency policy; secrets rotation.
- Fallback behavior: if explanations unavailable, score hidden and manual review required.

## 7. Transparency & Information to Users  [S4]
- Disclosures to internal users: intended purpose, limitations, uncertainty.
- Candidates receive appropriate information about use of automated tools, where applicable; channels for inquiry/appeal.

## 8. Post‑Market Monitoring & Reporting  [S8]
- KPIs: pass‑through disparity (DP), TPR/FPR gaps; calibration drift; appeal rate.
- Serious incident reporting flow, owner and SLA documented.

## 9. Conformity Assessment & Record‑Keeping  [S7]
- As high‑risk, maintain technical file with artifacts index and logs.
- Standards followed (where applicable and actually used); link to DPIA.

## Action Items (Missing Info)
- Upload latest fairness audit CSV (owner: HR Analytics).
- Attach DPIA and records of processing (owner: Privacy).
- Provide user training records for recruiters (owner: HR Ops).
