import { useEffect, useState } from "react";
import StepGeneral from "./StepGeneral.jsx";
import StepModelMeta from "./StepModelMeta.jsx";
import StepRisk from "./StepRisk.jsx";
import Result from "./Result.jsx";

const steps = ["General", "Model Meta", "Risk Notes", "Result"];

export default function Wizard({ initialData = null, disabled = false }) {
  const [active, setActive] = useState(0);
  const [form, setForm] = useState({
    system_name: "",
    intended_purpose: "",
    use_case: "",
    risk_notes: "",
    free_text_notes: "",
    ephemeral: false,
    file: null,
  });

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...initialData, file: null }));
      setActive(0);
    }
  }, [initialData]);

  const next = () => setActive((p) => Math.min(p + 1, 3));
  const back = () => setActive((p) => Math.max(p - 1, 0));

  return (
    <>
      {/* Progress indicator with horizontal bars */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        justifyContent: 'center'
      }}>
        {steps.map((step, idx) => (
          <div
            key={step}
            style={{
              flex: 1,
              height: '4px',
              background: idx <= active ? 'var(--primary)' : 'var(--border)',
              borderRadius: '2px',
              transition: 'background 0.3s ease'
            }}
          />
        ))}
      </div>

      {/* Step labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}>
        <span style={{
          color: 'var(--muted)',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Step {active + 1} of {steps.length}: {steps[active]}
        </span>
      </div>

      {active === 0 && (
        <StepGeneral data={form} setData={setForm} next={next} disabled={disabled} />
      )}
      {active === 1 && (
        <StepModelMeta data={form} setData={setForm} next={next} back={back} disabled={disabled} />
      )}
      {active === 2 && (
        <StepRisk data={form} setData={setForm} next={next} back={back} disabled={disabled} />
      )}
      {active === 3 && <Result data={form} back={back} />}
    </>
  );
}
