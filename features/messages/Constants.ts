/**
 * Client-safe constants for the messages feature.
 * Do NOT import anything from Prisma / server-only modules in this file -
 * it is imported by client components and Zod schemas.
 */

// --- Message content -------------------------------------------------------

/** Mirrors `Message.content @db.VarChar(4000)`. */
export const MESSAGE_MAX_LENGTH = 4000;

// --- Pagination ------------------------------------------------------------

export const MESSAGES_DEFAULT_PAGE_SIZE = 50;
export const MESSAGES_MAX_PAGE_SIZE = 100;

// --- Attachments -----------------------------------------------------------

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

/** Per-file cap (applied AFTER browser-side compression). */
export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Total cap per message. Kept below ~4.5 MB because many serverless hosts
 * reject larger request bodies before they reach our code.
 */
export const MAX_TOTAL_ATTACHMENT_BYTES = 4 * 1024 * 1024; // 4 MB

/** Mirrors `MessageAttachment.filename @db.VarChar(255)`. */
export const MAX_FILENAME_LENGTH = 255;

/**
 * Allow-list (not a block-list). Deliberately excludes SVG, HTML, JS and
 * executables: they can carry scripts and would be dangerous to serve back.
 * Extend this list as needed - it is the single source of truth.
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  // images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // documents
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  // archives
  "application/zip",
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

const ALLOWED_MIME_SET: ReadonlySet<string> = new Set(
  ALLOWED_ATTACHMENT_MIME_TYPES,
);

export function isAllowedAttachmentMimeType(
  type: string,
): type is AllowedAttachmentMimeType {
  return ALLOWED_MIME_SET.has(type);
}

// --- Realtime ---------------------------------------------------------------

/**
 * Topic format: `channel:<channel uuid>`. The SQL policy in
 * supabase/sql/001_realtime_message_authorization.sql only authorizes topics
 * that match this exact shape - if you change one, change the other.
 */
export const CHANNEL_TOPIC_PREFIX = "channel:";

export const channelTopic = (channelId: string) =>
  `${CHANNEL_TOPIC_PREFIX}${channelId}`;

/** Broadcast event names. Underscores on purpose: no special characters. */
export const MESSAGE_REALTIME_EVENTS = {
  created: "message_created",
  updated: "message_updated",
  deleted: "message_deleted",
} as const;

/**
 * Clerk session tokens are short-lived (~60 s) and Realtime disconnects a
 * channel whose JWT expires without a fresh one, so the client re-sends the
 * token well inside that window.
 */
export const REALTIME_TOKEN_REFRESH_MS = 45_000;

/** Longest a server action will wait for the broadcast REST call. */
export const REALTIME_BROADCAST_TIMEOUT_MS = 3_000;
