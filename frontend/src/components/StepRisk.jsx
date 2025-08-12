import { TextField, Button, Box } from "@mui/material";

export default function StepRisk(props) {
  const data = props.data ?? props.form ?? {};
  const setData = props.setData ?? props.setForm ?? (() => {});
  const next = props.next ?? (() => {});
  const back = props.back ?? (() => {});
  const disabled = !!props.disabled;

  return (
    <>
      <TextField
        label="Known / Suspected Risks"
        fullWidth
        multiline
        minRows={4}
        value={data?.risk_notes ?? ""}
        onChange={(e) => setData({ ...data, risk_notes: e.target.value })}
        disabled={disabled}
      />
      <Box sx={{ mt: 3 }}>
        <Button onClick={back} sx={{ mr: 2 }}>
          Back
        </Button>
        <Button variant="contained" onClick={next}>
          Generate Report
        </Button>
      </Box>
    </>
  );
}
