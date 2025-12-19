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
  updatedAt?: Date | null;
};

export type PreparatRow = { id: number; picked: string | null };
