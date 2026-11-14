import { randomUUID } from "node:crypto";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { MAX_PICTURE_BYTES, PICTURE_TYPES, profilePictures, users } from "@/db/schema";
import { deleteStored, readStoredStart, signUpload, storedSize } from "./storage";
import type { Result } from "./validation";

// Everyone logged in may see anyone's picture. Each person changes only their own, and an admin
// may remove anyone's. A picture counts only once its first bytes prove it is a PNG, JPEG or WebP.

export type PictureType = (typeof PICTURE_TYPES)[number];

/** How many uploads one person may have on the way at once. */
const MAX_PENDING = 3;
// Upload links expire after five minutes, so after this nothing can still arrive and the record
// can be cleared away along with anything stored.
const ABANDONED_AFTER = sql`interval '10 minutes'`;

const NOT_FOUND = "That upload is not there any more. Please try again.";

const startsWith = (bytes: Uint8Array, offset: number, expected: number[]) =>
  expected.every((byte, i) => bytes[offset + i] === byte);

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));

/** How many first bytes pictureType needs to see. */
export const SIGNATURE_LENGTH = 12;

/**
 * What a file really is, from its first bytes, whatever its name or the browser said.
 * Null for anything but PNG, JPEG or WebP: SVG, which can carry scripts, is text and never matches.
 */
export function pictureType(bytes: Uint8Array): PictureType | null {
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, 0, ascii("RIFF")) && startsWith(bytes, 8, ascii("WEBP"))) {
    return "image/webp";
  }
  return null;
}

/** Returns what is wrong with the size, or null when it is fine. */
export function pictureSizeProblem(size: number): string | null {
  if (!Number.isSafeInteger(size) || size < 1) return "That picture is empty.";
  if (size > MAX_PICTURE_BYTES) return "Pictures can be at most 2 MB.";
  return null;
}

/** Makes two changes to one person's pictures wait their turn. Used inside a transaction. */
const lockUser = (userId: string) =>
  sql`select 1 from ${users} where ${users.id} = ${userId} for update`;

/**
 * Clears this person's abandoned uploads. The record goes first, and only while still pending,
 * so one that has just been finished is never caught.
 */
async function clearAbandoned(userId: string): Promise<void> {
  const abandoned = await getDb()
    .delete(profilePictures)
    .where(
      and(
        eq(profilePictures.userId, userId),
        eq(profilePictures.status, "pending"),
        lt(profilePictures.createdAt, sql`now() - ${ABANDONED_AFTER}`),
      ),
    )
    .returning({ storageKey: profilePictures.storageKey });
  for (const { storageKey } of abandoned) await deleteStored(storageKey);
}

/**
 * Step 1 of a new picture: records it as pending and returns a short-lived link the browser
 * sends it to. The link is signed for this exact size, so a bigger file is refused.
 */
export async function startPictureUpload(
  userId: string,
  size: number,
): Promise<Result<{ id: string; url: string }>> {
  const problem = pictureSizeProblem(size);
  if (problem) return { ok: false, error: problem };

  await clearAbandoned(userId);

  const id = randomUUID();
  const storageKey = `pictures/${userId}/${id}`;
  const added = await getDb().transaction(async (tx) => {
    await tx.execute(lockUser(userId));
    const [{ waiting }] = await tx
      .select({ waiting: count() })
      .from(profilePictures)
      .where(
        and(
          eq(profilePictures.userId, userId),
          eq(profilePictures.status, "pending"),
          gte(profilePictures.createdAt, sql`now() - ${ABANDONED_AFTER}`),
        ),
      );
    if (waiting >= MAX_PENDING) return false;
    await tx.insert(profilePictures).values({ id, userId, size, storageKey });
    return true;
  });
  if (!added) {
    return { ok: false, error: "Too many uploads at once. Wait a few minutes and try again." };
  }

  return { ok: true, id, url: await signUpload(storageKey, size) };
}

/** Throws away an upload that failed a check: the stored copy first, then the record. */
async function discard(upload: { id: string; storageKey: string }, stored: boolean) {
  if (stored) await deleteStored(upload.storageKey);
  await getDb().delete(profilePictures).where(eq(profilePictures.id, upload.id));
}

/**
 * Step 2: the browser says it has sent the picture. The server checks the size and the first bytes
 * in the bucket before trusting it, then swaps it in for the old picture, which is deleted.
 */
export async function finishPictureUpload(userId: string, pictureId: string): Promise<Result> {
  const [upload] = await getDb()
    .select()
    .from(profilePictures)
    .where(
      and(
        eq(profilePictures.id, pictureId),
        eq(profilePictures.userId, userId),
        eq(profilePictures.status, "pending"),
      ),
    );
  if (!upload) return { ok: false, error: NOT_FOUND };

  const size = await storedSize(upload.storageKey);
  if (size !== upload.size) {
    await discard(upload, size !== null);
    return { ok: false, error: "The upload did not arrive complete. Please try again." };
  }

  const start = await readStoredStart(upload.storageKey, SIGNATURE_LENGTH);
  const type = start && pictureType(start);
  if (!type) {
    await discard(upload, true);
    return { ok: false, error: "That file is not a PNG, JPEG or WebP picture." };
  }

  const replaced = await getDb().transaction(async (tx) => {
    await tx.execute(lockUser(userId));
    const [still] = await tx
      .select({ id: profilePictures.id })
      .from(profilePictures)
      .where(and(eq(profilePictures.id, upload.id), eq(profilePictures.status, "pending")));
    // Cleared away in the meantime: the old picture stays.
    if (!still) return null;
    const old = await tx
      .delete(profilePictures)
      .where(and(eq(profilePictures.userId, userId), eq(profilePictures.status, "ready")))
      .returning({ storageKey: profilePictures.storageKey });
    await tx
      .update(profilePictures)
      .set({ status: "ready", contentType: type })
      .where(eq(profilePictures.id, upload.id));
    return old;
  });
  if (!replaced) return { ok: false, error: NOT_FOUND };

  for (const { storageKey } of replaced) await deleteStored(storageKey);
  return { ok: true };
}

/** The id of this person's picture, or null when they have none. It changes with every new one. */
export async function currentPictureId(userId: string): Promise<string | null> {
  const [picture] = await getDb()
    .select({ id: profilePictures.id })
    .from(profilePictures)
    .where(and(eq(profilePictures.userId, userId), eq(profilePictures.status, "ready")));
  return picture?.id ?? null;
}

/** Where a ready picture is stored and what it is, or null when there is no such picture. */
export async function findPicture(
  pictureId: string,
): Promise<{ storageKey: string; size: number; contentType: PictureType } | null> {
  const [picture] = await getDb()
    .select({
      storageKey: profilePictures.storageKey,
      size: profilePictures.size,
      contentType: profilePictures.contentType,
    })
    .from(profilePictures)
    .where(and(eq(profilePictures.id, pictureId), eq(profilePictures.status, "ready")));
  if (!picture?.contentType) return null;
  return { ...picture, contentType: picture.contentType };
}

/**
 * Removes this person's picture, so their initials show again. The caller decides who may:
 * the person themselves, or an admin.
 */
export async function removePicture(userId: string): Promise<Result> {
  const removed = await getDb()
    .delete(profilePictures)
    .where(and(eq(profilePictures.userId, userId), eq(profilePictures.status, "ready")))
    .returning({ storageKey: profilePictures.storageKey });
  if (removed.length === 0) return { ok: false, error: "There is no picture to remove." };

  for (const { storageKey } of removed) await deleteStored(storageKey);
  return { ok: true };
}
