/**
 * Client-safe types shared by server actions, the realtime layer and the
 * Zustand store. Plain data only - no Prisma imports, nothing that can't be
 * serialized to JSON (so: ISO strings instead of Date, number instead of BigInt).
 */

// --- Action results --------------------------------------------------------

export type ErrorCode =
  | "UNAUTHENTICATED" // no Clerk session
  | "USER_NOT_FOUND" // Clerk session exists but no local User row
  | "VALIDATION" // bad input; see `fieldErrors`
  | "NOT_FOUND" // channel / message does not exist
  | "NOT_A_MEMBER" // signed in, but not a member of the guild
  | "FORBIDDEN" // member, but not allowed to do this
  | "UNSUPPORTED_CHANNEL" // channel type is not a guild text channel
  | "TIMED_OUT" // member is currently timed out and cannot send
  | "STORAGE_ERROR" // Supabase Storage upload / removal failed
  | "NETWORK" // client-only: the request never reached the server (offline, deploy mismatch)
  | "INTERNAL"; // anything unexpected (details are logged server-side)

export type FieldErrors = Record<string, string[] | undefined>;

/**
 * Same `{ success, data | error }` shape as the existing guild actions, with
 * two differences: `error` is always a string, and field-level validation
 * messages live in `fieldErrors` instead of being packed into `error`.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code: ErrorCode;
      fieldErrors?: FieldErrors;
    };

// --- Message DTOs -----------------------------------------------------------

export type MessageAuthorDTO = {
  id: string;
  username: string;
  displayName: string | null;
  /** Storage key only; the client resolves it to a URL the same way it does elsewhere. */
  avatarKey: string | null;
};

export type MessageAttachmentDTO = {
  id: string;
  filename: string;
  contentType: string;
  /** DB column is BigInt; our size caps are far below 2^53 so `number` is safe. */
  sizeBytes: number;
  /** Short-lived signed URL, or null if it could not be created. */
  url: string | null;
};

export type MessageDTO = {
  id: string;
  channelId: string;
  content: string | null;
  /** ISO 8601 (UTC). */
  createdAt: string;
  /** ISO 8601 (UTC), or null if never edited. */
  editedAt: string | null;
  /** null when the author's account no longer exists. */
  author: MessageAuthorDTO | null;
  attachments: MessageAttachmentDTO[];
};

/**
 * Keyset cursor. We use (createdAt, id) rather than a bare message id because
 * messages are hard-deleted: if the cursor message were deleted between two
 * page loads, an id-only cursor would no longer resolve and paging would stall.
 */
export type MessageCursor = {
  createdAt: string; // ISO 8601 (UTC)
  id: string;
};

/** Who is looking at the channel, as the server sees it right now. */
export type MessageViewerDTO = {
  /** Used for optimistic messages (it is the real author record). */
  author: MessageAuthorDTO;
  /** The guild owner may edit/delete anyone's messages. */
  isGuildOwner: boolean;
  /** ISO time until which the viewer cannot send (timeout), or null. */
  timeoutUntil: string | null;
};

export type MessagePage = {
  /** Chronological order: oldest -> newest. */
  messages: MessageDTO[];
  /** Pass as `before` to load older messages; null means the start was reached. */
  nextCursor: MessageCursor | null;
  /** Always present, so every (re)sync also refreshes who the viewer is. */
  viewer: MessageViewerDTO;
};

// --- Realtime -----------------------------------------------------------------

/** What a subscribed client receives, already validated and typed. */
export type MessageRealtimeEvent =
  | { type: "created"; message: MessageDTO }
  | { type: "updated"; message: MessageDTO }
  | { type: "deleted"; id: string; channelId: string };

/**
 * idle         - not subscribed (signed out, or no channel selected)
 * connecting   - joining the channel
 * live         - joined; events are flowing
 * disconnected - dropped, refused (e.g. no longer a member) or timed out;
 *                the client keeps retrying on its own
 */
export type RealtimeStatus = "idle" | "connecting" | "live" | "disconnected";
