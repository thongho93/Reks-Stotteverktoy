export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Feil / bug" },
  { value: "feature", label: "Ny funksjon" },
] as const;

/**
 * Statusløpet brukeren ser på sitt eget innspill. Eier styrer verdien fra
 * Feedbacks-siden; brukeren ser den samme etiketten på /innspill.
 */
export const FEEDBACK_STATUSES = [
  { value: "ikke_behandlet", label: "Ikke behandlet" },
  { value: "under_behandling", label: "Under behandling" },
  { value: "ferdig_behandlet", label: "Ferdig behandlet" },
] as const;

/** Sidene brukeren kan knytte et innspill til. Verdien er ruten, slik at eier kan gå rett dit. */
export const FEEDBACK_PAGES = [
  { value: "/omeq", label: "OMEQ-beregning" },
  { value: "/lagerbeholdning", label: "Lagerbeholdning" },
  { value: "/standardtekster", label: "Standardtekster" },
  { value: "/interaksjoner", label: "Interaksjonssøk" },
  { value: "/produkt-og-rad", label: "Produkt og råd" },
  { value: "/anbrudd", label: "Innkjøp og anbrudd" },
  { value: "/tilbakemelding", label: "Notater" },
  { value: "/rekspert", label: "Rekspert" },
  { value: "__annet", label: "Annet / hele appen" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]["value"];
export type FeedbackPage = (typeof FEEDBACK_PAGES)[number]["value"];

export type Feedback = {
  id: string;
  message: string;
  category: FeedbackCategory;
  /** Ruten innspillet gjelder, eller "__annet". */
  pagePath: string;
  status: FeedbackStatus;
  /** Eiers svar – synlig for den som meldte inn. */
  ownerReply: string;
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  createdAtMs: number;
  updatedAtMs: number;
};

export type NewFeedbackInput = {
  message: string;
  category: FeedbackCategory;
  pagePath: string;
};

export function feedbackCategoryLabel(value: string): string {
  return FEEDBACK_CATEGORIES.find((c) => c.value === value)?.label ?? "Innspill";
}

export function feedbackStatusLabel(value: string): string {
  return FEEDBACK_STATUSES.find((s) => s.value === value)?.label ?? "Ikke behandlet";
}

export function feedbackPageLabel(value: string): string {
  return FEEDBACK_PAGES.find((p) => p.value === value)?.label ?? value;
}

export const FEEDBACK_STATUS_COLOR: Record<FeedbackStatus, string> = {
  ikke_behandlet: "#8A8F98",
  under_behandling: "#FFA726",
  ferdig_behandlet: "#0E9F8E",
};
