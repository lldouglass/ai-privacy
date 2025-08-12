import { useEffect, useState } from "react";
import { Stepper, Step, StepLabel } from "@mui/material";
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

  // Debug: confirm props are flowing; remove later
  // console.debug("Wizard render", { active, form, disabled, hasInitial: !!initialData });

  return (
    <>
      <Stepper activeStep={active} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

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
