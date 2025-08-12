import {
  AppBar, Toolbar, Typography, Container, Box, CssBaseline, Divider, Button,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import DemoPage from "./pages/DemoPage.jsx";
import SharePage from "./pages/SharePage.jsx";
import "./index.css";

const theme = createTheme({
  palette: { primary: { main: "#1e88e5" }, background: { default: "#f5f7fb" } },
  typography: { fontFamily: "Inter, system-ui, Arial, sans-serif" },
});

export default function App() {
  const loc = useLocation();
  const navigate = useNavigate();
  const isShare = loc.pathname.startsWith("/share");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography component={Link} to="/" variant="h6"
            sx={{ fontWeight: 700, color: "#fff", textDecoration: "none" }}>
            AI Compliance Assistant
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            EU AI Act · Annex IV · Citations
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" variant="outlined" onClick={() => navigate("/demo")}>
            Try the Demo
          </Button>
        </Toolbar>
      </AppBar>

      {!isShare && (
        <Box sx={{
          py: { xs: 3, md: 5 }, textAlign: "center",
          background: "linear-gradient(180deg, rgba(30,136,229,0.12) 0%, rgba(255,255,255,0) 70%)"
        }}>
          <Container maxWidth={false} sx={{ maxWidth: "min(1920px, 95vw)" }}>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
              Generate AI Act Docs with Real Citations
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.85 }}>
              Upload a model card (optional), answer a few prompts, and get Annex IV‑style documentation.
            </Typography>
          </Container>
        </Box>
      )}

      <Container maxWidth={false} sx={{ maxWidth: "min(1920px, 95vw)", px: { xs: 2, md: 4 }, pb: 6 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/share/:id" element={<SharePage />} />
        </Routes>
      </Container>

      <Divider />
      <Box sx={{ py: 4, textAlign: "center", opacity: 0.75 }}>
        <Typography variant="body2">
          © {new Date().getFullYear()} AI Compliance Assistant — Not legal advice.
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
