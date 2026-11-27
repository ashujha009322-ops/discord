export type RelationshipStatus =
  | "NONE"
  | "FRIEND"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "BLOCKED"
  | "SELF";

export interface MemberRoleDTO {
  id: string;
  name: string;
  color: number | null; // Stored as Int in Prisma (e.g., 0x5865F2)
  position: number;
}

export interface GuildMemberDTO {
  userId: string;
  guildId: string;
  username: string;
  displayName: string | null;
  nickname: string | null;
  /** Resolved display name: nickname ?? displayName ?? username */
  effectiveName: string;
  avatarUrl: string | null;
  isBot: boolean;
  isOwner: boolean;
  joinedAt: string; // ISO string
  timeoutUntil: string | null;
  roles: MemberRoleDTO[];
  highestRolePosition: number;
  relationshipStatus: RelationshipStatus;
}

export interface MemberProfileDTO extends GuildMemberDTO {
  bannerUrl: string | null;
  bio: string | null;
  accountCreatedAt: string; // User.createdAt ISO string
  guild: {
    id: string;
    name: string;
    iconUrl: string | null;
  };
}

export interface ViewerPermissionsDTO {
  isOwner: boolean;
  highestRolePosition: number;
  canManageNicknames: boolean;
  canManageRoles: boolean;
  canKickMembers: boolean;
  canBanMembers: boolean;
}

export interface GuildMembersResponse {
  members: GuildMemberDTO[];
  viewerPermissions: ViewerPermissionsDTO;
}
