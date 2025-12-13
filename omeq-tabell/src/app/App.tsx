import { useState } from "react";
import { Container, Paper, Typography } from "@mui/material";

import { OMEQRow, type OMEQRowValue } from "../features/omeq/components/OMEQRow";

function App() {
  const [row, setRow] = useState<OMEQRowValue>({
    medicationText: "",
    doseText: "",
  });

  return (
    <Container maxWidth="md" className="appContainer">
      <Paper elevation={3} className="appCard">
        <Typography variant="h4" gutterBottom>
          OMEQ – preparatsøk
        </Typography>

        <Typography variant="body1" color="text.secondary" className="appSubtitle">
          Lim inn preparatnavn og styrke, og legg inn dosering for beregning
        </Typography>

        <OMEQRow value={row} onChange={setRow} />
      </Paper>
    </Container>
  );
}

export default App;
