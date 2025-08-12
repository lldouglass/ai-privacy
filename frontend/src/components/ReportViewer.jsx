import React, { useMemo } from "react";
import { Paper, Box, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Markdown → HTML using 'marked' + DOMPurify.
 * This avoids the react-markdown/remark pipeline that was crashing.
 */
export default function ReportViewer({ markdown = "", tokenInfo }) {
  const html = useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: false,
        headerIds: true,
        mangle: false, // keep headings readable
      });
      const raw = marked.parse(markdown || "");
      const safe = DOMPurify.sanitize(raw, { ADD_ATTR: ["target", "rel"] });
      return safe;
    } catch (e) {
      console.error("Markdown render error:", e);
      return "<p>Failed to render markdown.</p>";
    }
  }, [markdown]);

  return (
    <Box sx={{ mt: 1 }}>
      {tokenInfo && (
        <Typography variant="caption" sx={{ float: "right", opacity: 0.75 }}>
          Tokens: {tokenInfo.total_tokens ?? "—"} · Cost: ${tokenInfo.cost ?? "—"}
        </Typography>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <div
          className="markdown-body"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              View raw markdown
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ whiteSpace: "pre-wrap" }}>{markdown}</pre>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  );
}
