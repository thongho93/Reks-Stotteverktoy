import { geminiGroundedModel, geminiTemplateModel } from "../../firebase/firebase";

export type Role = "user" | "assistant";

export type GroundingSource = { title?: string; url: string };
export type GroundingInfo = { sources: GroundingSource[] };

export type ChatMessage = {
  role: Role;
  text: string;
  grounding?: GroundingInfo;
};

export type GeminiOk = {
  ok: true;
  text: string;
  latencyMs: number;
};

export type GeminiErr = {
  ok: false;
  error: string;
  latencyMs: number;
};

export type GeminiResult = GeminiOk | GeminiErr;

function extractGroundingSources(response: any): GroundingInfo | undefined {
  const md = response?.groundingMetadata;
  if (!md) return undefined;

  const chunks = Array.isArray(md.groundingChunks) ? md.groundingChunks : [];
  const out: Array<{ url: string; title?: string }> = [];

  for (const ch of chunks) {
    const web = ch?.web ?? ch?.retrievedContext ?? ch?.source ?? ch;
    const url = web?.uri ?? web?.url ?? web?.link ?? ch?.uri ?? ch?.url ?? ch?.link;

    const title = web?.title ?? ch?.title ?? web?.displayName ?? ch?.displayName;

    if (typeof url === "string" && url.startsWith("http")) {
      out.push({ url, title: typeof title === "string" ? title : undefined });
    }
  }

  const unique = Array.from(new Map(out.map((s) => [s.url, s])).values()).slice(0, 6);

  return unique.length ? { sources: unique } : undefined;
}

export async function askGeminiWithSearch(params: {
  messages: ChatMessage[];
  userText: string;
}): Promise<GeminiResult & { grounding?: GroundingInfo }> {
  const t0 = performance.now();

  try {
    // Simple grounding test: send only the latest user message
    const result = await geminiGroundedModel.generateContent(params.userText);

    const text = result.response.text()?.trim() || "Beklager, jeg fikk ikke noe svar.";

    const grounding = extractGroundingSources(result.response);

    return {
      ok: true,
      text,
      latencyMs: Math.round(performance.now() - t0),
      grounding,
    };
  } catch (e) {
    return {
      ok: false,
      error: toErrorMessage(e),
      latencyMs: Math.round(performance.now() - t0),
    };
  }
}

function buildTemplateInputs(messages: ChatMessage[], userText: string, retrievedContext?: string) {
  const now = new Date();
  const today = now.toLocaleDateString("nb-NO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Keep only the last N messages to avoid huge payloads
  const trimmed = messages.slice(-12);

  const history = trimmed
    .map((m) => `${m.role === "user" ? "Bruker" : "Assistent"}: ${m.text}`)
    .join("\n");

  return {
    systemTimeOslo: `${today} kl. ${time}`,
    history,
    userText,
    retrievedContext: retrievedContext ?? "",
  };
}

function parseRetrySeconds(msg: string): number | null {
  // Matches: "Please retry in 16.546791499s"
  const m1 = msg.match(/Please retry in\s+([\d.]+)s/i);
  if (m1?.[1]) {
    const n = Number(m1[1]);
    return Number.isFinite(n) ? Math.ceil(n) : null;
  }

  // Matches JSON-ish: "retryDelay":"16s"
  const m2 = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (m2?.[1]) {
    const n = Number(m2[1]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function toErrorMessage(e: unknown) {
  const raw =
    e && typeof e === "object" && "message" in e && typeof (e as any).message === "string"
      ? ((e as any).message as string)
      : "Noe gikk galt ved kontakt med Gemini.";

  // Quota / rate limit
  if (
    raw.includes("[429") ||
    /quota/i.test(raw) ||
    /rate limit/i.test(raw) ||
    /exceeded your current quota/i.test(raw)
  ) {
    const retrySec = parseRetrySeconds(raw);
    if (retrySec) {
      return `Du har nådd grensen for gratis-kvoten/rate-limit. Prøv igjen om ${retrySec} sek.`;
    }

    return "Du har nådd grensen for gratis-kvoten/rate-limit. Prøv igjen litt senere, eller aktiver billing for høyere kvoter.";
  }

  // Avoid dumping long JSON/URLs into the UI. Keep the first sentence/line.
  const firstLine = raw.split("\n")[0] ?? raw;
  const trimmed = firstLine.trim();

  // If it still contains a very long URL, shorten it.
  if (trimmed.length > 220) {
    return trimmed.slice(0, 220) + "…";
  }

  return trimmed || "Noe gikk galt ved kontakt med Gemini.";
}

export async function askGemini(params: {
  messages: ChatMessage[];
  userText: string;
}): Promise<GeminiResult> {
  const t0 = performance.now();

  try {
    const templateID = import.meta.env.VITE_GEMINI_TEMPLATE_ID as string | undefined;

    if (!templateID) {
      throw new Error(
        "Mangler VITE_GEMINI_TEMPLATE_ID. Sett den til template ID-en din (f.eks. reks-clinical-system) i .env."
      );
    }

    const inputs = buildTemplateInputs(params.messages, params.userText, "");

    // Uses server-side prompt template stored in Firebase AI Logic
    const result = await geminiTemplateModel.generateContent(templateID, inputs);

    const text = result.response.text()?.trim() || "Beklager, jeg fikk ikke noe svar.";

    return {
      ok: true,
      text,
      latencyMs: Math.round(performance.now() - t0),
    };
  } catch (e) {
    return {
      ok: false,
      error: toErrorMessage(e),
      latencyMs: Math.round(performance.now() - t0),
    };
  }
}

function extractWebSearchQueries(response: any): string[] | undefined {
  const md = response?.groundingMetadata;
  const q = md?.webSearchQueries;
  if (!Array.isArray(q)) return undefined;

  const cleaned = q
    .filter((x: any) => typeof x === "string" && x.trim().length > 0)
    .map((x: string) => x.trim());

  return cleaned.length ? cleaned.slice(0, 5) : undefined;
}

function buildRetrievedContext(params: {
  queries?: string[];
  sources?: GroundingSource[];
}): string {
  const lines: string[] = [];

  if (params.queries?.length) {
    lines.push("Google Search queries:");
    for (const q of params.queries) lines.push(`- ${q}`);
    lines.push("");
  }

  if (params.sources?.length) {
    lines.push("Kilder (fra Google Search grounding):");
    params.sources.slice(0, 5).forEach((s, i) => {
      const titlePart = s.title ? ` (${s.title})` : "";
      lines.push(`- [${i + 1}] ${s.url}${titlePart}`);
    });
    lines.push("");
  }

  lines.push(
    "Instruks: Bruk kildene kun som støtte for faktasjekk. Hvis informasjonen er usikker eller ikke kan bekreftes, si det tydelig og be om verifisering i norske kilder."
  );

  return lines.join("\n").trim();
}

export async function askGeminiWithSearchAndTemplate(params: {
  messages: ChatMessage[];
  userText: string;
}): Promise<GeminiResult & { grounding?: GroundingInfo }> {
  const t0 = performance.now();

  try {
    const templateID = import.meta.env.VITE_GEMINI_TEMPLATE_ID as string | undefined;

    if (!templateID) {
      throw new Error(
        "Mangler VITE_GEMINI_TEMPLATE_ID. Sett den til template ID-en din (f.eks. reks-clinical-system) i .env."
      );
    }

    // 1) Grounded call (web) — used only to collect queries + sources
    const grounded = await geminiGroundedModel.generateContent(params.userText);
    const groundingInfo = extractGroundingSources(grounded.response);
    const sources = groundingInfo?.sources;
    const queries = extractWebSearchQueries(grounded.response);

    // 2) Build retrieved context string
    const retrievedContext = buildRetrievedContext({
      queries,
      sources,
    });

    // 3) Call clinical template with retrievedContext included as input
    const inputs = buildTemplateInputs(params.messages, params.userText, retrievedContext);
    const result = await geminiTemplateModel.generateContent(templateID, inputs);

    const text = result.response.text()?.trim() || "Beklager, jeg fikk ikke noe svar.";

    return {
      ok: true,
      text,
      latencyMs: Math.round(performance.now() - t0),
      grounding: sources?.length ? { sources } : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      error: toErrorMessage(e),
      latencyMs: Math.round(performance.now() - t0),
    };
  }
}
