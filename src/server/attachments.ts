import { randomUUID } from "node:crypto";
import { and, asc, count, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attachments, MAX_ATTACHMENT_BYTES, projects, tasks } from "@/db/schema";
import { deleteStored, signDownload, signUpload, storedSize } from "./storage";
import type { Result } from "./validation";

// Who may see a project's files: its owner, and the person who sent it as a task.
// Uploading also needs the project to be active. Removing is for the uploader or the owner.

export const MAX_FILES_PER_PROJECT = 20;
const MAX_FILE_NAME_LENGTH = 200;
// An upload not finished within this time has been abandoned, and its record is cleared away.
const ABANDONED_AFTER = sql`interval '1 hour'`;

const NO_ACCESS = "You can't add files to this project.";
const NOT_FOUND = "That file is not there any more.";

export type FileChoice = { fileName: string; size: number };

/** Keeps only the last part of a path and drops control characters. Null if nothing is left. */
export function cleanFileName(raw: string): string | null {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const name = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (name.length === 0 || name.length > MAX_FILE_NAME_LENGTH) return null;
  return name;
}

/** Returns what is wrong with the chosen file, or null when it is fine. */
export function fileProblem(choice: FileChoice): string | null {
  if (!cleanFileName(choice.fileName)) {
    return `Use a file name of 1 to ${MAX_FILE_NAME_LENGTH} characters.`;
  }
  if (!Number.isSafeInteger(choice.size) || choice.size < 1) return "That file is empty.";
  if (choice.size > MAX_ATTACHMENT_BYTES) return "Files can be at most 25 MB.";
  return null;
}

/** True when this person is the project's owner or the one who sent it as a task. */
const canSeeProject = (userId: string) =>
  or(eq(projects.ownerId, userId), eq(tasks.senderId, userId));

async function findProject(userId: string, projectId: string) {
  const [project] = await getDb()
    .select({ id: projects.id, finishedAt: projects.finishedAt })
    .from(projects)
    .leftJoin(tasks, eq(tasks.id, projects.sourceTaskId))
    .where(and(eq(projects.id, projectId), canSeeProject(userId)));
  return project;
}

/** Clears this project's abandoned uploads, so they stop counting towards the limit. */
async function clearAbandoned(projectId: string): Promise<void> {
  const abandoned = await getDb()
    .select({ id: attachments.id, storageKey: attachments.storageKey })
    .from(attachments)
    .where(
      and(
        eq(attachments.projectId, projectId),
        eq(attachments.status, "pending"),
        lt(attachments.createdAt, sql`now() - ${ABANDONED_AFTER}`),
      ),
    );
  for (const upload of abandoned) {
    await deleteStored(upload.storageKey);
    await getDb().delete(attachments).where(eq(attachments.id, upload.id));
  }
}

/**
 * Step 1 of an upload: records the file as pending and returns a short-lived link the browser
 * sends it to. The link is signed for this exact size, so a bigger file is refused.
 */
export async function startUpload(
  userId: string,
  projectId: string,
  choice: FileChoice,
): Promise<Result<{ id: string; url: string }>> {
  const problem = fileProblem(choice);
  if (problem) return { ok: false, error: problem };

  const project = await findProject(userId, projectId);
  if (!project) return { ok: false, error: NO_ACCESS };
  if (project.finishedAt) return { ok: false, error: "This project is finished." };

  await clearAbandoned(projectId);

  const id = randomUUID();
  const storageKey = `attachments/${projectId}/${id}`;
  const added = await getDb().transaction(async (tx) => {
    // The lock makes two uploads at once wait their turn, so neither can pass the limit.
    await tx.execute(sql`select 1 from ${projects} where ${projects.id} = ${projectId} for update`);
    const [{ total }] = await tx
      .select({ total: count() })
      .from(attachments)
      .where(eq(attachments.projectId, projectId));
    if (total >= MAX_FILES_PER_PROJECT) return false;

    await tx.insert(attachments).values({
      id,
      projectId,
      uploaderId: userId,
      fileName: cleanFileName(choice.fileName) as string,
      size: choice.size,
      storageKey,
    });
    return true;
  });
  if (!added) {
    return { ok: false, error: `A project can have at most ${MAX_FILES_PER_PROJECT} files.` };
  }

  return { ok: true, id, url: await signUpload(storageKey, choice.size) };
}

/** Step 2: the browser says it has sent the file. The server checks the bucket before trusting it. */
export async function finishUpload(userId: string, attachmentId: string): Promise<Result> {
  const [upload] = await getDb()
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.uploaderId, userId),
        eq(attachments.status, "pending"),
      ),
    );
  if (!upload) return { ok: false, error: NOT_FOUND };

  const size = await storedSize(upload.storageKey);
  if (size !== upload.size) {
    if (size !== null) await deleteStored(upload.storageKey);
    await getDb().delete(attachments).where(eq(attachments.id, upload.id));
    return { ok: false, error: "The upload did not arrive complete. Please try again." };
  }

  await getDb().update(attachments).set({ status: "ready" }).where(eq(attachments.id, upload.id));
  return { ok: true };
}

/** Finished uploads on these projects, oldest first, leaving out any this person may not see. */
function listAttachments(userId: string, projectIds: string[]) {
  if (projectIds.length === 0) return Promise.resolve([]);
  return getDb()
    .select({
      id: attachments.id,
      projectId: attachments.projectId,
      fileName: attachments.fileName,
      size: attachments.size,
      uploaderId: attachments.uploaderId,
      ownerId: projects.ownerId,
    })
    .from(attachments)
    .innerJoin(projects, eq(projects.id, attachments.projectId))
    .leftJoin(tasks, eq(tasks.id, projects.sourceTaskId))
    .where(
      and(
        inArray(attachments.projectId, projectIds),
        eq(attachments.status, "ready"),
        canSeeProject(userId),
      ),
    )
    .orderBy(asc(attachments.createdAt));
}

export type ListedFile = { id: string; fileName: string; size: number; canRemove: boolean };

/** The files each project shows this person, keyed by project, with whether they may remove each. */
export async function filesByProject(
  userId: string,
  projectIds: string[],
): Promise<Map<string, ListedFile[]>> {
  const byProject = new Map<string, ListedFile[]>();
  for (const file of await listAttachments(userId, projectIds)) {
    const listed = byProject.get(file.projectId) ?? [];
    listed.push({
      id: file.id,
      fileName: file.fileName,
      size: file.size,
      canRemove: file.uploaderId === userId || file.ownerId === userId,
    });
    byProject.set(file.projectId, listed);
  }
  return byProject;
}

/** A download link that works for a few minutes, or null when this person may not have the file. */
export async function downloadLink(userId: string, attachmentId: string): Promise<string | null> {
  const [file] = await getDb()
    .select({ storageKey: attachments.storageKey, fileName: attachments.fileName })
    .from(attachments)
    .innerJoin(projects, eq(projects.id, attachments.projectId))
    .leftJoin(tasks, eq(tasks.id, projects.sourceTaskId))
    .where(
      and(eq(attachments.id, attachmentId), eq(attachments.status, "ready"), canSeeProject(userId)),
    );
  return file ? signDownload(file.storageKey, file.fileName) : null;
}

/** The uploader or the project's owner can remove a file. The stored copy goes first. */
export async function removeAttachment(userId: string, attachmentId: string): Promise<Result> {
  const [file] = await getDb()
    .select({ id: attachments.id, storageKey: attachments.storageKey })
    .from(attachments)
    .innerJoin(projects, eq(projects.id, attachments.projectId))
    .where(
      and(
        eq(attachments.id, attachmentId),
        or(eq(attachments.uploaderId, userId), eq(projects.ownerId, userId)),
      ),
    );
  if (!file) return { ok: false, error: NOT_FOUND };

  await deleteStored(file.storageKey);
  await getDb().delete(attachments).where(eq(attachments.id, file.id));
  return { ok: true };
}
