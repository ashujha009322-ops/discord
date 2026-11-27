import { create } from "zustand";
import {
  GuildMemberDTO,
  GuildMembersResponse,
  MemberProfileDTO,
  RelationshipStatus,
  ViewerPermissionsDTO,
} from "@/features/memberList/member";

export type ActiveMemberModal =
  | { type: "VIEW_PROFILE"; userId: string }
  | { type: "CHANGE_NICKNAME"; member: GuildMemberDTO }
  | { type: "MANAGE_ROLES"; member: GuildMemberDTO }
  | { type: "KICK_MEMBER"; member: GuildMemberDTO }
  | { type: "BAN_MEMBER"; member: GuildMemberDTO }
  | null;

interface MemberStoreState {
  activeGuildId: string | null;
  members: GuildMemberDTO[];
  viewerPermissions: ViewerPermissionsDTO | null;
  isLoadingMembers: boolean;
  membersError: string | null;

  // Profile dialog cache & loading state
  profilesByKey: Record<string, MemberProfileDTO>;
  isLoadingProfile: boolean;
  profileError: string | null;

  // Modal state
  activeModal: ActiveMemberModal;

  // Actions
  fetchGuildMembers: (guildId: string) => Promise<void>;
  openProfileModal: (guildId: string, userId: string) => Promise<void>;
  openActionModal: (modal: Exclude<ActiveMemberModal, null>) => void;
  closeModal: () => void;

  // Mutations
  updateRelationship: (
    targetUserId: string,
    action:
      | "ADD_FRIEND"
      | "ACCEPT_FRIEND"
      | "REMOVE_FRIEND"
      | "BLOCK"
      | "UNBLOCK",
  ) => Promise<void>;
  updateMemberNickname: (
    guildId: string,
    userId: string,
    nickname: string | null,
  ) => Promise<void>;
  updateMemberRoles: (
    guildId: string,
    userId: string,
    roleIds: string[],
  ) => Promise<void>;
  kickMember: (
    guildId: string,
    userId: string,
    reason?: string,
  ) => Promise<void>;
  banMember: (
    guildId: string,
    userId: string,
    reason?: string,
  ) => Promise<void>;
}

const NEXT_RELATIONSHIP_MAP: Record<
  "ADD_FRIEND" | "ACCEPT_FRIEND" | "REMOVE_FRIEND" | "BLOCK" | "UNBLOCK",
  RelationshipStatus
> = {
  ADD_FRIEND: "PENDING_SENT",
  ACCEPT_FRIEND: "FRIEND",
  REMOVE_FRIEND: "NONE",
  BLOCK: "BLOCKED",
  UNBLOCK: "NONE",
};

export const useMemberStore = create<MemberStoreState>((set, get) => ({
  activeGuildId: null,
  members: [],
  viewerPermissions: null,
  isLoadingMembers: false,
  membersError: null,

  profilesByKey: {},
  isLoadingProfile: false,
  profileError: null,

  activeModal: null,

  fetchGuildMembers: async (guildId: string) => {
    set({
      activeGuildId: guildId,
      isLoadingMembers: true,
      membersError: null,
    });

    try {
      const res = await fetch(`/api/guilds/${guildId}/members`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load guild members");
      }

      const data: GuildMembersResponse = await res.json();
      set({
        members: data.members,
        viewerPermissions: data.viewerPermissions,
        isLoadingMembers: false,
      });
    } catch (err) {
      set({
        isLoadingMembers: false,
        membersError:
          err instanceof Error ? err.message : "Failed to load guild members",
      });
    }
  },

  openProfileModal: async (guildId: string, userId: string) => {
    const cacheKey = `${guildId}:${userId}`;
    const cached = get().profilesByKey[cacheKey];

    set({
      activeModal: { type: "VIEW_PROFILE", userId },
      profileError: null,
      isLoadingProfile: !cached,
    });

    try {
      const res = await fetch(`/api/guilds/${guildId}/members/${userId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load member profile");
      }

      const profile: MemberProfileDTO = await res.json();
      set((state) => ({
        profilesByKey: {
          ...state.profilesByKey,
          [cacheKey]: profile,
        },
        isLoadingProfile: false,
      }));
    } catch (err) {
      set({
        isLoadingProfile: false,
        profileError:
          err instanceof Error ? err.message : "Failed to load member profile",
      });
    }
  },

  openActionModal: (modal) => set({ activeModal: modal }),

  closeModal: () => set({ activeModal: null, profileError: null }),

  updateRelationship: async (targetUserId, action) => {
    const prevMembers = get().members;
    const optimisticStatus = NEXT_RELATIONSHIP_MAP[action];

    // Optimistic update in member list and profile cache
    set((state) => {
      const updatedProfiles = { ...state.profilesByKey };
      if (state.activeGuildId) {
        const key = `${state.activeGuildId}:${targetUserId}`;
        if (updatedProfiles[key]) {
          updatedProfiles[key] = {
            ...updatedProfiles[key],
            relationshipStatus: optimisticStatus,
          };
        }
      }

      return {
        members: state.members.map((m) =>
          m.userId === targetUserId
            ? { ...m, relationshipStatus: optimisticStatus }
            : m,
        ),
        profilesByKey: updatedProfiles,
      };
    });

    try {
      const res = await fetch(`/api/relationships/${targetUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        throw new Error("Relationship update failed");
      }
    } catch {
      // Rollback on failure
      set({ members: prevMembers });
    }
  },

  updateMemberNickname: async (guildId, userId, nickname) => {
    const res = await fetch(
      `/api/guilds/${guildId}/members/${userId}/nickname`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update nickname");
    }

    await get().fetchGuildMembers(guildId);
    set((state) => {
      const nextCache = { ...state.profilesByKey };
      delete nextCache[`${guildId}:${userId}`];
      return { profilesByKey: nextCache, activeModal: null };
    });
  },

  updateMemberRoles: async (guildId, userId, roleIds) => {
    const res = await fetch(`/api/guilds/${guildId}/members/${userId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update roles");
    }

    await get().fetchGuildMembers(guildId);
    set((state) => {
      const nextCache = { ...state.profilesByKey };
      delete nextCache[`${guildId}:${userId}`];
      return { profilesByKey: nextCache, activeModal: null };
    });
  },

  kickMember: async (guildId, userId, reason) => {
    const res = await fetch(`/api/guilds/${guildId}/members/${userId}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to kick member");
    }

    set((state) => ({
      members: state.members.filter((m) => m.userId !== userId),
      activeModal: null,
    }));
  },

  banMember: async (guildId, userId, reason) => {
    const res = await fetch(`/api/guilds/${guildId}/members/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to ban member");
    }

    set((state) => ({
      members: state.members.filter((m) => m.userId !== userId),
      activeModal: null,
    }));
  },
}));
