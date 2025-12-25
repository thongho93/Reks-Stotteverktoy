import { geminiModel } from "../../firebase/firebase";

export type Role = "user" | "assistant";

export type ChatMessage = {
  role: Role;
  text: string;
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

function buildPrompt(messages: ChatMessage[], userText: string) {
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

  const trimmed = messages.slice(-12);

  return [
    `Systemtid (Oslo): ${today} kl. ${time}. Bruk dette som fasit hvis brukeren spør om dato eller klokkeslett.`,
    "Hvis du ikke kan svare sikkert, si tydelig at du er usikker i stedet for å gjette.",
    "Du er en hjelpsom assistent i en intern webapp.",
    "Svar kort, presist og på norsk.",
    "",
    ...trimmed.map(
      (m) => `${m.role === "user" ? "Bruker" : "Assistent"}: ${m.text}`
    ),
    `Bruker: ${userText}`,
    "Assistent:",
  ].join("\n");
}

function toErrorMessage(e: unknown) {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as any).message === "string"
  ) {
    return (e as any).message;
  }
  return "Noe gikk galt ved kontakt med Gemini.";
}

export async function askGemini(params: {
  messages: ChatMessage[];
  userText: string;
}): Promise<GeminiResult> {
  const t0 = performance.now();

  try {
    const prompt = buildPrompt(params.messages, params.userText);
    const result = await geminiModel.generateContent(prompt);
    const text =
      result.response.text()?.trim() ||
      "Beklager, jeg fikk ikke noe svar.";

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
