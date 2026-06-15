import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import { useTheme } from "@mui/material/styles";
import MedicationSearch from "../../fest/components/MedicationSearch";
import styles from "../../../styles/standardTekstPage.module.css";
import { formatPreparatForTemplate, formatPreparatRowText } from "../utils/preparat";

type PreparatRowId = string | number;

type PreparatRowLike = {
  id: PreparatRowId;
  picked?: string | null;
};

type Props = {
  preparatRows: PreparatRowLike[];
  clearOnCopy?: boolean;
  includeManufacturerInText?: boolean;
  includePackSizeInText?: boolean;
  autoPasteNumericClipboard?: boolean;
  searchResetSignal?: string | number | null;
  onClearOnCopyChange?: (value: boolean) => void;
  onIncludeManufacturerInTextChange?: (value: boolean) => void;
  onIncludePackSizeInTextChange?: (value: boolean) => void;
  onAutoPasteNumericClipboardChange?: (value: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPickText: (pick: string | PickPayload) => void;
  onClear: () => void;
  onRemove: (id: PreparatRowId) => void;
};

type PickPayload = {
  text: string;
  key: string;
  virkestoff?: string;
  formulering?: string;
  rowData?: {
    baseText?: string | null;
    fullName?: string | null;
    manufacturer?: string | null;
    packSize?: string | null;
  };
};

export default function PreparatPanel({
  preparatRows,
  clearOnCopy = false,
  includeManufacturerInText = false,
  includePackSizeInText = false,
  autoPasteNumericClipboard = false,
  searchResetSignal = null,
  onClearOnCopyChange,
  onIncludeManufacturerInTextChange,
  onIncludePackSizeInTextChange,
  onAutoPasteNumericClipboardChange,
  inputRef,
  onPickText,
  onClear,
  onRemove,
}: Props) {
  const theme = useTheme();
  const hasPicked = preparatRows.some((r) => r.picked);

  const deriveFormuleringBase = (m: any): string => {
    const texts = [
      m?.navnForStyrke,
      m?.navnFormStyrke,
      m?.nameFormStrength,
      m?.varenavn,
      m?.name,
      m?.displayName,
      m?.label,
      m?.searchText,
    ]
      .map((v) => (typeof v === "string" ? v.toLowerCase() : ""))
      .filter(Boolean);

    const hay = texts.join(" ");

    const rules: Array<[RegExp, string]> = [
      [/\bdepotplaster\b|\bdepotplastre\b/, "depotplaster"],
      [/\btyggetablett\b|\btyggetab\b|\btyggetabletter\b/, "tyggetablett"],
      [/\bdepottablett\b|\bdepottab\b|\bdepottabletter\b/, "depottablett"],
      [/\bsmeltetablett\b|\bsmeltetab\b|\bsmeltetabletter\b/, "smeltetablett"],
      [/\benterotablett\b|\benterotab\b|\benterotabletter\b/, "enterotablett"],
      [/\bsublingvaltablett\b|\bsublingvaltab\b|\bsublingvaltabletter\b/, "sublingvaltablett"],
      [/\bbrusetablett\b|\bbrusetab\b|\bbrusetabletter\b/, "brusetablett"],
      [/\bdepotkapsel\b|\bdepotkaps\b|\bdepotkapsler\b/, "depotkapsel"],
      [/\bnesespray\b|\bnesesprayer\b/, "nesespray"],
      [/\bøyedråpe\b|\bøyedr\b|\boyedr\b|\bøyedråper\b/, "øyedråpe"],
      [/\børedråpe\b|\boredr\b|\børedråper\b/, "øredråpe"],
      [/\bstikkpille\b|\bstikkpil\b|\bsupp\b|\bstikkpiller\b/, "stikkpille"],
      [/\binjeksjon\b|\binj\b|\binjeksjoner\b/, "injeksjon"],
      [/\binfusjon\b|\binf\b|\binfusjoner\b/, "infusjon"],
      [/\binhalasjonspulver\b|\binh\s*pulv\b|\binhalasjonspulvere\b/, "inhalasjonspulver"],
      [/\binhalasjonsvæske\b|\binh\s*væske\b|\binhalasjonsvæsker\b/, "inhalasjonsvæske"],
      [/\bmikstur\b|\bmiksturer\b/, "mikstur"],
      [/\bgranulat\b|\bgran\b|\bgranulater\b/, "granulat"],
      [/\bplaster\b|\bplastre\b/, "plaster"],
      [/\btablett\b|\btab\b|\btabl\b|\btabletter\b/, "tablett"],
      [/\bkapsel\b|\bkaps\b|\bkapsler\b/, "kapsel"],
      [/\bdråpe\b|\bdråper\b|\bdr\b/, "dråpe"],
      [/\bsalve\b|\bsalver\b/, "salve"],
      [/\bkrem\b|\bkremer\b/, "krem"],
      [/\bgel\b|\bgeler\b/, "gel"],
      [/\bspray\b|\bsprayer\b/, "spray"],
    ];

    for (const [re, plural] of rules) {
      if (re.test(hay)) return plural;
    }

    return "";
  };

  return (
    <Box>
      <Paper className={styles.preparatPaper}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
          className={styles.preparatSearchRow}
        >
        <Box className={styles.preparatSingleSearch} style={{ flex: 1 }}>
          <MedicationSearch
            inputRef={inputRef}
            autoPasteNumericClipboard={autoPasteNumericClipboard}
            resetSignal={searchResetSignal}
            accentColor={theme.palette.mode === "dark" ? "#42C18D" : "#5CAA7E"}
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

              const normalizedFullName = fullName.replace(/\s+/g, " ").trim();

              const trailingPackMatch = normalizedFullName.match(
                /\s(\d+\s*x\s*\d+\s*(?:doser?|stk\.?)|\d+\s*(?:doser?|stk\.?)|\d+)\s*$/i,
              );
              const packSize = trailingPackMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";

              const fullNameWithoutPack = packSize
                ? normalizedFullName.replace(
                    new RegExp(`\\s${packSize.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"),
                    "",
                  )
                : normalizedFullName;

              const cleanedFullName = fullNameWithoutPack
                ? fullNameWithoutPack
                    .replace(/(\d)\s*(mg|mcg|µg|g|ml)\b/gi, "$1 $2")
                    .replace(/\b(tab|tbl|tablett|kapsel|mikstur|depottablett|depot)\b/gi, "")
                    .replace(/\s{2,}/g, " ")
                    .trim()
                : "";

              const text = formatPreparatRowText(
                {
                  baseText,
                  fullName: cleanedFullName || null,
                  manufacturer: manufacturer || null,
                  packSize: packSize || null,
                },
                {
                  includeManufacturer: includeManufacturerInText,
                  includePackSize: includePackSizeInText,
                },
              );

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
              const formulering = deriveFormuleringBase(med);

              onPickText({
                text,
                key,
                virkestoff: virkestoff || undefined,
                formulering: formulering || undefined,
                rowData: {
                  baseText: baseText || null,
                  fullName: cleanedFullName || null,
                  manufacturer: manufacturer || null,
                  packSize: packSize || null,
                },
              });
            }}
            onManualPick={({ name, query }) => {
              const manualName = String(name ?? "").trim();
              if (!manualName) return;

              const manualKey = `MANUAL:${String(query ?? "").trim()}:${manualName.toLowerCase()}`;

              onPickText({
                text: manualName,
                key: manualKey,
                rowData: {
                  baseText: manualName,
                  fullName: manualName,
                  manufacturer: null,
                  packSize: null,
                },
              });
            }}
          />
        </Box>

        <Button
          variant="outlined"
          className={styles.preparatClearButton}
          sx={{
            boxSizing: "border-box",
            alignSelf: "flex-start",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
          onClick={onClear}
          disabled={!hasPicked}
          startIcon={<ClearAllIcon fontSize="small" />}
          title="Tøm alle (Escape når fokus er i preparatfeltet)"
        >
          Tøm
        </Button>

        </Stack>

        <Box className={styles.preparatToggleRow}>
          {([
            {
              label: "Tøm etter kopi",
              checked: clearOnCopy,
              onChange: onClearOnCopyChange,
              title: "Når dette er på, tømmes preparater, tallfelt og søk automatisk etter kopiering.",
            },
            {
              label: "Auto vnr",
              checked: autoPasteNumericClipboard,
              onChange: onAutoPasteNumericClipboardChange,
              title: "Når feltet er aktivt, limes kopiert tall automatisk inn i søket (f.eks. 3111).",
            },
            {
              label: "Produsent",
              checked: includeManufacturerInText,
              onChange: onIncludeManufacturerInTextChange,
              title: "Når dette er på, settes produsentnavn inn i teksten (f.eks. Metformin Sandoz).",
            },
            {
              label: "Størrelse",
              checked: includePackSizeInText,
              onChange: onIncludePackSizeInTextChange,
              title: "Når dette er på, tas pakningsstørrelse med i teksten (f.eks. ... 60).",
            },
          ] as const).map(({ label, checked, onChange, title }) => (
            <Tooltip key={label} title={title} placement="top" arrow>
              <Box
                component="button"
                type="button"
                aria-pressed={checked}
                onClick={() => onChange?.(!checked)}
                sx={(theme) => ({
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  gap: "6px",
                  px: "10px",
                  py: "5px",
                  border: "1px solid",
                  borderRadius: "999px",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 140ms ease",
                  background: checked
                    ? `linear-gradient(135deg, ${theme.palette.mode === "dark" ? "rgba(66,193,141,0.18)" : "rgba(92,170,126,0.13)"} 0%, ${theme.palette.mode === "dark" ? "rgba(66,193,141,0.10)" : "rgba(92,170,126,0.07)"} 100%)`
                    : theme.palette.mode === "dark"
                      ? "rgba(14,21,33,0.5)"
                      : "rgba(255,255,255,0.8)",
                  borderColor: checked
                    ? theme.palette.mode === "dark"
                      ? "rgba(66,193,141,0.45)"
                      : "rgba(92,170,126,0.45)"
                    : theme.palette.mode === "dark"
                      ? "rgba(165,177,198,0.2)"
                      : "rgba(148,163,184,0.3)",
                  boxShadow: checked
                    ? theme.palette.mode === "dark"
                      ? "0 0 0 1px rgba(66,193,141,0.15) inset"
                      : "0 0 0 1px rgba(92,170,126,0.1) inset"
                    : "none",
                  "&:hover": {
                    borderColor: checked
                      ? theme.palette.mode === "dark"
                        ? "rgba(66,193,141,0.65)"
                        : "rgba(92,170,126,0.65)"
                      : theme.palette.mode === "dark"
                        ? "rgba(165,177,198,0.38)"
                        : "rgba(148,163,184,0.5)",
                    background: checked
                      ? theme.palette.mode === "dark"
                        ? "rgba(66,193,141,0.22)"
                        : "rgba(92,170,126,0.17)"
                      : theme.palette.mode === "dark"
                        ? "rgba(165,177,198,0.08)"
                        : "rgba(148,163,184,0.08)",
                  },
                })}
              >
                <Box
                  sx={(theme) => ({
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    flexShrink: 0,
                    transition: "all 140ms ease",
                    background: checked
                      ? theme.palette.mode === "dark"
                        ? "#42C18D"
                        : "#3da87a"
                      : theme.palette.mode === "dark"
                        ? "rgba(165,177,198,0.4)"
                        : "rgba(148,163,184,0.5)",
                    boxShadow: checked
                      ? theme.palette.mode === "dark"
                        ? "0 0 6px rgba(66,193,141,0.6)"
                        : "0 0 5px rgba(92,170,126,0.5)"
                      : "none",
                  })}
                />
                <Typography
                  variant="caption"
                  sx={(theme) => ({
                    fontSize: "0.8rem",
                    fontWeight: checked ? 650 : 500,
                    letterSpacing: "0.01em",
                    transition: "color 140ms ease",
                    color: checked
                      ? theme.palette.mode === "dark"
                        ? "#42C18D"
                        : "#2a7a57"
                      : theme.palette.mode === "dark"
                        ? "rgba(165,177,198,0.75)"
                        : "rgba(71,85,105,0.85)",
                    lineHeight: 1,
                  })}
                >
                  {label}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>

        <Box className={styles.preparatChipsWrap}>
          {preparatRows
            .filter((r) => r.picked)
            .map((r, index) => (
              <Chip
                key={String(r.id)}
                label={
                  <Box component="span" className={styles.preparatChipLabel}>
                    <Box component="span" className={styles.preparatChipIndex}>
                      Preparat {index + 1}
                    </Box>
                    <Box component="span" className={styles.preparatChipText}>
                      {r.picked as string}
                    </Box>
                  </Box>
                }
                onDelete={() => onRemove(r.id)}
                className={styles.preparatChip}
              />
            ))}
        </Box>

      </Paper>
    </Box>
  );
}
