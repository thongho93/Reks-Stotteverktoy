import { useState } from "react";
import { Container, Paper, Typography } from "@mui/material";
import styles from "../styles/App.module.css";

import { OMEQRow, type OMEQRowValue } from "../features/omeq/components/OMEQRow";

function App() {
  const [row, setRow] = useState<OMEQRowValue>({
    medicationText: "",
    doseText: "",
  });

  return (
    <Container maxWidth={false} className={styles.appContainer}>
      <Paper elevation={3} className={styles.appCard}>
        <Typography variant="h4" gutterBottom>
          OMEQ – preparatsøk
        </Typography>

        <Typography variant="body1" color="text.secondary" className={styles.appSubtitle}>
          Lim inn preparatnavn og styrke, og legg inn dosering for beregning
        </Typography>

        <OMEQRow value={row} onChange={setRow} />
      </Paper>
    </Container>
  );
}

export default App;
