import releasesJson from "./releases.json";

export type ReleaseItemType = "nytt" | "forbedret" | "rettet";

export type ReleaseItem = {
  type: ReleaseItemType;
  title: string;
  text: string;
};

export type Release = {
  /** Sorterbar id, vanligvis datoen (ÅÅÅÅ-MM-DD). To i samme dag: ÅÅÅÅ-MM-DD-2. */
  id: string;
  /** ISO-dato (ÅÅÅÅ-MM-DD). */
  date: string;
  /** Én til to setninger som oppsummerer hele oppdateringen. */
  summary: string;
  items: ReleaseItem[];
};

export const ITEM_TYPE_LABEL: Record<ReleaseItemType, string> = {
  nytt: "Nytt",
  forbedret: "Forbedret",
  rettet: "Rettet",
};

/** Endringene som ligger i bunten som kjører nå, nyeste først. */
export const BUNDLED_RELEASES: Release[] = releasesJson as Release[];

/** Godtar bare gyldige innslag, slik at en feil i version.json ikke kan velte appen. */
export function parseReleases(value: unknown): Release[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is Release =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as Release).id === "string" &&
      typeof (r as Release).date === "string" &&
      typeof (r as Release).summary === "string" &&
      Array.isArray((r as Release).items) &&
      (r as Release).items.every(
        (i) =>
          typeof i === "object" &&
          i !== null &&
          (i.type === "nytt" || i.type === "forbedret" || i.type === "rettet") &&
          typeof i.title === "string" &&
          typeof i.text === "string"
      )
  );
}

const SEEN_KEY = "release-notes-seen";

/** Siste release brukeren har fått se, eller null hvis ingen er registrert. */
export function readSeenReleaseId(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markReleaseSeen(id: string): void {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    // Privat modus e.l.: da får brukeren se oppsummeringen igjen, ikke verre enn det.
  }
}

/** Endringer nyere enn `seenId`, nyeste først. */
export function releasesAfter(releases: Release[], seenId: string): Release[] {
  return releases.filter((r) => r.id > seenId).sort((a, b) => (a.id < b.id ? 1 : -1));
}

export function formatReleaseDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}
