import type { StandardTekst } from "../types";
import { toDateMaybe } from "../utils/date";
import { pickFirstNonEmptyString } from "../utils/strings";

export function mapDocToStandardTekst(id: string, data: Record<string, unknown>): StandardTekst {
  // Du kan endre feltnavnene her hvis databasen din bruker andre navn
  const title =
    pickFirstNonEmptyString(data["title"], data["Title"], data["tittel"]) ?? "Uten tittel";

  const category = pickFirstNonEmptyString(data["category"], data["kategori"]) ?? "";

  const content =
    pickFirstNonEmptyString(data["content"], data["Body"], data["tekst"], data["body"]) ?? "";

  const updatedAt = toDateMaybe(data["updatedAt"] ?? data["updated_at"] ?? data["sistOppdatert"]);

  const followUpsRaw = data["followUps"] ?? data["follow_ups"];
  const followUps = Array.isArray(followUpsRaw) ? (followUpsRaw as unknown[]) : undefined;

  return {
    id,
    title,
    category: category || undefined,
    content,
    followUps: followUps as any,
    updatedAt,
  };
}