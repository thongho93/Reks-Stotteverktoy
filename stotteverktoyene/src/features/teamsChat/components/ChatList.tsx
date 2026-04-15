import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";
import type { GraphChat } from "../graph/chatApi";

export interface ChatListProps {
  chats: GraphChat[];
  selectedChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  currentUserId?: string;
  title?: string;
}

function labelForChat(chat: GraphChat, currentUserId?: string): string {
  if (chat.topic && chat.topic.trim().length > 0) return chat.topic;

  const members = chat.memberIds ?? [];
  const names = chat.memberNames ?? {};
  const emails = chat.memberEmails ?? {};

  const otherMembers = members.filter((uid) => uid !== currentUserId);
  if (otherMembers.length > 0) {
    return otherMembers
      .map((uid) => names[uid] || emails[uid] || "Ukjent")
      .join(", ");
  }

  const ownName = currentUserId ? names[currentUserId] || emails[currentUserId] : "";
  if (ownName) return ownName;

  const shortId = chat.id?.slice(0, 8) ?? "";
  return `Chat · ${shortId}`;
}

function subtitleForChat(chat: GraphChat): string {
  const timeIso = chat.lastUpdatedDateTime ?? chat.createdDateTime;
  const timeText = timeIso ? new Date(timeIso).toLocaleString("nb-NO") : "";
  const lastMessage = chat.lastMessageText?.trim() ?? "";

  if (lastMessage && timeText) return `${lastMessage} · ${timeText}`;
  if (lastMessage) return lastMessage;
  return timeText;
}

export default function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  currentUserId,
  title = "Chats",
}: ChatListProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Typography sx={{ px: 2, py: 1.5 }} variant="subtitle1">
        {title}
      </Typography>
      <Divider />

      {chats.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography color="text.secondary">Ingen chats å vise.</Typography>
        </Box>
      ) : (
        <List dense disablePadding sx={{ overflow: "auto", flex: 1 }}>
          {chats.map((chat) => {
            const selected = Boolean(selectedChatId && chat.id === selectedChatId);
            return (
              <ListItemButton
                key={chat.id}
                selected={selected}
                onClick={() => onSelectChat(chat.id)}
                sx={{ px: 2, py: 1.25 }}
              >
                <ListItemText
                  primary={labelForChat(chat, currentUserId)}
                  secondary={subtitleForChat(chat)}
                  secondaryTypographyProps={{
                    noWrap: true,
                  }}
                  primaryTypographyProps={{
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}
