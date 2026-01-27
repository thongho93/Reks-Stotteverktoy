import {
  formatPreparatList,
  replaceDatoMndTokens,
  replaceDatoTokens,
  replacePreparatTokenWithList,
  replacePreparatTokensPrimarySecondary,
  replaceVareTokenByCount,
} from "./preparat";

type BuildArgs = {
  template: string;
  firstName?: string | null;
  picked: string[];
  dato?: string | null;
  datoMnd?: string | null;
};

// We consider the template to be in "primary/secondary" mode if it contains PREPARAT1 or PREPARAT2,
// either as raw tokens (PREPARAT1) or moustache tokens ({{ PREPARAT1 }}).
const usesPrimarySecondaryTokens = (text: string) =>
  /\{\{\s*PREPARAT[12]\s*\}\}|\bPREPARAT[12]\b/.test(text);

const hasPreparat2Token = (text: string) => /\{\{\s*PREPARAT2\s*\}\}|\bPREPARAT2\b/.test(text);

export const replaceFirstName = (text: string, firstName?: string | null) => {
  if (!firstName) return text;
  return text.replace(/\bXX\b/g, firstName);
};

export const buildDisplayContent = ({
  template,
  firstName,
  picked,
  dato,
  datoMnd,
}: BuildArgs): string => {
  let text = template ?? "";

  text = replaceFirstName(text, firstName);

  if (usesPrimarySecondaryTokens(text)) {
    // Only use primary/secondary split if the template actually contains PREPARAT2.
    if (hasPreparat2Token(text)) {
      // PREPARAT2 = siste, PREPARAT1 = resten (liste)
      const secondary = picked.length ? (picked[picked.length - 1] ?? null) : null;
      const primaryList = picked.length > 1 ? picked.slice(0, -1) : picked;
      const primary = primaryList.length ? formatPreparatList(primaryList) : null;

      text = replacePreparatTokensPrimarySecondary(text, primary, secondary);
    } else {
      // Template uses PREPARAT1 only. In that case PREPARAT1 should represent the full list.
      const list = formatPreparatList(picked);
      if (list) {
        text = replacePreparatTokenWithList(text, list);
      }
    }
  } else {
    const list = formatPreparatList(picked);
    if (list) {
      text = replacePreparatTokenWithList(text, list);
    }
  }

  text = replaceVareTokenByCount(text, picked.length);

  const d = (dato ?? "").trim();
  if (d) {
    text = replaceDatoTokens(text, d);
  }

  const dm = (datoMnd ?? "").trim();
  if (dm) {
    text = replaceDatoMndTokens(text, dm);
  }

  return text;
};

export const buildPreviewContent = ({ template, firstName, picked }: BuildArgs): string => {
  let text = template ?? "";

  text = replaceFirstName(text, firstName);

  // Keep PREPARAT1 / PREPARAT2 placeholders for preview rendering (chips/colors),
  // but still apply dynamic grammar tokens like varen/varene.
  text = replaceVareTokenByCount(text, picked.length);

  return text;
};

export const templateUsesPreparat1 = (template: string): boolean =>
  hasPreparat2Token(template ?? "");
