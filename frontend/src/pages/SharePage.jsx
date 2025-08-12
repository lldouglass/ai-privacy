import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import axios from "axios";
import ReportViewer from "../components/ReportViewer.jsx";
import Sources from "../components/Sources.jsx";

export default function SharePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/api/projects/${id}`);
        setData(res.data);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [id]);

  if (err) return <Alert severity="error">{err}</Alert>;
  if (!data) return <CircularProgress />;

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Shared Report
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
        Project #{data.id} · {new Date(data.created_at).toLocaleString()}
      </Typography>
      <ReportViewer markdown={data.report} />
      <Sources sources={data.sources} />
    </Box>
  );
}
