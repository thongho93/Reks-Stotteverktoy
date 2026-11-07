// Delt rik-tekst-rensing for notat- og rutine-editorene (contentEditable).

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Rensing av rik-tekst i notat/rutine-editorene -------------------------
// Editorene er contentEditable og lagrer innerHTML. Uten rensing havner det
// søppel i lagret innhold: <span style="font-size: 15.2px"> ved innliming fra
// Notepad/Word, tomme wrappere, class-attributter osv. sanitizeRichHtml beholder
// den bevisste formateringen (fet/kursiv/liste/lenke, og for rutiner farge/font)
// men stripper resten. allowStyleProps styrer hvilke inline-stiler som får bli –
// font-size fjernes alltid, siden det er hovedkilden til rapporterte problemer.

// Notater har ingen farge/font-verktøy → ingen inline-stil beholdes.
export const NOTE_ALLOWED_STYLE_PROPS: string[] = [];
// Rutiner har farge- og font-valg (via styleWithCSS) som skal bevares.
export const ROUTINE_ALLOWED_STYLE_PROPS: string[] = [
  "color",
  "background-color",
  "font-family",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
];

const SANITIZE_BLOCK_TAGS = new Set(["P", "DIV", "BR", "UL", "OL", "LI", "H1", "H2", "H3", "BLOCKQUOTE"]);
const SANITIZE_INLINE_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "S", "A", "SPAN", "FONT"]);

export function filterInlineStyle(style: string | null, allowed: Set<string>): string {
  if (!style || allowed.size === 0) return "";
  const kept: string[] = [];
  for (const declaration of style.split(";")) {
    const idx = declaration.indexOf(":");
    if (idx < 0) continue;
    const prop = declaration.slice(0, idx).trim().toLowerCase();
    const val = declaration.slice(idx + 1).trim();
    if (!prop || !val) continue;
    if (prop === "font-size") continue; // alltid vekk
    if (allowed.has(prop)) kept.push(`${prop}: ${val}`);
  }
  return kept.join("; ");
}

// Renser HTML til en trygg delmengde av tagger, uten fremmede attributter/stiler.
export function sanitizeRichHtml(html: string, allowStyleProps: string[] = []): string {
  const value = String(html ?? "");
  if (!value) return "";
  if (typeof window === "undefined" || typeof document === "undefined") {
    // Uten DOM (SSR): fall tilbake til ren tekst.
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const allowed = new Set(allowStyleProps.map((p) => p.toLowerCase()));
  const root = document.createElement("div");
  root.innerHTML = value;

  const clean = (parent: Node) => {
    Array.from(parent.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.parentNode?.removeChild(child);
        return;
      }

      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();
      const isAllowed = SANITIZE_BLOCK_TAGS.has(tag) || SANITIZE_INLINE_TAGS.has(tag);

      // Rens barna først, så det som pakkes ut allerede er rent.
      clean(el);

      if (!isAllowed) {
        el.replaceWith(...Array.from(el.childNodes));
        return;
      }

      const keptStyle = filterInlineStyle(el.getAttribute("style"), allowed);
      const href = tag === "A" ? (el.getAttribute("href") ?? "").trim() : "";

      // Fjern alle attributter, legg tilbake kun det som er tillatt.
      Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
      if (keptStyle) el.setAttribute("style", keptStyle);
      if (tag === "A" && /^(https?:|mailto:)/i.test(href)) {
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }

      // Meningsløse wrappere (span/font uten beholdt stil) pakkes ut.
      if ((tag === "SPAN" || tag === "FONT") && !keptStyle) {
        el.replaceWith(...Array.from(el.childNodes));
      }
    });
  };

  clean(root);
  return root.innerHTML;
}

// Konverterer rik-tekst til ren tekst for utklippstavla, med linjeskift bevart
// (blokk-elementer og <br> → linjeskift). Løser at kopiering av lagret tekst med
// punktum/enter tidligere tok med rå HTML-tagger.
export function richHtmlToPlainText(html: string): string {
  const value = String(html ?? "");
  if (!value) return "";
  if (typeof window === "undefined" || typeof document === "undefined") {
    return value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-3]|blockquote)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const BLOCK_TAGS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "BLOCKQUOTE", "UL", "OL", "TR"]);
  const root = document.createElement("div");
  root.innerHTML = value;

  // Rekursiv gjennomgang: sett ETT linjeskift rundt blokk-elementer (uten \u00e5 lage
  // doble), og gj\u00f8r <br> til linjeskift. Slik skilles tekst rett foran en <div>
  // fra innholdet i den (tidligere ble \u00ab...aaaadgad\u00bb og \u00abdadgager\u00bb sl\u00e5tt sammen).
  let out = "";
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? "";
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();
      if (tag === "BR") {
        out += "\n";
        return;
      }

      const isBlock = BLOCK_TAGS.has(tag);
      if (isBlock && out && !out.endsWith("\n")) out += "\n";
      walk(el);
      if (isBlock && !out.endsWith("\n")) out += "\n";
    });
  };
  walk(root);

  return out
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Bygger renset HTML fra en innliming: bruk kildens HTML når den finnes (renset),
// ellers ren tekst med linjeskift som <br>.
export function buildPasteHtml(data: DataTransfer | null, allowStyleProps: string[]): string {
  if (!data) return "";
  const html = data.getData("text/html");
  if (html && html.trim()) return sanitizeRichHtml(html, allowStyleProps);
  const text = data.getData("text/plain");
  if (!text) return "";
  return escapeHtml(text).replace(/\r\n|\r|\n/g, "<br>");
}
