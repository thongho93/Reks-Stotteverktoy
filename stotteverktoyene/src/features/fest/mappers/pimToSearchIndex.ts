import type { SearchIndexItem } from "../../../utils/types";

type PimProduct = {
  farmaloggNumber: string;
  name?: string;
  nameFormStrength?: string;
  atc?: string;
  substance?: string;
  prescriptionGroup?: string;
  manufacturer?: string;
  externalId?: string;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export const pimToSearchIndex = (products: PimProduct[]): SearchIndexItem[] => {
  return products.map((p) => {
    const displayName = p.nameFormStrength || p.name || "";

    const searchText = normalize(
      [
        p.name,
        p.nameFormStrength,
        p.farmaloggNumber,
        p.atc,
        p.substance,
        p.prescriptionGroup,
        p.manufacturer,
        p.externalId,
      ]
        .filter(Boolean)
        .join(" ")
    );

    return {
      source: "PIM",
      id: p.farmaloggNumber,
      displayName,
      searchText,
      farmaloggNumber: p.farmaloggNumber,
      name: p.name,
      nameFormStrength: p.nameFormStrength,
      atc: p.atc,
      substance: p.substance,
      prescriptionGroup: p.prescriptionGroup,
      manufacturer: p.manufacturer,
      externalId: p.externalId,
    };
  });
};
