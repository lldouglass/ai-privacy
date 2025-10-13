import { useRef, useState } from "react";
import {
  Button, CircularProgress, Typography, Stack, Snackbar, Alert,
  IconButton, Tooltip, Box, LinearProgress
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import axios from "axios";
import ReportViewer from "./ReportViewer.jsx";
import Sources from "./Sources.jsx";

const INVITE = import.meta.env.VITE_INVITE_TOKEN || null;

// ------- Completeness helpers -------
const SECTION_TITLES = [
  "0. High-Risk Classification Determination",
  "1. General Description & Intended Use",
  "2. Impact Assessment",
  "3. Risk Management Program",
  "4. Data Governance & Sources",
  "5. Human Oversight & Review",
  "6. Testing, Validation & Performance Metrics",
  "7. Consumer Disclosures & Rights",
  "8. Post‑Deployment Monitoring",
  "9. Documentation & Record‑Keeping",
  "Action Items (Missing Info)",
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function computeCompleteness(md) {
  const map = {};
  let complete = 0;
  for (const title of SECTION_TITLES) {
    const headerRe = new RegExp(`^##\\s*${esc(title)}\\s*$`, "mi");
    const m = md.match(headerRe);
    if (!m) { map[title] = { present: false, good: false }; continue; }
    const start = md.indexOf(m[0]) + m[0].length;
    const after = md.slice(start);
    const next = after.search(/^##\s/m);
    const content = (next === -1 ? after : after.slice(0, next)).trim();
    const bullets = (content.match(/^\s*[-*]\s+/gm) || []).length;
    const hasTable = content.includes("|");
    const chars = content.replace(/\s+/g, " ").length;
    const good = chars >= 160 || bullets >= 3 || hasTable;
    map[title] = { present: true, good, bullets, chars, hasTable };
    if (good) complete += 1;
  }
  const percent = Math.round((complete / SECTION_TITLES.length) * 100);
  return { percent, complete, total: SECTION_TITLES.length, map };
}

// Dynamically load the html2pdf UMD bundle and return window.html2pdf if present
async function ensureHtml2Pdf() {
  if (window.html2pdf) return window.html2pdf;
  try {
    await import("html2pdf.js/dist/html2pdf.bundle.min.js"); // attaches to window
  } catch (e) {
    console.warn("html2pdf UMD import failed:", e);
  }
  return window.html2pdf || null;
}

// Fallback: jsPDF + html2canvas (rasterized pages)
async function fallbackPdf(element, filename) {
  try {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
    return true;
  } catch (e) {
    console.error("Fallback PDF failed:", e);
    return false;
  }
}

export default function Result({ data, back }) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [sources, setSources] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [completeness, setCompleteness] = useState(null);

  const pdfRef = useRef(null);
  const notify = (m, s = "success") => setSnack({ open: true, message: m, severity: s });
  const commonHeaders = INVITE ? { "X-Invite-Token": INVITE } : {};

  const generate = async () => {
    setLoading(true);
    try {
      let res;
      if (data.file) {
        const fd = new FormData();
        fd.append("file", data.file);
        fd.append("system_name", data.system_name || "");
        fd.append("intended_purpose", data.intended_purpose || "");
        fd.append("use_case", data.use_case || "");
        fd.append("risk_notes", data.risk_notes || "");
        fd.append("free_text_notes", data.free_text_notes || "");
        fd.append("ephemeral", String(!!data.ephemeral));
        res = await axios.post("/api/generate-with-file", fd, { headers: commonHeaders });
      } else {
        res = await axios.post(
          "/api/generate",
          {
            system_name: data.system_name || "",
            intended_purpose: data.intended_purpose || "",
            use_case: data.use_case || "",
            risk_notes: data.risk_notes || "",
            free_text_notes: data.free_text_notes || "",
            ephemeral: !!data.ephemeral,
          },
          { headers: { "Content-Type": "application/json", ...commonHeaders } }
        );
      }
      const md = res.data.report || "";
      setReport(md);
      setSources(res.data.sources || []);
      setProjectId(res.data.project_id || null);
      if (res.data.usage) {
        const { total_tokens } = res.data.usage;
        const cost = ((total_tokens / 1000) * 0.03).toFixed(3);
        setTokenInfo({ total_tokens, cost });
      }
      setCompleteness(computeCompleteness(md));
      notify("Report generated.");
    } catch (err) {
      console.error(err);
      setReport("Error: " + err.message);
      setSources([]); setTokenInfo(null); setProjectId(null);
      setCompleteness(null);
      notify("Failed to generate report.", "error");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = projectId ? `${window.location.origin}/share/${projectId}` : null;
  const copyShare = async () => {
    try { if (shareUrl) await navigator.clipboard.writeText(shareUrl); notify("Share link copied."); }
    catch { notify("Could not copy link.", "warning"); }
  };
  const openShare = () => { if (shareUrl) window.open(shareUrl, "_blank", "noopener,noreferrer"); };

  const downloadPdf = async () => {
    const element = pdfRef.current;
    const safeName = (data.system_name || "ai-compliance-report").replace(/\s+/g, "-");

    notify("Preparing PDF…");
    // Try html2pdf bundle first
    try {
      const h2p = await ensureHtml2Pdf();
      if (h2p) {
        const opt = {
          margin: 10,
          filename: `${safeName}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        };
        h2p().from(element).set(opt).save();
        return;
      }
    } catch (e) {
      console.warn("html2pdf failed, trying fallback:", e);
    }

    // Fallback
    const ok = await fallbackPdf(element, `${safeName}.pdf`);
    if (!ok) notify("PDF export failed. See console for details.", "error");
  };

  return (
    <>
      {loading && <CircularProgress />}
      {!loading && !report && (
        <Button variant="contained" onClick={generate}>Generate</Button>
      )}

      {report && (
        <>
          {completeness && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Compliance completeness: {completeness.percent}% ({completeness.complete}/{completeness.total})
              </Typography>
              <LinearProgress variant="determinate" value={completeness.percent} sx={{ height: 10, borderRadius: 5 }} />
            </Box>
          )}

          <div ref={pdfRef}>
            <Typography variant="h6" sx={{ mt: 2 }}>Compliance Report</Typography>
            <ReportViewer markdown={report} tokenInfo={tokenInfo} />
            <Sources sources={sources} />
          </div>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} alignItems="center" flexWrap="wrap">
            <Button onClick={back} variant="outlined">&lt; Back</Button>
            {shareUrl && (
              <>
                <Tooltip title="Copy share link"><IconButton color="primary" onClick={copyShare}><ContentCopyIcon /></IconButton></Tooltip>
                <Tooltip title="Open shared report"><IconButton color="primary" onClick={openShare}><OpenInNewIcon /></IconButton></Tooltip>
              </>
            )}
            <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={downloadPdf}>
              Download PDF
            </Button>
          </Stack>

          <Snackbar
            open={snack.open}
            autoHideDuration={3000}
            onClose={() => setSnack({ ...snack, open: false })}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: "100%" }}>
              {snack.message}
            </Alert>
          </Snackbar>
        </>
      )}
    </>
  );
}
