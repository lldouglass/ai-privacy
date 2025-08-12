import { Paper, Box, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function RightPanel() {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>What you’ll get</Typography>
      <List dense>
        <ListItem><ListItemText primary="Annex IV‑style documentation" secondary="Structured sections for counsel/auditors." /></ListItem>
        <ListItem><ListItemText primary="Inline citations" secondary="Each obligation references the EU AI Act." /></ListItem>
        <ListItem><ListItemText primary="Actionable gaps" secondary="Action items to gather missing evidence." /></ListItem>
        <ListItem><ListItemText primary="Download & share" secondary="Copy link or export PDF." /></ListItem>
      </List>
      <Box sx={{ mt: 2, fontSize: 12, opacity: 0.7 }}>Built for teams who need clear documentation fast.</Box>
    </Paper>
  );
}
