import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import MedicationSearch from "../../fest/components/MedicationSearch";
import styles from "../../../styles/standardTekstPage.module.css";
import { formatPreparatForTemplate } from "../utils/preparat";

type PreparatRowId = string | number;

type PreparatRowLike = {
  id: PreparatRowId;
  picked?: string | null;
};

type Props = {
  preparatRows: PreparatRowLike[];
  includeManufacturerInText?: boolean;
  includePackSizeInText?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPickText: (pick: string | { text: string; key: string; virkestoff?: string }) => void;
  onClear: () => void;
  onRemove: (id: PreparatRowId) => void;
};

export default function PreparatPanel({
  preparatRows,
  includeManufacturerInText = false,
  includePackSizeInText = false,
  inputRef,
  onPickText,
  onClear,
  onRemove,
}: Props) {
  const hasPicked = preparatRows.some((r) => r.picked);

  return (
    <Paper className={styles.preparatPaper}>
      <Box className={styles.preparatHeader}>
        <Typography variant="subtitle2" className={styles.preparatTitle}>
          Preparater
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        className={styles.preparatSearchRow}
      >
        <Box className={styles.preparatSingleSearch} style={{ flex: 1 }}>
          <MedicationSearch
            inputRef={inputRef}
            onPick={(med) => {
              const baseText = formatPreparatForTemplate(med);
              if (!baseText) return;

              // Manufacturer can be missing depending on source. When the toggle is on,
              // fall back to using a full display name (often includes manufacturer) from the med object.
              const manufacturer = String(
                (med as any)?.produsent ??
                  (med as any)?.manufacturer ??
                  (med as any)?.leverandor ??
                  (med as any)?.marketingAuthorizationHolder ??
                  "",
              ).trim();

              const fullName = String(
                (med as any)?.navnForStyrke ??
                  (med as any)?.varenavn ??
                  (med as any)?.name ??
                  (med as any)?.displayName ??
                  (med as any)?.label ??
                  "",
              ).trim();

              const text = (() => {
                // Helper: normalize full name (keeps manufacturer if present in the name)
                const cleanedFullName = fullName
                  ? fullName
                      .replace(/(\d)\s*(mg|mcg|µg|g|ml)\b/gi, "$1 $2") // 1000mg -> 1000 mg
                      .replace(/\b(tab|tbl|tablett|kapsel|mikstur|depottablett|depot)\b/gi, "")
                      .replace(/\s{2,}/g, " ")
                      .trim()
                  : "";

                // Pack size is typically a trailing number in PIM/HV varenavn/navnForStyrke, e.g. " ... 60".
                const packSizeMatch = cleanedFullName.match(/\s(\d+)\s*$/);
                const packSize = packSizeMatch?.[1] ?? "";

                const baseLower = baseText.toLowerCase();

                let out = baseText;

                // 1) Manufacturer toggle (independent)
                if (includeManufacturerInText) {
                  if (manufacturer) {
                    const mLower = manufacturer.toLowerCase();
                    if (!baseLower.includes(mLower)) {
                      out = `${out} ${manufacturer}`.trim();
                    }
                  } else if (cleanedFullName) {
                    // If we don't have a manufacturer field, prefer the cleaned full name
                    // (it often contains manufacturer, e.g. "metformin sandoz ...").
                    out = cleanedFullName;
                  }
                }

                // 2) Pack size toggle (independent)
                if (includePackSizeInText && packSize) {
                  const outLower = out.toLowerCase();
                  // Only append if the output doesn't already end with the pack size.
                  if (!outLower.match(new RegExp(`\\s${packSize}\\s*$`))) {
                    out = `${out} ${packSize}`.trim();
                  }
                }

                // If pack size toggle is OFF and we ended up using the full name, strip trailing pack size.
                if (!includePackSizeInText && cleanedFullName && out === cleanedFullName) {
                  out = out.replace(/\s+\d+\s*$/g, "").trim();
                }

                return out;
              })();

              // Stabil ident for dedupe:
              // - PIM/HV: farmaloggNumber (f.eks. 440704)
              // - FEST: med.id (er allerede "FEST:...")
              // Fallback til baseText kun hvis alt annet mangler.
              const key = String((med as any)?.farmaloggNumber ?? (med as any)?.id ?? baseText);

              const deriveVirkestoff = (m: any): string => {
                // 1) Common explicit fields (FEST / internal)
                const direct = [
                  m?.virkestoff,
                  m?.virkestoffNavn,
                  m?.virkestoffName,
                  m?.activeSubstance,
                  m?.activeSubstanceName,
                  m?.substance,
                  m?.substanceName,
                  m?.aktivtStoff,
                  m?.aktiveStoff,
                ]
                  .map((v) => (typeof v === "string" ? v.trim() : ""))
                  .filter(Boolean);
                if (direct.length) return direct[0];

                // 2) Arrays of substances/active substances
                const arrCandidates: any[] = (Array.isArray(m?.virkestoffer) ? m.virkestoffer : [])
                  .concat(Array.isArray(m?.substances) ? m.substances : [])
                  .concat(Array.isArray(m?.activeSubstances) ? m.activeSubstances : []);

                for (const item of arrCandidates) {
                  if (!item) continue;
                  const name =
                    (typeof item === "string" ? item : "") ||
                    (typeof item?.name === "string" ? item.name : "") ||
                    (typeof item?.navn === "string" ? item.navn : "") ||
                    (typeof item?.substance === "string" ? item.substance : "") ||
                    (typeof item?.activeSubstance === "string" ? item.activeSubstance : "");
                  if (name?.trim()) return name.trim();
                }

                // 3) PIM/HV often renders 'Virkestoff: X · ATC: ...' in a subtitle/secondary text.
                // Try to parse it from any string field on the object.
                const allStringValues = Object.values(m ?? {}).filter(
                  (v) => typeof v === "string" && v.trim().length,
                ) as string[];

                for (const s of allStringValues) {
                  const match = s.match(/\bvirkestoff\s*:\s*([^·\n\r,]+)/i);
                  if (match?.[1]?.trim()) return match[1].trim();
                }

                return "";
              };

              const virkestoff = deriveVirkestoff(med);

              onPickText({ text, key, virkestoff: virkestoff || undefined });
            }}
          />
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={onClear}
          disabled={!hasPicked}
          startIcon={<ClearAllIcon fontSize="small" />}
          title="Tøm alle (Escape når fokus er i preparatfeltet)"
        >
          Tøm
        </Button>
      </Stack>

      <Box className={styles.preparatChipsWrap}>
        {preparatRows
          .filter((r) => r.picked)
          .map((r) => (
            <Chip
              key={String(r.id)}
              label={r.picked as string}
              onDelete={() => onRemove(r.id)}
              className={styles.preparatChip}
            />
          ))}
      </Box>

      <Typography variant="caption" color="text.secondary" className={styles.preparatHint}>
        <span className={styles.preparatHintTip}>
          Tips: Skriv eller lim inn varenummer – søket rydder opp automatisk.
        </span>
      </Typography>
    </Paper>
  );
}
