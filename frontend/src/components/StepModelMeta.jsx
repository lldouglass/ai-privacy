import { TextField, Button, Box } from "@mui/material";

export default function StepModelMeta(props) {
  const data = props.data ?? props.form ?? {};
  const setData = props.setData ?? props.setForm ?? (() => {});
  const next = props.next ?? (() => {});
  const back = props.back ?? (() => {});
  const disabled = !!props.disabled;

  return (
    <>
      <Box sx={{ 
        mb: 2, 
        p: 2, 
        border: '2px dashed var(--border)', 
        borderRadius: '12px',
        backgroundColor: 'var(--bg-elev)',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'var(--primary)',
          backgroundColor: 'rgba(99, 102, 241, 0.05)'
        }
      }}>
        <label style={{
          display: 'block',
          color: 'var(--muted)',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '0.5rem'
        }}>
          Upload Model Metadata (JSON/YAML)
        </label>
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
          style={{
            width: '100%',
            color: 'var(--text)',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
        {data?.file && (
          <Box sx={{ mt: 1, color: 'var(--ok)', fontSize: '0.875rem' }}>
            ✓ {data.file.name}
          </Box>
        )}
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

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={back} variant="outlined">
          &lt; Back
        </Button>
        <Button variant="contained" onClick={next}>
          Next &gt;
        </Button>
      </Box>
    </>
  );
}
