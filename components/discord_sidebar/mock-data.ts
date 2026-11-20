import { Server, DirectMessageItem, User } from "./types";

export const currentUser: User = {
  id: "u-0",
  name: "Edvard",
  username: "edvard9579",
  avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Edvard",
  status: "online",
};

export const mockDMs: DirectMessageItem[] = [
  {
    id: "dm-1",
    user: {
      id: "u-1",
      name: "WAHD",
      username: "wahd",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=WAHD",
      status: "dnd",
    },
  },
  {
    id: "dm-2",
    user: {
      id: "u-2",
      name: "exquisite_hamster_53207",
      username: "exquisite_hamster",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hamster",
      status: "offline",
    },
  },
  {
    id: "dm-3",
    user: {
      id: "u-3",
      name: "Zara V",
      username: "zara_v",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zara",
      status: "offline",
      badge: "QUIA",
    },
  },
  {
    id: "dm-4",
    user: {
      id: "u-4",
      name: "Amith Sai Reddy",
      username: "amith_sai",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amith",
      status: "offline",
    },
  },
  {
    id: "dm-5",
    user: {
      id: "u-5",
      name: "Neila",
      username: "neila",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neila",
      status: "online",
      customStatus: "Pursuing a degree in Blorbo Husbandry.",
    },
  },
];

export const mockServers: Server[] = [
  {
    id: "s-1",
    name: "My stories - Christal",
    iconUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=Christal",
    unreadCount: 14,
    hasUnread: true,
    boostCount: 0,
    boostGoal: 33,
    categories: [
      {
        id: "cat-1",
        name: "General",
        channels: [
          { id: "c-1", name: "general-chat", type: "text" },
          { id: "c-2", name: "bl-talk", type: "text", hasUnread: true },
        ],
      },
      {
        id: "cat-2",
        name: "Important",
        channels: [
          { id: "c-3", name: "suggestions-for-the-server", type: "text" },
          {
            id: "c-4",
            name: "new-episodes",
            type: "text",
            unreadCount: 8,
            hasUnread: true,
          },
          { id: "c-5", name: "announcements", type: "text" },
          {
            id: "c-6",
            name: "goals-for-the-year",
            type: "text",
            unreadCount: 1,
            hasUnread: true,
          },
        ],
      },
      {
        id: "cat-3",
        name: "STORY",
        channels: [
          {
            id: "c-7",
            name: "qna-for-ingsgiving-goals",
            type: "text",
            unreadCount: 2,
            hasUnread: true,
          },
          { id: "c-8", name: "ask", type: "text", hasUnread: true },
          {
            id: "c-9",
            name: "achievements",
            type: "text",
            unreadCount: 1,
            hasUnread: true,
          },
          {
            id: "c-10",
            name: "pictures-and-more",
            type: "text",
            unreadCount: 1,
            hasUnread: true,
          },
          {
            id: "c-11",
            name: "spoiler-if-you-want",
            type: "text",
            unreadCount: 1,
            hasUnread: true,
          },
          { id: "c-12", name: "fangirl-together", type: "text" },
        ],
      },
    ],
  },
  {
    id: "s-2",
    name: "Anime Corner",
    unreadCount: 25,
    hasUnread: true,
    categories: [],
  },
  {
    id: "s-3",
    name: "Web Dev Lounge",
    hasAudioActivity: true,
    hasUnread: true,
    categories: [],
  },
  {
    id: "s-4",
    name: "Ink & Tone",
    unreadCount: 46,
    hasUnread: true,
    categories: [],
  },
];
