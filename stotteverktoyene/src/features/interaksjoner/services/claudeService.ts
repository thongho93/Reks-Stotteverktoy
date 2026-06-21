// Steg 2 (prototype): grunnet kundetekst-generering med Claude API.
//
// Prinsipp: FEST gjør oppslaget, modellen skriver bare teksten – grunnet i den
// ekte FEST-posten. Modellen får alle kliniske fakta servert og skal ALDRI dikte
// egne. En godkjent standardtekst sendes med som stil-anker (tone/struktur).
//
// NB sikkerhet: dette kaller Claude API direkte fra nettleseren med
// `dangerouslyAllowBrowser`. Det er greit for LOKAL testing (nøkkelen ligger kun
// i .env.local, gitignored), men for produksjon må kallet flyttes bak en proxy
// (f.eks. en Firebase Cloud Function) så API-nøkkelen ikke bundles til klienten.
import Anthropic from "@anthropic-ai/sdk";

export type GenerateKundetekstParams = {
  relevansDn: string | null;
  substanser: string[];
  kliniskKonsekvens: string | null;
  interaksjonsmekanisme: string | null;
  handtering: string | null;
  styleExample?: string | null;
  firstName?: string | null;
};

export type GenerateResult =
  | { ok: true; text: string; latencyMs: number }
  | { ok: false; error: string; latencyMs: number };

const MODEL =
  (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined)?.trim() ||
  "claude-opus-4-8";

const SYSTEM_PROMPT = `Du skriver et utkast til en kundemelding fra en farmasøyt ved Farmasiet (norsk nettapotek) om en legemiddelinteraksjon.

ABSOLUTTE REGLER:
- Bruk KUN faktaopplysningene du får i meldingen (interaksjonsdata fra FEST). Du skal ALDRI finne på, gjette eller legge til kliniske fakta, mekanismer, doser, alvorlighetsgrad eller anbefalinger som ikke står i dataene.
- Mangler et felt, skal du ikke dikte det – utelat det heller.
- Ikke gi konkrete doseringsråd utover det som eventuelt står i «Håndtering».
- Teksten er et UTKAST som farmasøyten skal kvalitetssikre før det sendes.

SPRÅK OG TONE (Farmasiet):
- Skriv på norsk i klarspråk: rolig, saklig og betryggende – aldri skremmende, dramatisk eller belærende.
- Henvend deg direkte til kunden («du»).
- Beskriv effekten konkret slik som i malen (f.eks. «kraftig blodtrykksnedsettende effekt»), men bruk ALDRI fryktord som «alvorlig», «farlig» eller «livstruende», og ikke dramatiser.

STRUKTUR – meldingen skal ALLTID følge denne malen, i samme rekkefølge og med samme avsnittsinndeling:

1) Fast åpning – gjengi ordrett:
«Hei, og takk for at du har valgt oss for å få levert reseptvarer.»

2) Selve interaksjonen – skriv ÉN setning ut fra interaksjonsdataene, etter mønsteret:
«Vi vil gjøre deg oppmerksom på at kombinasjonen av [legemiddel A] og [legemiddel B] bør unngås, da [nøktern forklaring av «Klinisk konsekvens»].»
Tilpass «bør unngås» til relevansgraden (f.eks. «bør tas med forholdsregler» ved lavere relevans).

3) Håndtering – TA KUN MED hvis «Håndtering» har et konkret tiltak. Mønster:
«Dersom legemidlene likevel må brukes sammen, bør det gå [tiltak fra «Håndtering», f.eks. minst 24 timer mellom inntak].»

4) Fast avslutning – gjengi ordrett:
«Det er mulig at legen allerede har vurdert denne kombinasjonen. Derfor er det viktig at du følger legens forskrivning nøye, og ikke gjør endringer i behandlingen uten å ha avklart det med legen.»

5) Fast oppfordring – gjengi ordrett:
«Ta gjerne kontakt med legen din hvis du er usikker eller ønsker å få videre vurdering.»

6) Fast info – gjengi ordrett:
«Denne meldingen er kun ment som informasjon og kan ikke besvares. For praktiske spørsmål, kontakt gjerne vår kundeservice.»

7) Signatur:
«Vennlig hilsen
[fornavn hvis oppgitt, ellers XX], farmasøyt
Farmasiet»

FORMAT:
- Returner KUN selve kundemeldingen, uten overskrifter eller metakommentarer.
- Behold avsnittsinndelingen som i malen. Bruk legemiddelnavnene fra dataene.
- En eventuell godkjent standardtekst nederst i meldingen er kun ekstra referanse for ordvalg – malen og de faste seksjonene over har forrang.`;

function buildUserText(p: GenerateKundetekstParams): string {
  const lines: string[] = [];
  lines.push("Interaksjonsdata (fra FEST – eneste tillatte faktagrunnlag):");
  if (p.substanser?.length)
    lines.push(`- Legemidler/virkestoffer: ${p.substanser.join(" + ")}`);
  if (p.relevansDn) lines.push(`- Relevans: ${p.relevansDn}`);
  if (p.kliniskKonsekvens) lines.push(`- Klinisk konsekvens: ${p.kliniskKonsekvens}`);
  if (p.interaksjonsmekanisme) lines.push(`- Mekanisme: ${p.interaksjonsmekanisme}`);
  if (p.handtering) lines.push(`- Håndtering: ${p.handtering}`);
  lines.push("");
  if (p.firstName) lines.push(`Farmasøytens fornavn (for signatur): ${p.firstName}`);
  if (p.styleExample && p.styleExample.trim()) {
    lines.push("");
    lines.push(
      "Godkjent standardtekst (kun ekstra referanse for ordvalg – følg alltid malen og strukturen i systeminstruksen):"
    );
    lines.push('"""');
    lines.push(p.styleExample.trim());
    lines.push('"""');
  }
  lines.push("");
  lines.push("Skriv kundemeldingen nå.");
  return lines.join("\n");
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!import.meta.env.DEV) {
    throw new Error(
      "Claude API-klienten er kun ment for lokal dev. Flytt kallet bak en server/proxy før produksjon."
    );
  }
  if (cachedClient) return cachedClient;
  const apiKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim();
  if (!apiKey) {
    throw new Error(
      "Mangler VITE_ANTHROPIC_API_KEY. Legg nøkkelen i stotteverktoyene/.env.local (kun lokalt – ikke commit den)."
    );
  }
  cachedClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  return cachedClient;
}

export async function generateKundetekst(
  p: GenerateKundetekstParams
): Promise<GenerateResult> {
  const t0 = performance.now();
  try {
    const client = getClient();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserText(p) }],
    });

    if (resp.stop_reason === "refusal") {
      return {
        ok: false,
        error: "Modellen avslo å generere denne teksten.",
        latencyMs: Math.round(performance.now() - t0),
      };
    }

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!text) {
      return {
        ok: false,
        error: "Tomt svar fra modellen.",
        latencyMs: Math.round(performance.now() - t0),
      };
    }

    return { ok: true, text, latencyMs: Math.round(performance.now() - t0) };
  } catch (e) {
    return {
      ok: false,
      error: toErrorMessage(e),
      latencyMs: Math.round(performance.now() - t0),
    };
  }
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError)
    return "Ugyldig API-nøkkel (401). Sjekk VITE_ANTHROPIC_API_KEY i .env.local.";
  if (e instanceof Anthropic.RateLimitError)
    return "For mange forespørsler (429). Prøv igjen om litt.";
  if (e instanceof Anthropic.APIError)
    return `API-feil (${e.status ?? "?"}): ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Noe gikk galt ved kontakt med Claude.";
}
