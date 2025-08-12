import { TextField, Button, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";

export default function StepGeneral(props) {
  const data = props.data ?? props.form ?? {};
  const setData = props.setData ?? props.setForm ?? (() => {});
  const next = props.next ?? (() => {});
  const disabled = !!props.disabled;

  const [touched, setTouched] = useState(false);

  const systemName = data?.system_name ?? "";
  const intended = data?.intended_purpose ?? "";
  const useCase = data?.use_case ?? "";

  const hasErrors = !systemName.trim() || !intended.trim() || !useCase.trim();

  return (
    <>
      <TextField
        label="AI System Name"
        required
        fullWidth
        sx={{ mb: 2 }}
        value={systemName}
        onChange={(e) => setData({ ...data, system_name: e.target.value })}
        error={touched && !systemName}
        helperText={touched && !systemName ? "Required" : ""}
        disabled={disabled}
      />
      <TextField
        label="Intended Purpose"
        required
        fullWidth
        multiline
        minRows={2}
        sx={{ mb: 2 }}
        value={intended}
        onChange={(e) => setData({ ...data, intended_purpose: e.target.value })}
        error={touched && !intended}
        helperText={touched && !intended ? "Required" : "e.g., prioritize applicants by job fit"}
        disabled={disabled}
      />
      <TextField
        label="Use‑Case Category"
        required
        fullWidth
        value={useCase}
        onChange={(e) => setData({ ...data, use_case: e.target.value })}
        error={touched && !useCase}
        helperText={touched && !useCase ? "Required" : "e.g., HR hiring / sales enablement"}
        disabled={disabled}
      />
      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Switch
            checked={!!data?.ephemeral}
            onChange={(e) => setData({ ...data, ephemeral: e.target.checked })}
            disabled={disabled}
          />
        }
        label="Don't store this run (ephemeral)"
      />

      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={() => {
          setTouched(true);
          if (!hasErrors) next();
        }}
      >
        Next
      </Button>
    </>
  );
}
