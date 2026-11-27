"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  UserPlus,
  UserCheck,
  Clock,
  MoreHorizontal,
  Crown,
  Sparkles,
  Copy,
  Check,
  Ban,
  ShieldAlert,
  Pencil,
  Shield,
  UserX,
  Gavel,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemberStore } from "@/store/use-member-store";
import { intColorToHex } from "@/features/memberList/storage";

function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}

function renderBioWithLinks(bio: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = bio.split(urlRegex);

  return parts.map((part, idx) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00a8fc] hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MemberProfileDialog() {
  const router = useRouter();
  const [isCreatingDm, setIsCreatingDm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const activeGuildId = useMemberStore((s) => s.activeGuildId);
  const activeModal = useMemberStore((s) => s.activeModal);
  const profilesByKey = useMemberStore((s) => s.profilesByKey);
  const isLoadingProfile = useMemberStore((s) => s.isLoadingProfile);
  const profileError = useMemberStore((s) => s.profileError);
  const viewerPermissions = useMemberStore((s) => s.viewerPermissions);

  const closeModal = useMemberStore((s) => s.closeModal);
  const openActionModal = useMemberStore((s) => s.openActionModal);
  const updateRelationship = useMemberStore((s) => s.updateRelationship);

  const isOpen = activeModal?.type === "VIEW_PROFILE";
  const targetUserId = isOpen ? activeModal.userId : null;
  const profile =
    activeGuildId && targetUserId
      ? profilesByKey[`${activeGuildId}:${targetUserId}`]
      : undefined;

  const isSelf = profile?.relationshipStatus === "SELF";

  const canOutrankTarget =
    !!profile &&
    !isSelf &&
    !profile.isOwner &&
    !!viewerPermissions &&
    (viewerPermissions.isOwner ||
      viewerPermissions.highestRolePosition > profile.highestRolePosition);

  const canChangeNickname =
    !!profile &&
    !!viewerPermissions &&
    (isSelf || (viewerPermissions.canManageNicknames && canOutrankTarget));

  const canManageRoles =
    !!profile &&
    !!viewerPermissions &&
    viewerPermissions.canManageRoles &&
    (viewerPermissions.isOwner || canOutrankTarget);

  const canKick =
    !!profile &&
    !!viewerPermissions &&
    viewerPermissions.canKickMembers &&
    canOutrankTarget;

  const canBan =
    !!profile &&
    !!viewerPermissions &&
    viewerPermissions.canBanMembers &&
    canOutrankTarget;

  const handleStartDm = async () => {
    if (!profile || isCreatingDm) return;
    setIsCreatingDm(true);
    try {
      const res = await fetch("/api/channels/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.userId }),
      });
      if (res.ok) {
        const { channelId } = await res.json();
        closeModal();
        router.push(`/channels/@me/${channelId}`);
      }
    } finally {
      setIsCreatingDm(false);
    }
  };

  const handleCopyUserId = async () => {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="p-0 overflow-hidden bg-[#111214] border-[#1e1f22] text-[#dbdee1] max-w-[440px] rounded-xl shadow-2xl gap-0">
        <DialogTitle className="sr-only">
          {profile ? `${profile.effectiveName}'s Profile` : "Member Profile"}
        </DialogTitle>

        {isLoadingProfile && !profile && (
          <div className="animate-pulse">
            <div className="h-28 bg-[#2b2d31]" />
            <div className="px-4 pb-5">
              <div className="-mt-11 mb-3 w-20 h-20 rounded-full bg-[#35373c] ring-[6px] ring-[#111214]" />
              <div className="h-5 w-36 bg-[#2b2d31] rounded mb-2" />
              <div className="h-3.5 w-24 bg-[#2b2d31] rounded mb-5" />
              <div className="h-24 w-full bg-[#1e1f22] rounded-lg" />
            </div>
          </div>
        )}

        {profileError && !profile && (
          <div className="p-6 text-center">
            <p className="text-sm text-[#f23f43] mb-3">{profileError}</p>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-1.5 text-xs font-medium rounded bg-[#2b2d31] hover:bg-[#35373c] text-white"
            >
              Close
            </button>
          </div>
        )}

        {profile && (
          <div>
            {/* Top Banner */}
            <div className="relative h-28 w-full bg-gradient-to-r from-[#5865f2] to-[#3c45a5]">
              {profile.bannerUrl && (
                <img
                  src={profile.bannerUrl}
                  alt={`${profile.effectiveName} banner`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Avatar + Header Info */}
            <div className="px-4 pb-5">
              <div className="relative flex items-end justify-between -mt-11 mb-3">
                <div className="w-20 h-20 rounded-full bg-[#111214] ring-[6px] ring-[#111214] overflow-hidden shrink-0">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.effectiveName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#5865f2] text-white text-xl font-bold flex items-center justify-center">
                      {profile.effectiveName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Role / Owner Badges */}
                <div className="flex items-center gap-1.5 pb-1">
                  {profile.isOwner && (
                    <span
                      title="Server Owner"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e1f22] border border-[#2b2d31] text-xs font-medium text-[#f0b232]"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Owner
                    </span>
                  )}
                  {profile.isBot && (
                    <span className="px-2 py-1 rounded-md bg-[#5865f2] text-white text-[11px] font-bold uppercase tracking-wide">
                      Bot
                    </span>
                  )}
                </div>
              </div>

              {/* Display Name & Username */}
              <div className="mb-3.5">
                <h2 className="text-xl font-bold text-white leading-tight">
                  {profile.effectiveName}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-[#b5bac1] mt-0.5">
                  <span>{profile.username}</span>
                  {profile.nickname &&
                    profile.displayName &&
                    profile.nickname !== profile.displayName && (
                      <>
                        <span>•</span>
                        <span className="text-xs text-[#949ba4]">
                          AKA {profile.displayName}
                        </span>
                      </>
                    )}
                </div>
              </div>

              {/* Action Buttons Row */}
              {!isSelf && (
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    disabled={
                      isCreatingDm || profile.relationshipStatus === "BLOCKED"
                    }
                    onClick={handleStartDm}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-medium transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>

                  {profile.relationshipStatus === "NONE" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRelationship(profile.userId, "ADD_FRIEND")
                      }
                      title="Add Friend"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white text-sm font-medium transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </button>
                  )}

                  {profile.relationshipStatus === "PENDING_SENT" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRelationship(profile.userId, "REMOVE_FRIEND")
                      }
                      title="Cancel Friend Request"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#2b2d31] hover:bg-[#35373c] text-[#b5bac1] text-sm font-medium transition cursor-pointer"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Pending</span>
                    </button>
                  )}

                  {profile.relationshipStatus === "PENDING_RECEIVED" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRelationship(profile.userId, "ACCEPT_FRIEND")
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#23a55a] hover:bg-[#1a8245] text-white text-sm font-medium transition cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Accept</span>
                    </button>
                  )}

                  {profile.relationshipStatus === "FRIEND" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRelationship(profile.userId, "REMOVE_FRIEND")
                      }
                      title="Remove Friend"
                      className="p-2 rounded-md bg-[#2b2d31] hover:bg-[#35373c] text-[#23a55a] transition cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  )}

                  {/* Overflow More Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          type="button"
                          aria-label="More profile actions"
                          className="p-2 rounded-md bg-[#2b2d31] hover:bg-[#35373c] text-[#b5bac1] hover:text-white transition cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      }
                    />

                    <DropdownMenuContent
                      align="end"
                      className="w-48 bg-[#111214] border-[#1e1f22] text-[#b5bac1] p-1.5"
                    >
                      <DropdownMenuItem
                        onClick={handleCopyUserId}
                        className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
                      >
                        <span>{copiedId ? "Copied ID" : "Copy User ID"}</span>

                        {copiedId ? (
                          <Check className="w-4 h-4 text-[#23a55a]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </DropdownMenuItem>

                      {profile.relationshipStatus === "BLOCKED" ? (
                        <DropdownMenuItem
                          onClick={() =>
                            updateRelationship(profile.userId, "UNBLOCK")
                          }
                          className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
                        >
                          <span>Unblock</span>
                          <ShieldAlert className="w-4 h-4" />
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            updateRelationship(profile.userId, "BLOCK")
                          }
                          className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
                        >
                          <span>Block</span>
                          <Ban className="w-4 h-4" />
                        </DropdownMenuItem>
                      )}

                      {(canChangeNickname ||
                        canManageRoles ||
                        canKick ||
                        canBan) && (
                        <>
                          <DropdownMenuSeparator className="bg-[#2b2d31] my-1" />

                          {canChangeNickname && (
                            <DropdownMenuItem
                              onClick={() =>
                                openActionModal({
                                  type: "CHANGE_NICKNAME",
                                  member: profile,
                                })
                              }
                              className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
                            >
                              <span>Change Nickname</span>
                              <Pencil className="w-4 h-4" />
                            </DropdownMenuItem>
                          )}

                          {canManageRoles && (
                            <DropdownMenuItem
                              onClick={() =>
                                openActionModal({
                                  type: "MANAGE_ROLES",
                                  member: profile,
                                })
                              }
                              className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
                            >
                              <span>Manage Roles</span>
                              <Shield className="w-4 h-4" />
                            </DropdownMenuItem>
                          )}

                          {canKick && (
                            <DropdownMenuItem
                              onClick={() =>
                                openActionModal({
                                  type: "KICK_MEMBER",
                                  member: profile,
                                })
                              }
                              className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
                            >
                              <span>Kick Member</span>
                              <UserX className="w-4 h-4" />
                            </DropdownMenuItem>
                          )}

                          {canBan && (
                            <DropdownMenuItem
                              onClick={() =>
                                openActionModal({
                                  type: "BAN_MEMBER",
                                  member: profile,
                                })
                              }
                              className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
                            >
                              <span>Ban Member</span>
                              <Gavel className="w-4 h-4" />
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Profile Details Card (Bio, Member Since, Roles) */}
              <div className="bg-[#1e1f22] rounded-lg p-3.5 space-y-4">
                {/* Bio */}
                {profile.bio && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[#b5bac1] mb-1">
                      Bio
                    </h4>
                    <p className="text-sm text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                      {renderBioWithLinks(profile.bio)}
                    </p>
                  </div>
                )}

                {/* Member Since (Account Creation & Guild Join Date) */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#b5bac1] mb-1.5">
                    Member Since
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#dbdee1]">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#b5bac1]" />
                      <span>{formatShortDate(profile.accountCreatedAt)}</span>
                    </span>

                    <span className="text-[#4e5058]">•</span>

                    <span className="inline-flex items-center gap-1.5">
                      {profile.guild.iconUrl ? (
                        <img
                          src={profile.guild.iconUrl}
                          alt={profile.guild.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[#35373c] text-[9px] font-bold flex items-center justify-center text-white">
                          {profile.guild.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span>{formatShortDate(profile.joinedAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#b5bac1] mb-1.5">
                    Roles
                  </h4>
                  {profile.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.roles.map((role) => {
                        const hex = intColorToHex(role.color);
                        return (
                          <span
                            key={role.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2b2d31] text-xs font-medium text-[#dbdee1]"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: hex }}
                            />
                            <span>{role.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#949ba4]">No roles assigned</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
