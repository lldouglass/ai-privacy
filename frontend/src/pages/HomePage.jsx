import { Grid, Box } from "@mui/material";
import Wizard from "../components/Wizard.jsx";
import RightPanel from "../components/RightPanel.jsx";

export default function HomePage() {
  return (
    <Grid container spacing={4} alignItems="flex-start">
      <Grid item xs={12} md={9}><Box sx={{ background:"#fff", borderRadius:2, boxShadow:"0 1px 3px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.06)", p:{ xs:2, md:4 }}}><Wizard /></Box></Grid>
      <Grid item xs={12} md={3}><RightPanel /></Grid>
    </Grid>
  );
}
