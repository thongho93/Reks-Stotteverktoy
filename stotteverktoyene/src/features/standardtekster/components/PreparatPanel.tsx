import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import ClearAllIcon from "@mui/icons-material/ClearAll";
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
  onClearOnCopyChange?: (value: boolean) => void;
  onIncludeManufacturerInTextChange?: (value: boolean) => void;
  onIncludePackSizeInTextChange?: (value: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPickText: (
    pick:
      | string
      | {
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
        },
  ) => void;
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

type RecentSuggestion = {
  key: string;
  name: string;
  varenummer: string;
  payload: PickPayload;
};

const RECENT_SUGGESTIONS_STORAGE_KEY = "standardtekster.preparater.recent.v1";

const readRecentSuggestionsFromStorage = (): RecentSuggestion[] => {
  try {
    const raw = window.localStorage.getItem(RECENT_SUGGESTIONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as RecentSuggestion[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const key = String(item.key ?? "").trim();
        const name = String(item.name ?? "").trim();
        const varenummer = String(item.varenummer ?? "").trim();
        const payload = item.payload ?? ({} as PickPayload);
        const payloadText = String(payload.text ?? "").trim();
        const payloadKey = String(payload.key ?? "").trim();

        return {
          key,
          name,
          varenummer,
          payload: {
            text: payloadText,
            key: payloadKey,
            virkestoff: payload.virkestoff ? String(payload.virkestoff).trim() : undefined,
            formulering: payload.formulering ? String(payload.formulering).trim() : undefined,
            rowData: payload.rowData
              ? {
                  baseText: payload.rowData.baseText ?? null,
                  fullName: payload.rowData.fullName ?? null,
                  manufacturer: payload.rowData.manufacturer ?? null,
                  packSize: payload.rowData.packSize ?? null,
                }
              : undefined,
          },
        } as RecentSuggestion;
      })
      .filter((item) => item.key && item.name && item.payload?.text && item.payload?.key)
      .slice(0, 10);
  } catch {
    return [];
  }
};

export default function PreparatPanel({
  preparatRows,
  clearOnCopy = false,
  includeManufacturerInText = false,
  includePackSizeInText = false,
  onClearOnCopyChange,
  onIncludeManufacturerInTextChange,
  onIncludePackSizeInTextChange,
  inputRef,
  onPickText,
  onClear,
  onRemove,
}: Props) {
  const hasPicked = preparatRows.some((r) => r.picked);
  const [recentSuggestions, setRecentSuggestions] = useState<RecentSuggestion[]>(
    () => readRecentSuggestionsFromStorage(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        RECENT_SUGGESTIONS_STORAGE_KEY,
        JSON.stringify(recentSuggestions.slice(0, 10)),
      );
    } catch {
      // ignore storage write errors
    }
  }, [recentSuggestions]);

  const pushRecentSuggestion = (entry: RecentSuggestion) => {
    setRecentSuggestions((prev) => {
      const deduped = prev.filter((item) => item.key !== entry.key);
      return [entry, ...deduped].slice(0, 10);
    });
  };

  const applyPickPayload = (payload: PickPayload) => {
    onPickText(payload);
    const nameForChip = payload.rowData?.baseText?.trim() || payload.text.trim();
    const varenummerForChip = String(payload.key ?? "").trim();
    if (!nameForChip || !varenummerForChip) return;

    pushRecentSuggestion({
      key: varenummerForChip,
      name: nameForChip,
      varenummer: varenummerForChip,
      payload,
    });
  };

  const suggestionChips = useMemo(
    () =>
      recentSuggestions.map((item) => (
        <Chip
          key={item.key}
          variant="outlined"
          size="small"
          label={
            /^FEST:/i.test(item.varenummer)
              ? item.name
              : `${item.name} (${item.varenummer})`
          }
          onClick={() => applyPickPayload(item.payload)}
          sx={{
            width: "100%",
            justifyContent: "flex-start",
            "& .MuiChip-label": {
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.72rem",
              px: 0.75,
            },
            height: 20,
          }}
        />
      )),
    [recentSuggestions],
  );

  const deriveFormuleringPlural = (m: any): string => {
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
      [/\bdepotplaster\b/, "depotplastre"],
      [/\bdepottablett\b|\bdepottab\b/, "depottabletter"],
      [/\bsmeltetablett\b|\bsmeltetab\b/, "smeltetabletter"],
      [/\benterotablett\b|\benterotab\b/, "enterotabletter"],
      [/\bsublingvaltablett\b|\bsublingvaltab\b/, "sublingvaltabletter"],
      [/\bbrusetablett\b|\bbrusetab\b/, "brusetabletter"],
      [/\bdepotkapsel\b|\bdepotkaps\b/, "depotkapsler"],
      [/\bnesespray\b/, "nesesprayer"],
      [/\bøyedråpe\b|\bøyedr\b|\boyedr\b/, "øyedråper"],
      [/\børedråpe\b|\boredr\b/, "øredråper"],
      [/\bstikkpille\b|\bstikkpil\b|\bsupp\b/, "stikkpiller"],
      [/\binjeksjon\b|\binj\b/, "injeksjoner"],
      [/\binfusjon\b|\binf\b/, "infusjoner"],
      [/\binhalasjonspulver\b|\binh\s*pulv\b/, "inhalasjonspulvere"],
      [/\binhalasjonsvæske\b|\binh\s*væske\b/, "inhalasjonsvæsker"],
      [/\bmikstur\b/, "miksturer"],
      [/\bgranulat\b|\bgran\b/, "granulater"],
      [/\bplaster\b/, "plastre"],
      [/\btablett\b|\btab\b|\btabl\b/, "tabletter"],
      [/\bkapsel\b|\bkaps\b/, "kapsler"],
      [/\bdråpe\b|\bdråper\b|\bdr\b/, "dråper"],
      [/\bsalve\b/, "salver"],
      [/\bkrem\b/, "kremer"],
      [/\bgel\b/, "geler"],
      [/\bspray\b/, "sprayer"],
    ];

    for (const [re, plural] of rules) {
      if (re.test(hay)) return plural;
    }

    return "";
  };

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" },
        alignItems: { xs: "start", lg: "stretch" },
      }}
    >
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

              const cleanedFullName = fullName
                ? fullName
                    .replace(/(\d)\s*(mg|mcg|µg|g|ml)\b/gi, "$1 $2")
                    .replace(/\b(tab|tbl|tablett|kapsel|mikstur|depottablett|depot)\b/gi, "")
                    .replace(/\s{2,}/g, " ")
                    .trim()
                : "";

              const packSizeMatch = cleanedFullName.match(/\s(\d+)\s*$/);
              const packSize = packSizeMatch?.[1] ?? "";

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
              const formulering = deriveFormuleringPlural(med);

              applyPickPayload({
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
          />
        </Box>

        <Button
          variant="outlined"
          className={styles.preparatClearButton}
          sx={{
            boxSizing: "border-box",
            alignSelf: "flex-start",
            flexShrink: 0,
            px: 2.25,
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

        <Box
          sx={{
            mt: 0.75,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
          }}
        >
        <Tooltip title="Når dette er på, tømmes preparater, tallfelt og søk automatisk etter kopiering.">
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size="small"
                checked={clearOnCopy}
                onChange={(e) => onClearOnCopyChange?.(e.target.checked)}
              />
            }
            label={<Typography variant="caption">Tøm etter kopiering</Typography>}
          />
        </Tooltip>

        <Tooltip title="Når dette er på, settes produsentnavn inn i teksten (f.eks. Metformin Sandoz).">
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size="small"
                checked={includeManufacturerInText}
                onChange={(e) => onIncludeManufacturerInTextChange?.(e.target.checked)}
              />
            }
            label={<Typography variant="caption">Vis produsent</Typography>}
          />
        </Tooltip>

        <Tooltip title="Når dette er på, tas pakningsstørrelse med i teksten (f.eks. ... 60).">
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size="small"
                checked={includePackSizeInText}
                onChange={(e) => onIncludePackSizeInTextChange?.(e.target.checked)}
              />
            }
            label={<Typography variant="caption">Vis pakningsstørrelse</Typography>}
          />
        </Tooltip>
        </Box>

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

      </Paper>

      <Paper
        className={styles.preparatPaper}
        sx={{
          p: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          height: { xs: "auto", lg: "100%" },
        }}
      >
        <Typography variant="subtitle2">De siste 10 søkene</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.35,
            maxHeight: { xs: 120, lg: 170 },
            overflowY: "auto",
            overflowX: "hidden",
            pr: 0.25,
          }}
        >
          {suggestionChips.length > 0 ? (
            suggestionChips
          ) : (
            <Typography variant="caption" color="text.secondary">
              Ingen nylige søk.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
