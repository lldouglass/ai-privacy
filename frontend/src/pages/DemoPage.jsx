import { useEffect, useState } from "react";
import { Grid, Box, Alert, Stack, Button } from "@mui/material";
import axios from "axios";
import Wizard from "../components/Wizard.jsx";
import RightPanel from "../components/RightPanel.jsx";

export default function DemoPage() {
  const [demo, setDemo] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/demo-config");
        setDemo(res.data);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <Grid container spacing={4} alignItems="flex-start">
      <Grid item xs={12} md={9} lg={9} xl={9}>
        <Box sx={{
          background: "#fff", borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.06)",
          p: { xs: 2, md: 4 },
        }}>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <Alert severity="info" sx={{ mb: 2 }}>
            Demo mode: HR hiring (resume screener). In Step 2, upload the sample YAML metadata.
          </Alert>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button variant="outlined" href="/api/demo-metadata/hr-yaml" target="_blank" rel="noopener">
              Download sample metadata (YAML)
            </Button>
          </Stack>

          {/* Interactive demo (not disabled) so metadata upload works */}
          {demo && <Wizard initialData={demo} />}
        </Box>
      </Grid>
      <Grid item xs={12} md={3} lg={3} xl={3}>
        <RightPanel />
      </Grid>
    </Grid>
  );
}
