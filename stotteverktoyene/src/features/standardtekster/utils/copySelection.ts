/**
 * Ren tekst fra en manuell markering i forhåndsvisningen.
 *
 * Forhåndsvisningen er ikke ren tekst: tokens er inline-bokser, DOSERING/TALL er
 * <input>-felter, og valgfrie setninger har en ✕-markør. Lar vi nettleseren
 * serialisere markeringen selv, blir resultatet feil på tre måter:
 *
 *  - ✕/+-markøren blir med i teksten
 *  - input-felter gir ingen verdi (eller placeholderen «ANT» ved liming som HTML)
 *  - inline-bokser og input-felter er egne layout-bokser, så nettleseren legger
 *    inn linjeskift rundt dem
 *
 * Her bygges teksten fra DOM-en i stedet: input-felter bidrar med verdien sin,
 * elementer merket data-copy-skip hoppes over, og tekstnoder tas med som de er.
 * Avsnittsskift bevares fordi malteksten ligger som ekte linjeskift i tekstnodene
 * (.body har white-space: pre-wrap).
 *
 * Målet er at manuell markering + Ctrl+C gir samme tekst som Kopier-knappen.
 */

/** Elementer med dette attributtet utelates fra kopiert tekst, med hele undertreet. */
export const COPY_SKIP_ATTR = "data-copy-skip";

/** Rent redigerings-UI, f.eks. ✕/+-markøren på en valgfri setning. */
export const COPY_SKIP_MARK = "mark";

/** Bortvalgt setning – utelates, og etterlater seg mellomrom som må ryddes. */
export const COPY_SKIP_SENTENCE = "sentence";

type Collected = { text: string; removedSentence: boolean };

function collectFromRange(range: Range, root: HTMLElement, acc: Collected): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const skip = el.getAttribute(COPY_SKIP_ATTR);
        if (skip !== null) {
          // Bare bortvalgte setninger etterlater et hull i teksten; ✕-markøren
          // står inntil forrige ord og kan ikke lage dobbelt mellomrom.
          if (skip === COPY_SKIP_SENTENCE && range.intersectsNode(el)) {
            acc.removedSentence = true;
          }
          return NodeFilter.FILTER_REJECT;
        }
        // Hopp over hele undertrær som ligger utenfor markeringen.
        return range.intersectsNode(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Bare input-felter bidrar med egen tekst; øvrige elementer bidrar via
      // tekstnodene sine.
      if (node instanceof HTMLInputElement) acc.text += node.value;
      continue;
    }

    const text = node.textContent ?? "";
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : text.length;
    acc.text += text.slice(start, end);
  }
}

/**
 * Returnerer teksten som bør legges på utklippstavla, eller null hvis markeringen
 * ikke hører hjemme i `root` – da skal nettleseren få håndtere kopieringen selv.
 */
export function plainTextFromSelection(
  selection: Selection | null,
  root: HTMLElement,
): string | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const acc: Collected = { text: "", removedSentence: false };

  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    if (range.collapsed) continue;
    if (!root.contains(range.commonAncestorContainer)) return null;
    collectFromRange(range, root, acc);
  }

  // Samme opprydding som replaceOptionalGroups gjør for Kopier-knappen, slik at
  // de to veiene gir identisk tekst.
  const text = acc.removedSentence
    ? acc.text
        .replace(/ {2,}/g, " ")
        .replace(/ +([.,;:!?])/g, "$1")
        .replace(/ +$/gm, "")
    : acc.text;

  return text.trim() ? text : null;
}
