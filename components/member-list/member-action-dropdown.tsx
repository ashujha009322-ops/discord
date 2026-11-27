"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  User,
  MessageSquare,
  UserPlus,
  UserMinus,
  UserCheck,
  Ban,
  ShieldAlert,
  Pencil,
  Shield,
  UserX,
  Gavel,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GuildMemberDTO,
  ViewerPermissionsDTO,
} from "@/features/memberList/member";
import { useMemberStore } from "@/store/use-member-store";
import { cn } from "@/lib/utils";

interface MemberActionDropdownProps {
  member: GuildMemberDTO;
  viewerPermissions: ViewerPermissionsDTO | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MemberActionDropdown({
  member,
  viewerPermissions,
  open,
  onOpenChange,
}: MemberActionDropdownProps) {
  const router = useRouter();
  const [isCreatingDm, setIsCreatingDm] = useState(false);

  const openProfileModal = useMemberStore((s) => s.openProfileModal);
  const openActionModal = useMemberStore((s) => s.openActionModal);
  const updateRelationship = useMemberStore((s) => s.updateRelationship);

  const isSelf = member.relationshipStatus === "SELF";

  // Hierarchy check: owner can moderate anyone except self; others must strictly outrank target
  const canOutrankTarget =
    !isSelf &&
    !member.isOwner &&
    !!viewerPermissions &&
    (viewerPermissions.isOwner ||
      viewerPermissions.highestRolePosition > member.highestRolePosition);

  const canChangeNickname =
    !!viewerPermissions &&
    (isSelf || (viewerPermissions.canManageNicknames && canOutrankTarget));

  const canManageRoles =
    !!viewerPermissions &&
    viewerPermissions.canManageRoles &&
    (viewerPermissions.isOwner || canOutrankTarget);

  const canKick =
    !!viewerPermissions && viewerPermissions.canKickMembers && canOutrankTarget;

  const canBan =
    !!viewerPermissions && viewerPermissions.canBanMembers && canOutrankTarget;

  const hasAnyModerationAction =
    canChangeNickname || canManageRoles || canKick || canBan;

  const handleStartDm = async () => {
    if (isCreatingDm) return;
    setIsCreatingDm(true);
    try {
      const res = await fetch("/api/channels/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: member.userId }),
      });
      if (res.ok) {
        const { channelId } = await res.json();
        router.push(`/channels/@me/${channelId}`);
      }
    } finally {
      setIsCreatingDm(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Member actions for ${member.effectiveName}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "ml-auto p-1 rounded text-[#b5bac1] hover:text-white hover:bg-[#404249]",
              "opacity-0 group-hover:opacity-100 focus:opacity-100 data-[popup-open]:opacity-100",
              "transition-opacity focus:outline-none",
            )}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        }
      />

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-52 bg-[#111214] border-[#1e1f22] text-[#b5bac1] p-1.5 shadow-xl"
      >
        {/* Primary Profile Action */}
        <DropdownMenuItem
          onClick={() => openProfileModal(member.guildId, member.userId)}
          className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
        >
          <span>View Profile</span>
          <User className="w-4 h-4" />
        </DropdownMenuItem>

        {/* Social Actions (Hidden for Self) */}
        {!isSelf && (
          <>
            <DropdownMenuItem
              disabled={isCreatingDm || member.relationshipStatus === "BLOCKED"}
              onClick={handleStartDm}
              className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
            >
              <span>Message</span>
              <MessageSquare className="w-4 h-4" />
            </DropdownMenuItem>

            {member.relationshipStatus === "NONE" && (
              <DropdownMenuItem
                onClick={() => updateRelationship(member.userId, "ADD_FRIEND")}
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
              >
                <span>Add Friend</span>
                <UserPlus className="w-4 h-4" />
              </DropdownMenuItem>
            )}

            {member.relationshipStatus === "PENDING_SENT" && (
              <DropdownMenuItem
                onClick={() =>
                  updateRelationship(member.userId, "REMOVE_FRIEND")
                }
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
              >
                <span>Cancel Friend Request</span>
                <UserMinus className="w-4 h-4" />
              </DropdownMenuItem>
            )}

            {member.relationshipStatus === "PENDING_RECEIVED" && (
              <DropdownMenuItem
                onClick={() =>
                  updateRelationship(member.userId, "ACCEPT_FRIEND")
                }
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#23a55a] focus:text-white"
              >
                <span>Accept Friend Request</span>
                <UserCheck className="w-4 h-4" />
              </DropdownMenuItem>
            )}

            {member.relationshipStatus === "FRIEND" && (
              <DropdownMenuItem
                onClick={() =>
                  updateRelationship(member.userId, "REMOVE_FRIEND")
                }
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
              >
                <span>Remove Friend</span>
                <UserMinus className="w-4 h-4" />
              </DropdownMenuItem>
            )}

            {member.relationshipStatus === "BLOCKED" ? (
              <DropdownMenuItem
                onClick={() => updateRelationship(member.userId, "UNBLOCK")}
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
              >
                <span>Unblock</span>
                <ShieldAlert className="w-4 h-4" />
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => updateRelationship(member.userId, "BLOCK")}
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
              >
                <span>Block</span>
                <Ban className="w-4 h-4" />
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Permission-Gated Moderation Actions */}
        {hasAnyModerationAction && (
          <>
            <DropdownMenuSeparator className="bg-[#2b2d31] my-1" />

            {canChangeNickname && (
              <DropdownMenuItem
                onClick={() =>
                  openActionModal({ type: "CHANGE_NICKNAME", member })
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
                  openActionModal({ type: "MANAGE_ROLES", member })
                }
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer focus:bg-[#5865f2] focus:text-white"
              >
                <span>Manage Roles</span>
                <Shield className="w-4 h-4" />
              </DropdownMenuItem>
            )}

            {canKick && (
              <DropdownMenuItem
                onClick={() => openActionModal({ type: "KICK_MEMBER", member })}
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
              >
                <span>Kick {member.effectiveName}</span>
                <UserX className="w-4 h-4" />
              </DropdownMenuItem>
            )}

            {canBan && (
              <DropdownMenuItem
                onClick={() => openActionModal({ type: "BAN_MEMBER", member })}
                className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer text-[#f23f43] focus:bg-[#da373c] focus:text-white"
              >
                <span>Ban {member.effectiveName}</span>
                <Gavel className="w-4 h-4" />
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
