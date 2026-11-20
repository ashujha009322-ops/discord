import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import type { MessageDTO } from "../messages/Types";

/**
 * The ONE select used whenever a message is read or returned. Every action
 * (and, in Stage 3, every realtime broadcast) goes through it, so the DTO
 * shape can never differ between "fetched" and "pushed" messages.
 *
 * - `authorId` is kept for permission checks; it is not part of the DTO.
 * - Only READY attachments are returned. `MessageAttachment.status` defaults
 *   to PENDING in the schema, so rows must be written as READY explicitly
 *   (Stage 5 does this) before they become visible.
 * - `satisfies` makes TypeScript validate the field names against your Prisma
 *   schema without widening the literal type Prisma needs for result typing.
 */
export const messageSelect = {
  id: true,
  channelId: true,
  authorId: true,
  content: true,
  createdAt: true,
  editedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarKey: true,
    },
  },
  attachments: {
    where: { status: "READY" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      objectKey: true,
      filename: true,
      contentType: true,
      sizeBytes: true,
    },
  },
} satisfies Prisma.MessageSelect;

/**
 * What Prisma returns for `messageSelect`, written out by hand. Passing a
 * query result to `toMessageDTO` is type-checked against this shape, so the
 * select and the mapper cannot silently drift apart.
 */
export type MessageRow = {
  id: string;
  channelId: string;
  authorId: string | null;
  content: string | null;
  createdAt: Date;
  editedAt: Date | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarKey: string | null;
  } | null;
  attachments: {
    id: string;
    objectKey: string;
    filename: string;
    contentType: string;
    sizeBytes: bigint;
  }[];
};

/** objectKey -> signed URL. Empty until Stage 5 adds URL signing. */
export type AttachmentUrlMap = ReadonlyMap<string, string>;

const NO_URLS: AttachmentUrlMap = new Map();

export function toMessageDTO(
  row: MessageRow,
  attachmentUrls: AttachmentUrlMap = NO_URLS,
): MessageDTO {
  return {
    id: row.id,
    channelId: row.channelId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    // Fields are copied one by one on purpose: nothing extra can leak to
    // clients (or into realtime payloads) if the select grows later.
    author: row.author
      ? {
          id: row.author.id,
          username: row.author.username,
          displayName: row.author.displayName,
          avatarKey: row.author.avatarKey,
        }
      : null,
    attachments: row.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      contentType: attachment.contentType,
      sizeBytes: Number(attachment.sizeBytes),
      url: attachmentUrls.get(attachment.objectKey) ?? null,
    })),
  };
}
