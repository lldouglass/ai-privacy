import { TextField, Button, Box } from "@mui/material";

export default function StepModelMeta(props) {
  const data = props.data ?? props.form ?? {};
  const setData = props.setData ?? props.setForm ?? (() => {});
  const next = props.next ?? (() => {});
  const back = props.back ?? (() => {});
  const disabled = !!props.disabled;

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <input
          type="file"
          accept=".json,.yaml,.yml"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && !/\.(json|ya?ml)$/i.test(f.name)) {
              alert("Please upload .json, .yaml, or .yml file.");
              return;
            }
            setData({ ...data, file: f ?? null });
          }}
        />
      </Box>

      <TextField
        label="Free‑text Notes (Optional)"
        fullWidth
        multiline
        minRows={3}
        value={data?.free_text_notes ?? ""}
        onChange={(e) => setData({ ...data, free_text_notes: e.target.value })}
        disabled={disabled}
      />

      <Box sx={{ mt: 3 }}>
        <Button onClick={back} sx={{ mr: 2 }}>
          Back
        </Button>
        <Button variant="contained" onClick={next}>
          Next
        </Button>
      </Box>
    </>
  );
}
