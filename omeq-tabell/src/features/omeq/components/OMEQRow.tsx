import { useMemo } from "react";
import { Box, TextField } from "@mui/material";

import { MedicationInput } from "./MedicationInput";
import { buildProductIndex, parseMedicationInput } from "../lib/parseMedicationInput";
import { formToRoute } from "../data/atcProducts";
import { OPIOIDS } from "../data/opioids";

export interface OMEQRowValue {
  medicationText: string;
  doseText: string;
}

interface Props {
  value: OMEQRowValue;
  onChange: (next: OMEQRowValue) => void;
}

export const OMEQRow = ({ value, onChange }: Props) => {
  const productIndex = useMemo(() => buildProductIndex(), []);

  const parsed = useMemo(
    () => parseMedicationInput(value.medicationText, productIndex),
    [value.medicationText, productIndex]
  );

  const matchedOpioid = useMemo(() => {
    if (!parsed.product) return null;

    const route = formToRoute(parsed.product.form);
    if (!route) return null;

    return (
      OPIOIDS.find(
        (o) => o.atcCode.includes(parsed.product!.atcCode as any) && o.route.includes(route)
      ) ?? null
    );
  }, [parsed.product]);

  return (
    <Box className="omeqRow">
      <MedicationInput
        value={value.medicationText}
        onChange={(text) => onChange({ ...value, medicationText: text })}
      />

      <Box className="ratioBox">
        <TextField
          value={matchedOpioid ? String(matchedOpioid.omeqFactor) : ""}
          label="OMEQ-faktor"
          size="small"
          InputProps={{ readOnly: true }}
          fullWidth
        />
      </Box>

      <TextField
        label="Dosering i mg"
        placeholder={parsed.strength?.perHour ? "F.eks. 25" : "F.eks. 200"}
        value={value.doseText}
        onChange={(e) => onChange({ ...value, doseText: e.target.value })}
        inputProps={{ inputMode: "decimal" }}
        fullWidth
      />
    </Box>
  );
};
