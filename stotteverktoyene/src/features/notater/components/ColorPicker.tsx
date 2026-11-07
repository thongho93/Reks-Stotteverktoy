import { Box, ButtonBase, Tooltip } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { NOTE_COLORS, NOTE_COLOR_ACCENTS } from "../utils/noteUtils";

type ColorPickerProps = {
  value: string | null;
  onChange: (color: string | null) => void;
  size?: number;
};

/** Rad med fargeprikker. Første prikk fjerner fargen. */
export function ColorPicker({ value, onChange, size = 22 }: ColorPickerProps) {
  return (
    <Box role="radiogroup" aria-label="Notatfarge" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      <Tooltip title="Ingen farge">
        <ButtonBase
          role="radio"
          aria-checked={value === null}
          aria-label="Ingen farge"
          onClick={() => onChange(null)}
          sx={{
            width: size,
            height: size,
            borderRadius: "50%",
            border: "1.5px solid",
            borderColor: value === null ? "primary.main" : "divider",
            color: "text.disabled",
            "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
          }}
        >
          <BlockRoundedIcon sx={{ fontSize: size - 8 }} />
        </ButtonBase>
      </Tooltip>
      {NOTE_COLORS.map((color) => {
        const selected = value === color;
        const accent = NOTE_COLOR_ACCENTS[color];
        return (
          <ButtonBase
            key={color}
            role="radio"
            aria-checked={selected}
            aria-label={`Farge ${color}`}
            onClick={() => onChange(color)}
            sx={{
              width: size,
              height: size,
              borderRadius: "50%",
              bgcolor: color,
              border: "2px solid",
              borderColor: selected ? accent : "transparent",
              boxShadow: selected ? "none" : `inset 0 0 0 1.5px ${accent}55`,
              color: accent,
              transition: "transform 120ms",
              "&:hover": { transform: "scale(1.12)" },
              "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
            }}
          >
            {selected && <CheckRoundedIcon sx={{ fontSize: size - 10 }} />}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
