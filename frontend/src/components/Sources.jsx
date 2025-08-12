import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export default function Sources({ sources = [] }) {
  if (!sources.length) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Sources</Typography>
      {sources.map((s, i) => (
        <Accordion key={i}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              [{s.key}] {s.title} — {s.source}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{s.excerpt}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
