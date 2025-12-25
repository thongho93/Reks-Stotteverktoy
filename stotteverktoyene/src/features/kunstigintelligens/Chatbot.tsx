import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";

import { askGemini, askGeminiWithSearchAndTemplate } from "./geminiService";
import type { ChatMessage } from "./geminiService";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hei! 👋 Hvordan kan jeg hjelpe deg i dag?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUsageTip, setShowUsageTip] = useState(() => {
    try {
      return localStorage.getItem("reks.chat.hideUsageTip") !== "true";
    } catch {
      return true;
    }
  });

  const dismissUsageTip = () => {
    setShowUsageTip(false);
    try {
      localStorage.setItem("reks.chat.hideUsageTip", "true");
    } catch {
      // ignore
    }
  };
  const [panelHeight, setPanelHeight] = useState(() => {
    try {
      const raw = localStorage.getItem("reks.chat.panelHeight");
      const parsed = raw ? Number(raw) : NaN;
      if (!Number.isFinite(parsed)) return 420;

      const max = Math.min(720, window.innerHeight - 140);
      return Math.max(260, Math.min(max, parsed));
    } catch {
      return 420;
    }
  });
  const [resizing, setResizing] = useState(false);
  const resizeStartRef = useRef<{ y: number; h: number } | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearChat = useCallback(() => {
    if (loading) return;
    setError(null);
    setInput("");
    setMessages([{ role: "assistant", text: "Hei! 👋 Hvordan kan jeg hjelpe deg i dag?" }]);
  }, [loading]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      // Autofocus input when chat opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Backspace (Cmd+Backspace on mac) to clear chat
      const isClearCombo = (e.ctrlKey || e.metaKey) && e.key === "Backspace";

      // Don’t hijack word-delete when the user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        target?.getAttribute?.("contenteditable") === "true";

      if (isClearCombo) {
        if (isEditable) return;
        e.preventDefault();
        clearChat();
        setOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
        return;
      }

      // Ctrl+A (Cmd+A on mac) to open chat
      const isCombo = (e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A");
      if (!isCombo) return;

      // Don’t hijack Select All when the user is typing in an input/textarea/contenteditable
      if (isEditable) return;

      e.preventDefault();
      setOpen(true);

      // Focus after open renders
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearChat]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!open) return;

      e.preventDefault();
      setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (clientY: number) => {
      const start = resizeStartRef.current;
      if (!start) return;

      // Dragging upwards increases height
      const delta = start.y - clientY;
      const max = Math.min(720, window.innerHeight - 140);
      const next = Math.max(260, Math.min(max, start.h + delta));
      setPanelHeight(next);
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientY);
    };

    const stop = () => {
      setResizing(false);
      resizeStartRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", stop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stop);
    };
  }, [resizing]);

  useEffect(() => {
    try {
      localStorage.setItem("reks.chat.panelHeight", String(panelHeight));
    } catch {
      // ignore write errors (private mode, disabled storage, etc.)
    }
  }, [panelHeight]);

  const startResize = (clientY: number) => {
    resizeStartRef.current = { y: clientY, h: panelHeight };
    setResizing(true);
  };

  const SOURCE_DETECTION = {
    medication:
      /(dosering|dose|døgndose|maksdose|mg\/ml|mg|mikrogram|µg|ie|ml|tablett|kapsel|plaster|injeksjon|interaksjon|bivirk|kontraindik|forsikt|resept|atc|indikasjon)/i,
    omeq: /(omeq|morfinekvivalent|opioid|morfin|fentanyl|oksykodon|buprenorfin|tapentadol|tramadol|hydromorfon|ketobemidon|metadon)/i,
    interaction:
      /(interaksjon|kombiner|samtidig|cyp|enzym|warfarin|blødning|qt|serotonin|mao-hemmer)/i,
    // Dose-specific (more specific than medication)
    dose: /(dosering|dose|døgndose|maksdose|maxdose|mg\/døgn|mg per døgn|hver \d+\.?\s*time|hver \d+\.?\s*timer|intervall|titrer|titrering)/i,
    // Poisoning/overdose/tox
    tox: /(forgiftning|overdose|intoks|intoksikasjon|antidot|nalokson|giftinformasjon)/i,
    // Infection/vaccine/antibiotics
    infect:
      /(antibiotika|penicillin|amoksicillin|doxy|azitro|cefalosporin|infeksjon|smitte|vaksine|influensa|covid)/i,
    // Reimbursement/HELFO
    reimbursement:
      /(helfo|blå resept|blåresept|refusjon|egenandel|vedtak|h-resept|hresept|§\s*\d+|paragraf\s*\d+)/i,
  };

  const getSourceLinks = (text: string) => {
    // Only show sources when the question looks medication/clinical related
    const isMedicationRelated = SOURCE_DETECTION.medication.test(text);
    if (!isMedicationRelated) return [];

    const isOmeqRelated = SOURCE_DETECTION.omeq.test(text);
    const isInteractionRelated = SOURCE_DETECTION.interaction.test(text);
    const isDoseRelated = SOURCE_DETECTION.dose.test(text);
    const isReimbursementRelated = SOURCE_DETECTION.reimbursement.test(text);
    const isInfectRelated = SOURCE_DETECTION.infect.test(text);
    const isToxRelated = SOURCE_DETECTION.tox.test(text);

    const candidates: Array<{ label: string; href: string }> = [];

    const pushUnique = (label: string, href: string) => {
      if (candidates.some((c) => c.href === href)) return;
      candidates.push({ label, href });
    };

    // Theme: OMEQ/opioids
    if (isOmeqRelated) {
      pushUnique("OMEQ (internt)", "/omeq");
      pushUnique("Legemiddelhåndboka", "https://www.legemiddelhandboka.no/");
      pushUnique("Felleskatalogen", "https://www.felleskatalogen.no/");
      // Keep room for 1 more if also interaction etc.
    }

    // Theme: interactions
    if (isInteractionRelated) {
      pushUnique("RELIS", "https://relis.no/");
      pushUnique("Felleskatalogen", "https://www.felleskatalogen.no/");
      // DMP can be relevant for safety updates
      pushUnique("DMP", "https://www.dmp.no/");
    }

    // Theme: dose / max dose / administration
    if (isDoseRelated && !isOmeqRelated) {
      pushUnique("Felleskatalogen", "https://www.felleskatalogen.no/");
      pushUnique("Legemiddelhåndboka", "https://www.legemiddelhandboka.no/");
      pushUnique("DMP", "https://www.dmp.no/");
    }

    // Theme: reimbursement / rules
    if (isReimbursementRelated) {
      pushUnique("HELFO", "https://www.helfo.no/");
      pushUnique("DMP", "https://www.dmp.no/");
    }

    // Theme: infection / vaccines / antibiotics guidance
    if (isInfectRelated) {
      pushUnique("FHI", "https://www.fhi.no/");
      // Keep at least one drug source too
      pushUnique("Felleskatalogen", "https://www.felleskatalogen.no/");
    }

    // Theme: poisoning / overdose / antidotes
    if (isToxRelated) {
      pushUnique("Giftinformasjonen", "https://www.helsenorge.no/giftinformasjon/");
      // Keep at least one drug source too
      pushUnique("Legemiddelhåndboka", "https://www.legemiddelhandboka.no/");
      pushUnique("Felleskatalogen", "https://www.felleskatalogen.no/");
    }

    // Fallback: general medication-related (when none of the above matched strongly)
    if (candidates.length === 0) {
      pushUnique("Felleskatalogen", "https://www.felleskatalogen.no/");
      pushUnique("Legemiddelhåndboka", "https://www.legemiddelhandboka.no/");
      pushUnique("RELIS", "https://relis.no/");
      pushUnique("DMP", "https://www.dmp.no/");
    }

    // Cap to max 4 links
    return candidates.slice(0, 4);
  };

  const renderMessageText = (text: string) => {
    const lines = text.replace(/\r\n/g, "\n").split("\n");

    const blocks: Array<
      | { type: "h1"; text: string }
      | { type: "h2"; text: string }
      | { type: "p"; text: string }
      | { type: "ul"; items: string[] }
      | { type: "ol"; items: string[] }
    > = [];

    const pushParagraph = (t: string) => {
      const trimmed = t.trim();
      if (!trimmed) return;
      blocks.push({ type: "p", text: trimmed });
    };

    const headingMeta = (t: string) => {
      const normalized = t.trim().toLowerCase();

      // Level 1 headings (your clinical template sections)
      const h1 =
        normalized === "oppsummering" ||
        normalized === "viktige hensyn" ||
        normalized === "når kontakte lege" ||
        normalized === "praktisk" ||
        normalized === "avklar";

      // Icon mapping for key headings
      const icon =
        normalized === "dosering"
          ? "💊"
          : normalized === "viktige hensyn"
          ? "⚠️"
          : normalized === "oppsummering"
          ? "🧾"
          : normalized === "når kontakte lege"
          ? "☎️"
          : normalized === "praktisk"
          ? "🛠️"
          : normalized === "avklar"
          ? "❓"
          : null;

      return { level: h1 ? 1 : 2, icon };
    };

    let i = 0;
    while (i < lines.length) {
      const raw = lines[i] ?? "";
      const line = raw.trim();

      // Heading: "**Tittel:**" or "Tittel:"
      const isBoldHeading = /^\*\*(.+?)\*\*:?$/.test(line);
      const isColonHeading = /^[A-ZÆØÅ][^:]{1,60}:$/.test(line);

      if (isBoldHeading || isColonHeading) {
        const text = isBoldHeading
          ? line.replace(/^\*\*(.+?)\*\*:?.*$/, "$1")
          : line.replace(/:$/, "");
        const meta = headingMeta(text);
        blocks.push({
          type: meta.level === 1 ? "h1" : "h2",
          text: meta.icon ? `${meta.icon} ${text}` : text,
        });
        i += 1;
        continue;
      }

      if (!line) {
        i += 1;
        continue;
      }

      // Unordered list: "- item" or "• item"
      const isUl = /^(-|•)\s+/.test(line);
      if (isUl) {
        const items: string[] = [];
        while (i < lines.length) {
          const l = (lines[i] ?? "").trim();
          if (!/^(-|•)\s+/.test(l)) break;
          items.push(l.replace(/^(-|•)\s+/, "").trim());
          i += 1;
        }
        if (items.length) blocks.push({ type: "ul", items });
        continue;
      }

      // Ordered list: "1. item" / "1) item"
      const isOl = /^\d+(\.|\))\s+/.test(line);
      if (isOl) {
        const items: string[] = [];
        while (i < lines.length) {
          const l = (lines[i] ?? "").trim();
          if (!/^\d+(\.|\))\s+/.test(l)) break;
          items.push(l.replace(/^\d+(\.|\))\s+/, "").trim());
          i += 1;
        }
        if (items.length) blocks.push({ type: "ol", items });
        continue;
      }

      // Paragraph (collect consecutive non-empty lines that aren't list items)
      const paraLines: string[] = [line];
      i += 1;
      while (i < lines.length) {
        const l = (lines[i] ?? "").trim();
        if (!l) break;
        if (/^(-|•)\s+/.test(l)) break;
        if (/^\d+(\.|\))\s+/.test(l)) break;
        paraLines.push(l);
        i += 1;
      }
      pushParagraph(paraLines.join(" "));
    }

    return (
      <Stack spacing={0.75}>
        {blocks.map((b, idx) => {
          if (b.type === "h1") {
            return (
              <Typography
                key={idx}
                sx={{
                  fontWeight: 800,
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  mt: 1.25,
                }}
              >
                {b.text}
              </Typography>
            );
          }

          if (b.type === "h2") {
            return (
              <Typography
                key={idx}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  mt: 1,
                }}
              >
                {b.text}
              </Typography>
            );
          }

          if (b.type === "p") {
            return (
              <Typography key={idx} variant="body2" sx={{ lineHeight: 1.5, whiteSpace: "normal" }}>
                {b.text}
              </Typography>
            );
          }

          if (b.type === "ul") {
            return (
              <Box
                key={idx}
                component="ul"
                sx={{
                  m: 0,
                  mt: 0.5,
                  mb: 0.5,
                  pl: 2.25,
                  "& li": { mb: 0.5 },
                }}
              >
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                      {item}
                    </Typography>
                  </li>
                ))}
              </Box>
            );
          }

          return (
            <Box
              key={idx}
              component="ol"
              sx={{
                m: 0,
                mt: 0.5,
                mb: 0.5,
                pl: 2.5,
                "& li": { mb: 0.5 },
              }}
            >
              {b.items.map((item, j) => (
                <li key={j}>
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    {item}
                  </Typography>
                </li>
              ))}
            </Box>
          );
        })}
      </Stack>
    );
  };

  const renderBubbleContent = (m: ChatMessage) => {
    // Keep user messages simple; format assistant messages into paragraphs/lists
    if (m.role === "user") {
      return <Typography variant="body2">{m.text}</Typography>;
    }
    return (
      <Fragment>
        {renderMessageText(m.text)}
        {(() => {
          const links = getSourceLinks(m.text);
          if (links.length === 0) return null;

          return (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.4 }}
              >
                Kilder å verifisere:
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {links.map((l) => (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    underline="hover"
                    variant="caption"
                    color="text.secondary"
                    sx={{ lineHeight: 1.4 }}
                  >
                    {l.label}
                  </Link>
                ))}
              </Box>
            </Box>
          );
        })()}
        {import.meta.env.DEV && m.grounding?.sources?.length ? (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", lineHeight: 1.4 }}
            >
              Kilder fra Google Search:
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {m.grounding.sources.slice(0, 5).map((s, idx) => (
                <Link
                  key={s.url + idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  variant="caption"
                  color="text.secondary"
                  sx={{ lineHeight: 1.4 }}
                >
                  {s.title ?? `Kilde ${idx + 1}`}
                </Link>
              ))}
            </Box>
          </Box>
        ) : null}
      </Fragment>
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setLoading(true);

    const useGrounding = import.meta.env.DEV && import.meta.env.VITE_ENABLE_GROUNDING === "true";

    const res = useGrounding
      ? await askGeminiWithSearchAndTemplate({ messages: nextMessages, userText: text })
      : await askGemini({ messages: nextMessages, userText: text });

    if (res.ok) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.text, grounding: (res as any).grounding },
      ]);
    } else {
      setError(res.error);
    }

    setLoading(false);
  };

  return (
    <>
      {open && (
        <Box
          aria-hidden
          onClick={() => setOpen(false)}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal,
            // Transparent click-catcher. Keep it invisible but clickable.
            backgroundColor: "transparent",
          }}
        />
      )}

      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: (theme) => theme.zIndex.modal + 1,
          width: "min(720px, calc(100vw - 24px))",
        }}
      >
        {/* Collapsed button */}
        {!open && (
          <Paper
            elevation={6}
            onClick={() => setOpen(true)}
            role="button"
            aria-label="Åpne AI-chat"
            sx={{
              ml: "auto",
              width: "fit-content",
              px: 2,
              py: 1,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <AutoAwesomeIcon fontSize="small" />
            <Typography variant="body2">AI-chat</Typography>
            <Typography variant="caption" color="text.secondary">
              Skriv her…
            </Typography>
          </Paper>
        )}

        {/* Expanded panel */}
        <Collapse in={open} timeout={180} unmountOnExit>
          <Paper
            elevation={10}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2,
                py: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AutoAwesomeIcon fontSize="small" />
                <Typography variant="subtitle1">Chat med Gemini</Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <IconButton aria-label="Tøm chat" onClick={clearChat} disabled={loading}>
                  <DeleteOutlineIcon />
                </IconButton>
                <IconButton aria-label="Minimer chat" onClick={() => setOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Resize handle */}
            <Box
              onMouseDown={(e) => {
                e.preventDefault();
                startResize(e.clientY);
              }}
              onTouchStart={(e) => {
                startResize(e.touches[0].clientY);
              }}
              sx={{
                height: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "ns-resize",
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 4,
                  borderRadius: 999,
                  bgcolor: "text.disabled",
                }}
              />
            </Box>

            {/* Body */}
            <Stack spacing={2} sx={{ height: panelHeight, p: 1.5 }}>
              {showUsageTip && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    bgcolor: "background.paper",
                  }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      Tips: For å sikre stabil drift, begrens bruk av AI til maks 100 søk per dag.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Hvis du får “rate limit”, vent litt eller prøv igjen senere.
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="Skjul tips"
                    onClick={dismissUsageTip}
                    sx={{ mt: -0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Paper>
              )}
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                <Stack spacing={1}>
                  {messages.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          justifyContent: isUser ? "flex-end" : "flex-start",
                          px: 1,
                        }}
                      >
                        <Paper
                          sx={{
                            px: 2,
                            py: 1,
                            maxWidth: "85%",
                            borderRadius: 2.5,
                            bgcolor: isUser ? "primary.main" : "grey.100",
                            color: isUser ? "primary.contrastText" : "text.primary",
                            whiteSpace: "normal",
                          }}
                        >
                          {renderBubbleContent(m)}
                        </Paper>
                      </Box>
                    );
                  })}

                  {loading && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                      Tenker …
                    </Typography>
                  )}

                  <div ref={bottomRef} />
                </Stack>
              </Box>

              {error && (
                <Typography variant="body2" color="error" sx={{ px: 1 }}>
                  {error}
                </Typography>
              )}

              {/* Composer */}
              <Box sx={{ display: "flex", gap: 1, px: 0.5 }}>
                <TextField
                  fullWidth
                  inputRef={inputRef}
                  label="Skriv en melding"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  multiline
                  maxRows={3}
                />
                <IconButton onClick={send} disabled={loading} aria-label="Send melding">
                  <SendIcon />
                </IconButton>
              </Box>
            </Stack>
          </Paper>
        </Collapse>
      </Box>
    </>
  );
}
