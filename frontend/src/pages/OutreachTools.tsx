// src/pages/OutreachTools.tsx
import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';

function copy(text: string) {
  navigator.clipboard.writeText(text);
  alert('Copied: ' + text);
}

export default function OutreachTools() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  const [inviteUrl, setInviteUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    localStorage.setItem('adminKey', adminKey);
  }, [adminKey]);

  async function makeInvite() {
    const res = await fetch('/api/outreach/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ max_uses: 3, days_valid: 14 })
    });
    if (!res.ok) { alert('Failed: ' + res.statusText); return; }
    const data = await res.json();
    setInviteUrl(data.invite_url);
  }

  async function makeShare() {
    const res = await fetch('/api/outreach/share-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ days_valid: 30 })
    });
    if (!res.ok) { alert('Failed: ' + res.statusText); return; }
    const data = await res.json();
    setShareUrl(data.share_url);
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h6">Outreach Tools (Admin)</Typography>
          <TextField label="X-Admin-Key" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} fullWidth />
          <Box>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={makeShare}>Create Public Sample Link</Button>
              {shareUrl && <Button variant="outlined" onClick={() => copy(shareUrl)}>Copy Sample Link</Button>}
            </Stack>
            {shareUrl && <Typography variant="body2" sx={{ mt: 1 }}>{shareUrl}</Typography>}
          </Box>
          <Box>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={makeInvite}>Create Invite Link</Button>
              {inviteUrl && <Button variant="outlined" onClick={() => copy(inviteUrl)}>Copy Invite Link</Button>}
            </Stack>
            {inviteUrl && <Typography variant="body2" sx={{ mt: 1 }}>{inviteUrl}</Typography>}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Paste these links into your outreach emails. The public sample opens without login; the invite link
            lets prospects create an account immediately (within the validity window).
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
