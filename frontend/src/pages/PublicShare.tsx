// src/pages/PublicShare.tsx
import React, { useEffect, useState } from 'react';
import { Container, Paper, Stack, Typography, Divider, Button } from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import { trackOutreachEvent } from '../utils/analytics';

type Doc = {
  model_name: string;
  version: string;
  generated_at: string;
  intended_purpose: string;
  deployment_context: string;
  data_sources: string;
  risk_management: string;
  human_oversight: string;
  performance_metrics: string;
  post_deployment_monitoring: string;
  evidence: { id: string; type: string; name: string }[];
  completeness?: number;
};

export default function PublicShare() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const lead = params.get('lead') || undefined;
  const [title, setTitle] = useState('');
  const [doc, setDoc] = useState<Doc | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/outreach/share/${token}`);
      if (!res.ok) { setTitle('Link expired or not found'); return; }
      const data = await res.json();
      setTitle(data.title);
      setDoc(data.doc);
      trackOutreachEvent('outreach_share_opened', { lead, token });
    })();
  }, [token, lead]);

  if (!doc) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Typography variant="h6">{title || 'Loading...'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            Generated at {doc.generated_at} • Completeness {Math.round((doc.completeness || 0) * 100)}%
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Section label="Model" value={`${doc.model_name} (v${doc.version})`} />
          <Section label="Intended purpose" value={doc.intended_purpose} />
          <Section label="Deployment context" value={doc.deployment_context} />
          <Section label="Data sources & preprocessing" value={doc.data_sources} />
          <Section label="Risk management" value={doc.risk_management} />
          <Section label="Human oversight" value={doc.human_oversight} />
          <Section label="Performance & evaluation" value={doc.performance_metrics} />
          <Section label="Post‑deployment monitoring" value={doc.post_deployment_monitoring} />
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Evidence</Typography>
            {doc.evidence?.map((e) => (
              <Typography key={e.id} variant="body2">[{e.id}] {e.type} — {e.name}</Typography>
            ))}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => window.print()}>Print / Save as PDF</Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      <Typography variant="subtitle1">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
