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

export const replaceFirstName = (text: string, firstName?: string | null) => {
  if (!firstName) return text;
  return text.replace(/\bXX\b/g, firstName);
};

const usesSecondaryToken = (text: string) => /\{\{\s*PREPARAT1\s*\}\}/.test(text);

export const buildDisplayContent = ({ template, firstName, picked, dato, datoMnd }: BuildArgs): string => {
  let text = template ?? "";

  text = replaceFirstName(text, firstName);

  if (usesSecondaryToken(text)) {
    const primary = picked[0] ?? null;
    const secondary = picked[1] ?? null;
    text = replacePreparatTokensPrimarySecondary(text, primary, secondary);
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
  usesSecondaryToken(template ?? "");
