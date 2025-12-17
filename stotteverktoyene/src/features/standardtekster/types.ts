// Shared types for standardtekster

export type StandardTekst = {
  id: string;
  title: string;
  category?: string;
  content: string;
  updatedAt?: Date | null;
};

export type PreparatRow = { id: number; picked: string | null };
