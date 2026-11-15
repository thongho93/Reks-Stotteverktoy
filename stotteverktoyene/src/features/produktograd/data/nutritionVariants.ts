import type { NutritionProduct } from "./nutritionProducts";

// Kobler varenumre (VNR) fra produktkatalogen til næringsmiddelprodukter.
// Katalognavnene er forkortet og stavet ulikt («Nutridrink comp prot kaffe 4x125»),
// så navnene normaliseres før de sammenlignes ved prefiks. Det lengste treffet vinner.
// Produkter kan ha `aliases` for katalogstavemåter som ikke ligner produktnavnet.

export type CatalogProduct = {
  id: string;
  name: string;
  farmaloggNumber: string;
  farmaloggDigits: string;
  skuDigits: string;
};

/** `pack` er pakningen fra katalognavnet, f.eks. «8×500» (viktig for sondeernæring). */
export type VariantRow = { vnr: string; flavor: string; pack?: string };
export type VariantInfo = { rows: VariantRow[] };

export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    // «Addera+ eple» er et annet produkt enn «Addera eple»: bokstav + pluss blir «plus».
    .replace(/([a-zæøå])\+(?=\s|$)/g, "$1 plus")
    .replace(/\+/g, " ")
    .replace(/\d+\s*x\s*\d+\s*(?:ml|g|cl|l)?\b/g, "")
    .replace(/(\d+)\s+([a-zA-Z])/g, "$1$2")
    .replace(/\bfibre\b/g, "fiber")
    .replace(/\bfibr\b/g, "fiber")
    .replace(/\bfib\b/g, "fiber")
    .replace(/\bcomp\b/g, "compact")
    .replace(/\bactiv\b/g, "active")
    .replace(/\bfr\b/g, "fruit")
    .replace(/\bjucy\b/g, "juicy")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const WORD_CHAR = /[a-z0-9æøå]/;

export function buildVariantMap(catalog: CatalogProduct[], npList: NutritionProduct[]): Map<string, VariantInfo> {
  const map = new Map<string, VariantInfo>();
  // Et prefiks må slutte på en ordgrense («Diben» skal ikke treffe «Dibenzyran»). Et alias som
  // ender på * er en ordstart og matcher også midt i et ord («Elemental 028 ext*» → «extra»).
  const prefixes = npList.flatMap((np) =>
    [np.name, ...(np.aliases ?? [])].map((raw) => {
      const wildcard = raw.endsWith("*");
      return { np, norm: normName(wildcard ? raw.slice(0, -1) : raw), wildcard };
    })
  );
  for (const cp of catalog) {
    const cpNorm = normName(cp.name);
    const vnr = cp.farmaloggNumber.trim();
    if (!vnr) continue;
    let bestNp: NutritionProduct | null = null;
    let bestLen = 0;
    for (const { np, norm, wildcard } of prefixes) {
      if (norm.length <= bestLen || !cpNorm.startsWith(norm)) continue;
      const next = cpNorm.charAt(norm.length);
      // normName() limer tall og bokstav («4,0 aprikos» → «4.0aprikos»), så tall + bokstav er en gyldig grense.
      const digitThenLetter = /\d$/.test(norm) && /[a-zæøå]/.test(next);
      if (!wildcard && WORD_CHAR.test(next) && !digitThenLetter) continue;
      bestNp = np;
      bestLen = norm.length;
    }
    if (!bestNp) continue;
    if (!map.has(bestNp.id)) map.set(bestNp.id, { rows: [] });
    const entry = map.get(bestNp.id)!;
    const packMatch = cp.name.match(/(\d+)\s*x\s*(\d+)/i);
    const pack = packMatch ? `${packMatch[1]}×${packMatch[2]}` : undefined;
    const flavor = cpNorm.slice(bestLen).replace(/\d+\s*x\s*\d+.*/g, "").trim();
    const flavorDisplay = flavor.charAt(0).toUpperCase() + flavor.slice(1);
    if (!entry.rows.some((r) => r.vnr === vnr)) entry.rows.push({ vnr, flavor: flavorDisplay, ...(pack ? { pack } : {}) });
  }
  return map;
}
