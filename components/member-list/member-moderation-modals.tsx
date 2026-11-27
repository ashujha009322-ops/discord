/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMemberStore } from "@/store/use-member-store";
import { MemberRoleDTO } from "@/features/memberList/member";
import { intColorToHex } from "@/features/memberList/storage";

export function MemberModerationModals() {
  const activeModal = useMemberStore((s) => s.activeModal);
  const viewerPermissions = useMemberStore((s) => s.viewerPermissions);
  const closeModal = useMemberStore((s) => s.closeModal);
  const updateMemberNickname = useMemberStore((s) => s.updateMemberNickname);
  const updateMemberRoles = useMemberStore((s) => s.updateMemberRoles);
  const kickMember = useMemberStore((s) => s.kickMember);
  const banMember = useMemberStore((s) => s.banMember);

  const [nickname, setNickname] = useState("");
  const [reason, setReason] = useState("");
  const [availableRoles, setAvailableRoles] = useState<MemberRoleDTO[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local form state when modal opens
  useEffect(() => {
    setError(null);
    setReason("");

    if (!activeModal || activeModal.type === "VIEW_PROFILE") return;

    if (activeModal.type === "CHANGE_NICKNAME") {
      setNickname(activeModal.member.nickname ?? "");
    }

    if (activeModal.type === "MANAGE_ROLES") {
      const { member } = activeModal;
      setSelectedRoleIds(member.roles.map((r) => r.id));
      setIsLoadingRoles(true);

      fetch(`/api/guilds/${member.guildId}/roles`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: { roles: MemberRoleDTO[] }) => {
          setAvailableRoles(data.roles || []);
        })
        .catch(() => {
          setError("Could not load server roles.");
        })
        .finally(() => setIsLoadingRoles(false));
    }
  }, [activeModal]);

  if (!activeModal || activeModal.type === "VIEW_PROFILE") {
    return null;
  }

  const { member } = activeModal;

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const trimmed = nickname.trim();
      await updateMemberNickname(
        member.guildId,
        member.userId,
        trimmed.length > 0 ? trimmed : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save nickname");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSaveRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await updateMemberRoles(member.guildId, member.userId, selectedRoleIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update roles");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (activeModal.type === "KICK_MEMBER") {
        await kickMember(member.guildId, member.userId, reason || undefined);
      } else if (activeModal.type === "BAN_MEMBER") {
        await banMember(member.guildId, member.userId, reason || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. Change Nickname Modal */}
      <Dialog
        open={activeModal.type === "CHANGE_NICKNAME"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="bg-[#313338] border-[#1e1f22] text-[#dbdee1] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Change Nickname</DialogTitle>
            <DialogDescription className="text-[#b5bac1]">
              Set a server-specific nickname for{" "}
              <strong className="text-white">{member.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNickname} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-1.5">
                Nickname
              </label>
              <input
                type="text"
                maxLength={80}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={member.displayName || member.username}
                className="w-full px-3 py-2 rounded bg-[#1e1f22] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
              <button
                type="button"
                onClick={() => setNickname("")}
                className="mt-1.5 text-xs text-[#00a8fc] hover:underline"
              >
                Reset Nickname
              </button>
            </div>

            {error && <p className="text-xs text-[#f23f43]">{error}</p>}

            <DialogFooter>
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-[#dbdee1] hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-medium"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Manage Roles Modal */}
      <Dialog
        open={activeModal.type === "MANAGE_ROLES"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="bg-[#313338] border-[#1e1f22] text-[#dbdee1] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Manage Roles — {member.effectiveName}
            </DialogTitle>
            <DialogDescription className="text-[#b5bac1]">
              Assign or remove roles below your highest role position.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoles} className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {isLoadingRoles ? (
                <p className="text-xs text-[#949ba4] py-4 text-center">
                  Loading roles...
                </p>
              ) : availableRoles.length === 0 ? (
                <p className="text-xs text-[#949ba4] py-4 text-center">
                  No custom roles found in this server.
                </p>
              ) : (
                availableRoles.map((role) => {
                  const isAssignable =
                    !!viewerPermissions &&
                    (viewerPermissions.isOwner ||
                      viewerPermissions.highestRolePosition > role.position);
                  const checked = selectedRoleIds.includes(role.id);

                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={!isAssignable}
                      onClick={() => toggleRole(role.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded bg-[#2b2d31] hover:bg-[#35373c] disabled:opacity-40 text-left text-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: intColorToHex(role.color) }}
                        />
                        <span className="text-white truncate">{role.name}</span>
                      </span>

                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          checked
                            ? "bg-[#5865f2] border-[#5865f2] text-white"
                            : "border-[#80848e]"
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {error && <p className="text-xs text-[#f23f43]">{error}</p>}

            <DialogFooter>
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-[#dbdee1] hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingRoles}
                className="px-4 py-2 rounded bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm font-medium"
              >
                {isSubmitting ? "Saving..." : "Save Roles"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Kick / Ban Confirmation Modal */}
      <Dialog
        open={
          activeModal.type === "KICK_MEMBER" ||
          activeModal.type === "BAN_MEMBER"
        }
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="bg-[#313338] border-[#1e1f22] text-[#dbdee1] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {activeModal.type === "KICK_MEMBER"
                ? `Kick '${member.effectiveName}'`
                : `Ban '${member.effectiveName}'`}
            </DialogTitle>
            <DialogDescription className="text-[#b5bac1]">
              {activeModal.type === "KICK_MEMBER"
                ? `Are you sure you want to kick ${member.effectiveName} from the server? They will be able to rejoin with a new invite.`
                : `Are you sure you want to ban ${member.effectiveName}? They will be removed and prevented from rejoining.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleModerationSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#b5bac1] mb-1.5">
                Reason (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter a reason for the audit log..."
                className="w-full px-3 py-2 rounded bg-[#1e1f22] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#da373c] resize-none"
              />
            </div>

            {error && <p className="text-xs text-[#f23f43]">{error}</p>}

            <DialogFooter>
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-[#dbdee1] hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded bg-[#da373c] hover:bg-[#a12828] disabled:opacity-50 text-white text-sm font-medium"
              >
                {isSubmitting
                  ? "Processing..."
                  : activeModal.type === "KICK_MEMBER"
                    ? "Kick"
                    : "Ban"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
