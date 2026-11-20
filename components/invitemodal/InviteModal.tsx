"use client";

import { Check, Copy, Hash } from "lucide-react";
import { useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCopyToClipboard } from "../../features/invite/useCopyToClipboard";
import { useInviteLink } from "../../features/invite/useInviteLink";
import { describeInviteExpiry } from "../../features/invite/describeInviteExpiry";
import { useModal } from "@/store/use-modal-store";

/** What the dialog is showing. Kept apart from the store: see the note in InviteModal. */
type InviteTarget = {
  guildId: string;
  guildName: string;
  channelId: string | null;
};

/** Connects the dialog to the Zustand modal store. Mount once, next to your other modals. */
export function InviteModal() {
  const { isOpen, type, data, onClose } = useModal();
  const open = isOpen && type === "invite";

  // `onClose()` resets the store's `data` to {} immediately, but the dialog keeps
  // rendering while it animates out. Without a copy, the content would vanish
  // mid-animation and an empty box would fade away. So we remember the last target.
  // Updating state during render, guarded so it settles after one extra pass, is
  // React's documented pattern for state derived from props or external values.
  const [target, setTarget] = useState<InviteTarget | null>(null);
  if (open && data.guildId) {
    const next: InviteTarget = {
      guildId: data.guildId,
      guildName: data.guildName ?? "this server",
      channelId: data.channelId ?? null,
    };
    if (
      target?.guildId !== next.guildId ||
      target.guildName !== next.guildName ||
      target.channelId !== next.channelId
    ) {
      setTarget(next);
    }
  }

  // While open, only trust `data`; while closing, show the remembered target.
  const showBody = target !== null && (!open || Boolean(data.guildId));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden border-none bg-[#313338] p-0 text-[#dbdee1] sm:max-w-[440px]">
        {showBody ? (
          <InviteDialogBody
            guildId={target.guildId}
            guildName={target.guildName}
            channelId={target.channelId}
          />
        ) : (
          // Keeps the dialog accessible (it requires a title) if opened without data.
          <DialogTitle className="sr-only">Invite friends</DialogTitle>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Lives inside DialogContent on purpose: it unmounts when the dialog closes, so the
 * fetch and copy state reset on every open.
 */
function InviteDialogBody(props: {
  guildId: string;
  guildName: string;
  channelId: string | null;
}) {
  const { state, retry } = useInviteLink({
    guildId: props.guildId,
    channelId: props.channelId,
  });
  const { status: copyStatus, copy } = useCopyToClipboard();
  const inputRef = useRef<HTMLInputElement>(null);

  const invite = state.status === "ready" ? state.invite : null;
  const copied = copyStatus === "copied";

  return (
    <>
      <DialogHeader className="gap-1 p-6 pb-5 text-left">
        <DialogTitle className="text-xl font-semibold text-white">
          Invite friends to {props.guildName}
        </DialogTitle>
        <DialogDescription className="text-[#b5bac1]">
          {state.status === "loading" && "Preparing your invite link..."}
          {state.status === "error" && "We could not create an invite link."}
          {invite && (
            <>
              Recipients will land in{" "}
              <Hash className="inline h-4 w-4 align-[-2px]" />
              <span className="font-medium">
                {invite.channel.name ?? "a channel"}
              </span>
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="border-t border-[#1f2023] bg-[#2b2d31] p-6">
        <label
          htmlFor="invite-link"
          className="mb-2 block text-base font-semibold text-white"
        >
          Send a server invite link to a friend
        </label>

        {state.status === "error" ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-md bg-[#1e1f22] p-3 text-sm text-[#f23f43]"
          >
            <span>{state.message}</span>
            {state.retryable && (
              <button
                type="button"
                onClick={retry}
                className="shrink-0 rounded bg-[#4e5058] px-3 py-1.5 font-medium text-white transition hover:bg-[#6d6f78]"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-2 rounded-md border border-[#1e1f22] bg-[#1e1f22] p-1"
            aria-busy={state.status === "loading"}
          >
            {invite ? (
              <input
                id="invite-link"
                ref={inputRef}
                readOnly
                value={invite.url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent px-2 text-base text-[#dbdee1] outline-none"
              />
            ) : (
              <div className="h-8 flex-1 animate-pulse rounded bg-[#2b2d31]" />
            )}
            <button
              type="button"
              disabled={!invite}
              onClick={() => invite && void copy(invite.url, inputRef.current)}
              className={`flex h-8 min-w-[76px] items-center justify-center gap-1.5 rounded px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                copied ? "bg-[#248046]" : "bg-[#5865f2] hover:bg-[#4752c4]"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy
                </>
              )}
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <p className="mt-3 text-sm text-[#949ba4]">
            {describeInviteExpiry(state.invite.expiresAt, state.receivedAt)}
          </p>
        )}

        {copyStatus === "failed" && (
          <p role="alert" className="mt-2 text-sm text-[#f23f43]">
            Could not copy automatically. The link is selected: press Ctrl+C
            (Cmd+C on Mac).
          </p>
        )}

        {/* Screen-reader announcement for the Copy button */}
        <p role="status" aria-live="polite" className="sr-only">
          {copied ? "Invite link copied" : ""}
        </p>
      </div>
    </>
  );
}
