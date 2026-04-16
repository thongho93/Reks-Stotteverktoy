import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useAuthUser } from "../../../app/auth/useAuthUser";
import ChatList from "../components/ChatList";
import MessageComposer from "../components/MessageComposer";
import MessageList from "../components/MessageList";
import {
  ensureDirectChat,
  listActiveMembers,
  sendChatMessage,
  subscribeChatMessages,
  subscribeMyChats,
  type ActiveMember,
  type ChatUserIdentity,
  type GraphChat,
  type GraphChatMessage,
} from "../graph/chatApi";

type MaybeFirebaseError = {
  code?: string;
  message?: string;
  name?: string;
  stack?: string;
};

function mapError(error: unknown): string {
  const firebaseError = error as MaybeFirebaseError;
  const code = typeof firebaseError?.code === "string" ? firebaseError.code : "";

  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Mangler tilgang (firestore/permission-denied).";
  }
  if (code === "unauthenticated" || code === "firestore/unauthenticated") {
    return "Du er ikke innlogget (firestore/unauthenticated).";
  }
  if (code === "failed-precondition" || code === "firestore/failed-precondition") {
    return "Feil precondition i Firestore (failed-precondition).";
  }

  if (typeof firebaseError?.message === "string" && firebaseError.message.trim()) {
    return firebaseError.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function getDisplayName(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedEmail = email?.trim().toLowerCase();
  if (trimmedEmail) return trimmedEmail.split("@")[0];

  return "Bruker";
}

function logChatError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const e = error as MaybeFirebaseError;
  // eslint-disable-next-line no-console
  console.error(`[InternChat] ${context}`, {
    code: e?.code,
    message: e?.message,
    name: e?.name,
    stack: e?.stack,
    ...extra,
  });
}

export default function TeamsChatPage() {
  const { user, firstName } = useAuthUser();
  const isSignedIn = Boolean(user);

  const [status, setStatus] = useState<string>("Klar");
  const [error, setError] = useState<string>("");

  const [chats, setChats] = useState<GraphChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GraphChatMessage[]>([]);
  const [activeMembers, setActiveMembers] = useState<ActiveMember[]>([]);

  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [startingChatUid, setStartingChatUid] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");

  const sender = useMemo<ChatUserIdentity | null>(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      displayName: getDisplayName(firstName, user.email),
      email: user.email,
    };
  }, [firstName, user]);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  const refreshMembers = useCallback(async () => {
    if (!user?.uid) return;

    setLoadingMembers(true);
    setError("");
    setStatus("Henter aktive medlemmer...");

    try {
      const members = await listActiveMembers(user.uid);
      setActiveMembers(members);
      setStatus("OK");
    } catch (e) {
      logChatError("Kunne ikke hente aktive medlemmer", e, { userUid: user.uid });
      setStatus("Feilet");
      setError(mapError(e));
    } finally {
      setLoadingMembers(false);
    }
  }, [user?.uid]);

  const handleStartChat = useCallback(
    async (member: ActiveMember) => {
      if (!sender) return;

      setStartingChatUid(member.uid);
      setError("");
      setStatus("Oppretter chat...");

      try {
        const chatId = await ensureDirectChat(sender, member);
        setSelectedChatId(chatId);
        setStatus("OK");
      } catch (e) {
        logChatError("Kunne ikke opprette/åpne direct chat", e, {
          userUid: sender.uid,
          targetUid: member.uid,
        });
        setStatus("Feilet");
        setError(mapError(e));
      } finally {
        setStartingChatUid(null);
      }
    },
    [sender]
  );

  const handleSend = useCallback(async () => {
    if (!sender) {
      setStatus("Mangler innlogging");
      return;
    }
    if (!selectedChatId) {
      setStatus("Velg en chat");
      return;
    }

    const text = draft.trim();
    if (!text) return;

    setError("");
    setStatus("Sender...");
    try {
      await sendChatMessage(selectedChatId, text, sender);
      setDraft("");
      setStatus("OK");
    } catch (e) {
      logChatError("Kunne ikke sende melding", e, {
        userUid: sender.uid,
        chatId: selectedChatId,
      });
      setStatus("Feilet");
      setError(mapError(e));
    }
  }, [draft, selectedChatId, sender]);

  useEffect(() => {
    if (!user?.uid) {
      setChats([]);
      setMessages([]);
      setActiveMembers([]);
      setSelectedChatId(null);
      setStatus("Mangler innlogging");
      return;
    }

    setError("");
    setStatus("Lytter på chatter...");

    const unsubscribe = subscribeMyChats(
      user.uid,
      (nextChats) => {
        setChats(nextChats);
        setSelectedChatId((previousId) => {
          if (!nextChats.length) return null;
          if (previousId && nextChats.some((chat) => chat.id === previousId)) return previousId;
          return nextChats[0].id;
        });
        setStatus("OK");
      },
      (subscriptionError) => {
        logChatError("Chat-listener feilet", subscriptionError, { userUid: user.uid });
        setStatus("Feilet");
        setError(mapError(subscriptionError));
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setError("");
    setStatus("Lytter på meldinger...");

    const unsubscribe = subscribeChatMessages(
      selectedChatId,
      (nextMessages) => {
        setMessages(nextMessages);
        setStatus("OK");
      },
      (subscriptionError) => {
        logChatError("Meldings-listener feilet", subscriptionError, { chatId: selectedChatId });
        setStatus("Feilet");
        setError(mapError(subscriptionError));
      }
    );

    return () => unsubscribe();
  }, [selectedChatId]);

  useEffect(() => {
    if (!user?.uid) return;
    void refreshMembers();
  }, [refreshMembers, user?.uid]);

  return (
    <Box sx={{ height: "calc(100vh - 96px)", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}
      >
        <Box>
          <Typography variant="h5">Intern chat</Typography>
          <Typography color="text.secondary">
            Status: {status}
            {sender ? ` · Innlogget som ${sender.displayName}` : ""}
          </Typography>
        </Box>

        <IconButton aria-label="Oppdater medlemmer" onClick={refreshMembers} disabled={!isSignedIn}>
          <RefreshIcon />
        </IconButton>
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
            width: 360,
            borderRight: "1px solid",
            borderColor: "divider",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <ChatList
              chats={chats}
              selectedChatId={selectedChatId}
              onSelectChat={setSelectedChatId}
              currentUserId={sender?.uid}
              title="Samtaler"
            />
          </Box>

          <Divider />

          <Box sx={{ minHeight: 0, maxHeight: "45%", display: "flex", flexDirection: "column" }}>
            <Typography sx={{ px: 2, py: 1.5 }} variant="subtitle1">
              Aktive medlemmer
            </Typography>
            <Divider />

            {loadingMembers ? (
              <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={18} />
                <Typography color="text.secondary">Henter medlemmer...</Typography>
              </Box>
            ) : activeMembers.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography color="text.secondary">Ingen aktive medlemmer funnet.</Typography>
              </Box>
            ) : (
              <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
                {activeMembers.map((member) => {
                  const isSelected =
                    selectedChat?.memberIds?.length === 2 &&
                    Boolean(selectedChat.memberIds?.includes(member.uid));

                  return (
                    <ListItemButton
                      key={member.uid}
                      selected={isSelected}
                      disabled={startingChatUid === member.uid}
                      onClick={() => {
                        void handleStartChat(member);
                      }}
                      sx={{ px: 2, py: 1.25 }}
                    >
                      <ListItemText
                        primary={member.firstName}
                        secondary={member.email}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flex: 1, flexDirection: "column", minWidth: 0 }}>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <MessageList
              messages={messages}
              title="Meldinger"
              emptyText="Velg en chat for å se meldinger."
            />
          </Box>

          <Divider />

          <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
            <MessageComposer
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              disabled={!isSignedIn || !selectedChatId}
              placeholder={selectedChatId ? "Skriv en melding…" : "Velg en chat først"}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
