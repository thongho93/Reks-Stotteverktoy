import type { SearchIndexItem } from "../../../utils/types";

type FestProduct = {
  id: string;
  name: string;
  atc?: string;
  substance?: string;
  prescriptionGroup?: string;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export const festToSearchIndex = (products: FestProduct[]): SearchIndexItem[] => {
  return products.map((p) => {
    const searchText = normalize([p.name, p.substance, p.atc].filter(Boolean).join(" "));

    return {
      source: "FEST",
      id: p.id,
      displayName: p.name,
      searchText,
      atc: p.atc,
      substance: p.substance,
      prescriptionGroup: p.prescriptionGroup,
    };
  });
};
