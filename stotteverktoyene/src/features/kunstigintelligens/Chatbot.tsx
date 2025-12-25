import { useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";

import { askGemini } from "./geminiService";
import type { ChatMessage } from "./geminiService";


export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hei! 👋 Hvordan kan jeg hjelpe deg i dag?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages, loading]);

  const clearChat = () => {
    if (loading) return;
    setError(null);
    setInput("");
    setMessages([
      { role: "assistant", text: "Hei! 👋 Hvordan kan jeg hjelpe deg i dag?" },
    ]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", text },
    ];
    setMessages(nextMessages);
    setLoading(true);

    const res = await askGemini({
      messages,
      userText: text,
    });

    if (res.ok) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.text },
      ]);
    } else {
      setError(res.error);
    }

    setLoading(false);
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="Åpne chat"
        onClick={() => setOpen(true)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
      >
        <ChatBubbleOutlineIcon />
      </Fab>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Chat</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              aria-label="Tøm chat"
              onClick={clearChat}
              disabled={loading}
            >
              <DeleteOutlineIcon />
            </IconButton>
            <IconButton aria-label="Lukk chat" onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ height: 420 }}>
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
                      }}
                    >
                      <Paper
                        sx={{
                          px: 1.5,
                          py: 1,
                          maxWidth: "80%",
                          bgcolor: isUser ? "primary.main" : "grey.100",
                          color: isUser
                            ? "primary.contrastText"
                            : "text.primary",
                        }}
                      >
                        <Typography variant="body2">{m.text}</Typography>
                      </Paper>
                    </Box>
                  );
                })}

                {loading && (
                  <Typography variant="body2" color="text.secondary">
                    Tenker …
                  </Typography>
                )}

                <div ref={bottomRef} />
              </Stack>
            </Box>

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                fullWidth
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
              <IconButton onClick={send} disabled={loading}>
                <SendIcon />
              </IconButton>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}