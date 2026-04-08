// Shared types for standardtekster

export type StandardTekstFollowUp = {
  id: string; // id til standardteksten som er oppfølging
  label: string; // vises i UI, f.eks. "Hvis kunden svarer ja"
};

export type UpdateStandardTekstDto = {
  title?: string;
  category?: string;
  content?: string;
  followUps?: StandardTekstFollowUp[];
};

export type CreateStandardTekstDto = {
  title: string;
  category?: string;
  content: string;
  followUps?: StandardTekstFollowUp[];
};

export type StandardTekst = {
  id: string;
  title: string;
  category?: string;
  content: string;
  followUps?: StandardTekstFollowUp[];
  createdByName?: string;
  updatedByName?: string;
  updatedAt?: Date | null;
};

export type PreparatRow = {
  id: number;
  // Teksten som settes inn i template (kan være produsent-strippet)
  picked: string | null;

  // Stabil ident (f.eks. varenummer) brukt til dedupe.
  // Gjør at to ulike produkter kan ha samme picked-tekst.
  pickedKey: string | null;
};
