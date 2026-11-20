export type UserStatus = "online" | "idle" | "dnd" | "offline";

export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  status: UserStatus;
  customStatus?: string;
  badge?: string; // e.g., "QUIA"
}

export interface DirectMessageItem {
  id: string;
  user: User;
  unreadCount?: number;
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
  unreadCount?: number;
  hasUnread?: boolean;
}

export interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  unreadCount?: number;
  hasUnread?: boolean;
  hasAudioActivity?: boolean;
  boostCount?: number;
  boostGoal?: number;
  categories: Category[];
}

export interface Message {
  id: string;
  user: User;
  content: string;
  timestamp: string;
  attachments?: { url: string; type: "image" | "file" }[];
}

export interface ServerMember {
  user: User;
  role: "Online" | "Offline" | "Admin" | "Moderator";
}
