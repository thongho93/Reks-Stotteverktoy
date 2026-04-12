import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Divider,
  IconButton,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import { useMsal } from "@azure/msal-react";

import { graphScopes } from "../../../app/auth/msalConfig";
import ChatList from "../components/ChatList";
import MessageList from "../components/MessageList";
import MessageComposer from "../components/MessageComposer";
import { listChatMessages, listMyChats, sendChatMessage, type GraphChat, type GraphChatMessage } from "../graph/chatApi";

export default function TeamsChatPage() {
  const { instance, accounts } = useMsal();

  const account = accounts[0] ?? null;
  const isSignedIn = Boolean(account);

  const [status, setStatus] = useState<string>("Klar");
  const [error, setError] = useState<string>("");

  const [chats, setChats] = useState<GraphChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GraphChatMessage[]>([]);

  const [draft, setDraft] = useState<string>("");

  const loginScopes = useMemo(() => graphScopes.chatRead, []);

  const signIn = useCallback(async () => {
    setError("");
    setStatus("Logger inn...");
    try {
      await instance.loginPopup({ scopes: loginScopes });
      setStatus("Innlogget");
    } catch (e: any) {
      setStatus("Feilet");
      setError(e?.message ?? String(e));
    }
  }, [instance, loginScopes]);

  const signOut = useCallback(async () => {
    setError("");
    setStatus("Logger ut...");
    try {
      if (account) {
        await instance.logoutPopup({ account });
      } else {
        await instance.logoutPopup();
      }
      setChats([]);
      setMessages([]);
      setSelectedChatId(null);
      setDraft("");
      setStatus("Utlogget");
    } catch (e: any) {
      setStatus("Feilet");
      setError(e?.message ?? String(e));
    }
  }, [instance, account]);

  const loadChats = useCallback(async () => {
    setError("");
    if (!account) {
      setStatus("Mangler innlogging");
      return;
    }

    setStatus("Henter chats...");
    try {
      const data = await listMyChats(instance, account);
      setChats(data);
      setStatus("OK");

      // Auto-select first chat if none selected yet.
      if (!selectedChatId && data.length > 0) {
        setSelectedChatId(data[0].id);
      }
    } catch (e: any) {
      setStatus("Feilet");
      setError(e?.message ?? String(e));
    }
  }, [instance, account, selectedChatId]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      setError("");
      if (!account) {
        setStatus("Mangler innlogging");
        return;
      }

      setStatus("Henter meldinger...");
      try {
        const data = await listChatMessages(instance, account, chatId);
        setMessages(data);
        setStatus("OK");
      } catch (e: any) {
        setStatus("Feilet");
        setError(e?.message ?? String(e));
      }
    },
    [instance, account]
  );

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setSelectedChatId(chatId);
      setMessages([]);
      loadMessages(chatId);
    },
    [loadMessages]
  );

  const handleRefresh = useCallback(async () => {
    if (!account) return;
    await loadChats();
    if (selectedChatId) {
      await loadMessages(selectedChatId);
    }
  }, [account, loadChats, loadMessages, selectedChatId]);

  const handleSend = useCallback(async () => {
    setError("");
    if (!account) {
      setStatus("Mangler innlogging");
      return;
    }
    if (!selectedChatId) {
      setStatus("Velg en chat");
      return;
    }

    const text = draft.trim();
    if (!text) return;

    setStatus("Sender...");
    try {
      await sendChatMessage(instance, account, selectedChatId, text);
      setDraft("");

      // Refresh messages after sending.
      const data = await listChatMessages(instance, account, selectedChatId);
      setMessages(data);
      setStatus("OK");
    } catch (e: any) {
      setStatus("Feilet");
      setError(e?.message ?? String(e));
    }
  }, [instance, account, selectedChatId, draft]);

  useEffect(() => {
    if (!account) return;
    // Load chats once we have an account.
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    if (!account) return;
    if (!selectedChatId) return;
    loadMessages(selectedChatId);
  }, [account, selectedChatId, loadMessages]);

  return (
    <Box sx={{ height: "calc(100vh - 96px)", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
        <Box>
          <Typography variant="h5">Teams chat</Typography>
          <Typography color="text.secondary">Status: {status}</Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <IconButton aria-label="Oppdater" onClick={handleRefresh} disabled={!isSignedIn}>
            <RefreshIcon />
          </IconButton>

          {!isSignedIn ? (
            <ListItemButton
              onClick={signIn}
              sx={{ width: "fit-content", border: "1px solid", borderColor: "divider", borderRadius: 2 }}
            >
              <LoginIcon fontSize="small" />
              <ListItemText primary="Logg inn med Microsoft" sx={{ ml: 1 }} />
            </ListItemButton>
          ) : (
            <ListItemButton
              onClick={signOut}
              sx={{ width: "fit-content", border: "1px solid", borderColor: "divider", borderRadius: 2 }}
            >
              <LogoutIcon fontSize="small" />
              <ListItemText primary="Logg ut" sx={{ ml: 1 }} />
            </ListItemButton>
          )}
        </Box>
      </Box>

      {error ? (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Box sx={{ p: 2, border: "1px solid", borderColor: "error.light", borderRadius: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        </Box>
      ) : null}

      <Divider />

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Box
          sx={{
            width: 340,
            borderRight: "1px solid",
            borderColor: "divider",
            minHeight: 0,
          }}
        >
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            title="Chatlist"
          />
        </Box>

        <Box sx={{ display: "flex", flex: 1, flexDirection: "column", minWidth: 0 }}>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <MessageList
              messages={messages}
              title="Messagelist"
              emptyText={isSignedIn ? "Velg en chat for å se meldinger." : "Logg inn for å hente chats og meldinger."}
            />
          </Box>

          <Divider />

          <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
            <MessageComposer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              disabled={!isSignedIn || !selectedChatId}
              placeholder={!isSignedIn ? "Logg inn for å sende meldinger" : selectedChatId ? "Skriv en melding…" : "Velg en chat først"}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
