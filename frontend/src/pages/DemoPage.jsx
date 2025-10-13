import { useEffect, useState } from "react";
import { Box, Alert, Button, Typography } from "@mui/material";
import axios from "axios";
import Wizard from "../components/Wizard.jsx";

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-elev) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
      }}>
        {/* Info Card - What you'll get */}
        <Box sx={{
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700, color: 'var(--text)' }}>
            What you'll get
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2
          }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--text)', mb: 0.5 }}>
                CAIA-compliant documentation
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Structured impact assessment and risk management program.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--text)', mb: 0.5 }}>
                Inline citations
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Each obligation references the Colorado AI Act.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--text)', mb: 0.5 }}>
                Actionable gaps
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Action items to gather missing evidence.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--text)', mb: 0.5 }}>
                Download & share
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                Copy link or export PDF.
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'var(--muted)', fontStyle: 'italic' }}>
            Built for teams who need clear documentation fast.
          </Typography>
        </Box>

        {/* Main Wizard Card */}
        <Box sx={{
          background: 'var(--panel)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: { xs: '2rem', md: '3rem' },
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: 'var(--text)', 
            marginBottom: '0.5rem',
            textAlign: 'center'
          }}>
            Colorado AI Compliance Demo
          </Typography>
          <Typography variant="body1" sx={{ 
            color: 'var(--muted)', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Generate your compliance documentation
          </Typography>

          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Demo mode: HR hiring (resume screener). In Step 2, upload the sample YAML metadata.
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="outlined" 
              href="/api/demo-metadata/hr-yaml" 
              target="_blank" 
              rel="noopener"
              fullWidth
              sx={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}
            >
              Download sample metadata (YAML)
            </Button>
          </Box>

          {/* Interactive demo (not disabled) so metadata upload works */}
          {demo && <Wizard initialData={demo} />}
        </Box>
      </div>
    </div>
  );
}
