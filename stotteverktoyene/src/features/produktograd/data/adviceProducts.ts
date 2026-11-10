// Produkt- og rådsdata: typer, virkestoffnavn og gruppering per ATC-kode.

export type AdviceProduct = {
  id: string;
  name: string;
  atcCode: string;
  farmaloggNumber: string;
  sku: string;
  advicePoints: string[];
  searchBlob: string;
  farmaloggDigits: string;
  skuDigits: string;
};

// Virkestoffnavn for de vanligste ATC-kodene. Koder som mangler her får et navn utledt fra produktnavnene.
export const ATC_INGREDIENT: Record<string, string> = {
  A02BC01: "Omeprazol",
  A02BC02: "Pantoprazol",
  A02BC03: "Lansoprazol",
  A02BC04: "Rabeprazol",
  A02BC05: "Esomeprazol",
  A07EC02: "Mesalazin",
  A11CC05: "Kolekalsiferol",
  B01AB05: "Enoksaparin",
  B01AC24: "Tikagrelol",
  B01AF01: "Rivaroksaban",
  B01AF02: "Apixaban",
  C09CA06: "Kandesartan",
  C09DA03: "Valsartan+HCTZ",
  G03AA12: "Drospirenon+EE",
  G04BE03: "Sildenafil",
  G04BE08: "Tadalafil",
  H02AB02: "Deksametason",
  H03AA01: "Levotyroksin",
  J01CA04: "Amoksicillin",
  J01CA08: "Pivmecillinam",
  J02AC01: "Flukonazol",
  M01AB05: "Diklofenak",
  M01AE01: "Ibuprofen",
  M01AH05: "Etorikoksib",
  N02AJ06: "Kodein+paracet",
  N02BE01: "Paracetamol",
  N02CC01: "Sumatriptan",
  N05AH04: "Quetiapin",
  N06AB06: "Sertralin",
  N06AB10: "Escitalopram",
  N06AX11: "Mirtazapin",
  R03AK06: "Salmeterol+flut",
  R03AK07: "Budesonid+form",
  R03BA02: "Budesonid",
  R05CB01: "Acetylcystein",
  S01ED51: "Timolol komb.",
};

/**
 * Produkter med samme ATC-kode og samme råd. Et virkestoff med flere ulike sett med råd
 * (f.eks. ulike preparater av sumatriptan) gir flere grupper, slik at hvert råd vises for seg.
 */
export type AdviceGroup = {
  key: string;
  atcCode: string;
  /** Virkestoffnavn, eller navn utledt fra produktnavnene. */
  title: string;
  advicePoints: string[];
  products: AdviceProduct[];
  /** Plassering blant gruppene for samme virkestoff (1-basert), og hvor mange det er. */
  variantIndex: number;
  variantCount: number;
};

export const NO_ATC_GROUP_KEY = "__uten-atc__";

/** Navn utledt fra produktnavnene: første ord, unike, maks tre (f.eks. «Paracet, Panodil»). */
export const brandLabel = (names: string[]): string => {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const name of names) {
    const first = name.trim().split(/\s+/)[0] ?? "";
    const key = first.toLowerCase();
    if (!first || seen.has(key)) continue;
    seen.add(key);
    labels.push(first);
    if (labels.length === 3) break;
  }
  return labels.join(", ");
};

export const groupByAtc = (products: AdviceProduct[]): AdviceGroup[] => {
  const byAtc = new Map<string, AdviceProduct[]>();
  for (const product of products) {
    const key = product.atcCode || NO_ATC_GROUP_KEY;
    const list = byAtc.get(key);
    if (list) list.push(product);
    else byAtc.set(key, [product]);
  }

  const groups: AdviceGroup[] = [];
  for (const [atcKey, list] of byAtc) {
    const byAdvice = new Map<string, AdviceProduct[]>();
    for (const product of list) {
      const adviceKey = product.advicePoints.join("\u0001");
      const existing = byAdvice.get(adviceKey);
      if (existing) existing.push(product);
      else byAdvice.set(adviceKey, [product]);
    }

    // Grupper med råd først (flest produkter først), produkter uten råd sist.
    const variants = [...byAdvice.values()].sort((a, b) => {
      const aEmpty = a[0].advicePoints.length === 0;
      const bEmpty = b[0].advicePoints.length === 0;
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      return b.length - a.length;
    });

    const title =
      atcKey === NO_ATC_GROUP_KEY
        ? "Uten ATC-kode"
        : ATC_INGREDIENT[atcKey] ?? (brandLabel(list.map((p) => p.name)) || atcKey);

    variants.forEach((variantProducts, index) => {
      groups.push({
        key: `${atcKey}::${index}`,
        atcCode: atcKey === NO_ATC_GROUP_KEY ? "" : atcKey,
        title,
        advicePoints: variantProducts[0].advicePoints,
        products: variantProducts,
        variantIndex: index + 1,
        variantCount: variants.length,
      });
    });
  }

  // Produkter uten ATC-kode sist; ellers i samme rekkefølge som treffene kom i.
  return groups.sort((a, b) => Number(a.atcCode === "") - Number(b.atcCode === ""));
};
