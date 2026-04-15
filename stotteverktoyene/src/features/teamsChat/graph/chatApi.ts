import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";

export interface GraphChat {
  id: string;
  topic?: string | null;
  chatType?: string;
  createdDateTime?: string;
  lastUpdatedDateTime?: string;
  memberIds?: string[];
  memberNames?: Record<string, string>;
  memberEmails?: Record<string, string>;
  lastMessageText?: string;
  lastMessageSenderUid?: string;
}

export interface GraphItemBody {
  contentType?: "text" | "html";
  content?: string;
}

export interface GraphChatMessageFrom {
  user?: {
    id?: string;
    displayName?: string;
  };
  application?: {
    id?: string;
    displayName?: string;
  };
}

export interface GraphChatMessage {
  id: string;
  createdDateTime?: string;
  body?: GraphItemBody;
  from?: GraphChatMessageFrom;
}

export interface ActiveMember {
  uid: string;
  firstName: string;
  email: string;
  avatarUrl: string | null;
}

export interface ChatUserIdentity {
  uid: string;
  displayName: string;
  email?: string | null;
}

type ChatDoc = {
  type?: string;
  memberIds?: unknown;
  memberNames?: unknown;
  memberEmails?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastMessageText?: unknown;
  lastMessageSenderUid?: unknown;
};

type ChatMessageDoc = {
  text?: unknown;
  senderUid?: unknown;
  senderName?: unknown;
  createdAt?: unknown;
};

const CHAT_COLLECTION = "internalChats";
const CHAT_MESSAGES_SUBCOLLECTION = "messages";
const USERS_COLLECTION = "users";
const MAX_CHATS = 200;
const MAX_MESSAGES = 500;
const MAX_USERS = 300;

function readTimestampAsIso(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const maybeToDate = (value as { toDate?: unknown }).toDate;
  if (typeof maybeToDate === "function") {
    const date = maybeToDate.call(value) as Date;
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function readStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const map: Record<string, string> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry === "string" && entry.trim().length > 0) {
      map[key] = entry.trim();
    }
  });
  return map;
}

function mapChatDoc(chatId: string, raw: ChatDoc): GraphChat {
  return {
    id: chatId,
    chatType: typeof raw.type === "string" ? raw.type : "dm",
    createdDateTime: readTimestampAsIso(raw.createdAt),
    lastUpdatedDateTime: readTimestampAsIso(raw.updatedAt) ?? readTimestampAsIso(raw.createdAt),
    memberIds: readStringArray(raw.memberIds),
    memberNames: readStringMap(raw.memberNames),
    memberEmails: readStringMap(raw.memberEmails),
    lastMessageText:
      typeof raw.lastMessageText === "string" ? raw.lastMessageText : undefined,
    lastMessageSenderUid:
      typeof raw.lastMessageSenderUid === "string" ? raw.lastMessageSenderUid : undefined,
  };
}

function mapMessageDoc(messageId: string, raw: ChatMessageDoc): GraphChatMessage {
  const messageText = typeof raw.text === "string" ? raw.text : "";
  const senderUid = typeof raw.senderUid === "string" ? raw.senderUid : undefined;
  const senderName = typeof raw.senderName === "string" ? raw.senderName : "Ukjent";

  return {
    id: messageId,
    createdDateTime: readTimestampAsIso(raw.createdAt),
    body: {
      contentType: "text",
      content: messageText,
    },
    from: {
      user: {
        id: senderUid,
        displayName: senderName,
      },
    },
  };
}

function parseIsoMs(iso?: string): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function fallbackDisplayName(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedEmail = email?.trim().toLowerCase();
  if (trimmedEmail) return trimmedEmail.split("@")[0];

  return "Bruker";
}

export function subscribeMyChats(
  userUid: string,
  onData: (chats: GraphChat[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const chatsQuery = query(
    collection(db, CHAT_COLLECTION),
    where("memberIds", "array-contains", userUid),
    limit(MAX_CHATS)
  );

  return onSnapshot(
    chatsQuery,
    (snap) => {
      const chats = snap.docs
        .map((chatDoc) => mapChatDoc(chatDoc.id, chatDoc.data() as ChatDoc))
        .sort((a, b) => parseIsoMs(b.lastUpdatedDateTime) - parseIsoMs(a.lastUpdatedDateTime));
      onData(chats);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribeChatMessages(
  chatId: string,
  onData: (messages: GraphChatMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesQuery = query(
    collection(db, CHAT_COLLECTION, chatId, CHAT_MESSAGES_SUBCOLLECTION),
    limit(MAX_MESSAGES)
  );

  return onSnapshot(
    messagesQuery,
    (snap) => {
      const messages = snap.docs
        .map((messageDoc) => mapMessageDoc(messageDoc.id, messageDoc.data() as ChatMessageDoc))
        .sort((a, b) => parseIsoMs(a.createdDateTime) - parseIsoMs(b.createdDateTime));
      onData(messages);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function listActiveMembers(currentUid: string): Promise<ActiveMember[]> {
  const usersQuery = query(collection(db, USERS_COLLECTION), limit(MAX_USERS));
  const usersSnap = await getDocs(usersQuery);

  const rows: ActiveMember[] = usersSnap.docs
    .map((userDoc) => {
      const data = userDoc.data() as Record<string, unknown>;
      const approved = data.approved !== false;
      if (!approved) return null;

      const uid = userDoc.id;
      if (!uid || uid === currentUid) return null;

      const email = typeof data.email === "string" ? data.email.trim() : "";
      if (!email) return null;

      const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
      const avatarUrl = typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : null;

      return {
        uid,
        firstName: firstName || email.split("@")[0] || "Bruker",
        email,
        avatarUrl,
      };
    })
    .filter((entry): entry is ActiveMember => Boolean(entry));

  rows.sort((a, b) => {
    const nameOrder = a.firstName.localeCompare(b.firstName, "nb");
    if (nameOrder !== 0) return nameOrder;
    return a.email.localeCompare(b.email, "nb");
  });

  return rows;
}

export async function ensureDirectChat(
  currentUser: ChatUserIdentity,
  targetUser: ActiveMember
): Promise<string> {
  const memberIds = [currentUser.uid, targetUser.uid].sort();
  const chatId = `dm_${memberIds[0]}_${memberIds[1]}`;
  const chatRef = doc(db, CHAT_COLLECTION, chatId);
  const chatSnap = await getDoc(chatRef);

  const memberNames: Record<string, string> = {
    [currentUser.uid]: fallbackDisplayName(currentUser.displayName, currentUser.email),
    [targetUser.uid]: fallbackDisplayName(targetUser.firstName, targetUser.email),
  };

  const memberEmails: Record<string, string> = {};
  if (currentUser.email?.trim()) {
    memberEmails[currentUser.uid] = currentUser.email.trim();
  }
  if (targetUser.email?.trim()) {
    memberEmails[targetUser.uid] = targetUser.email.trim();
  }

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      type: "dm",
      memberIds,
      memberNames,
      memberEmails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageText: "",
      lastMessageSenderUid: null,
    });
    return chatId;
  }

  await setDoc(
    chatRef,
    {
      memberNames,
      memberEmails,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return chatId;
}

export async function sendChatMessage(
  chatId: string,
  message: string,
  sender: ChatUserIdentity
): Promise<void> {
  const text = message.trim();
  if (!text) return;

  const senderName = fallbackDisplayName(sender.displayName, sender.email);
  const senderEmail = sender.email?.trim() || "";

  await addDoc(collection(db, CHAT_COLLECTION, chatId, CHAT_MESSAGES_SUBCOLLECTION), {
    text,
    senderUid: sender.uid,
    senderName,
    senderEmail,
    createdAt: serverTimestamp(),
  });

  const memberNames: Record<string, string> = { [sender.uid]: senderName };
  const memberEmails: Record<string, string> = senderEmail ? { [sender.uid]: senderEmail } : {};

  await setDoc(
    doc(db, CHAT_COLLECTION, chatId),
    {
      updatedAt: serverTimestamp(),
      lastMessageText: text.slice(0, 280),
      lastMessageSenderUid: sender.uid,
      memberNames,
      memberEmails,
    },
    { merge: true }
  );
}
