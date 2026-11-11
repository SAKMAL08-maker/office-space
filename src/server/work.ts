import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { attendanceSessions, cubicles, projects, workSessions } from "@/db/schema";
import { lockUser } from "./users";
import type { Result } from "./validation";

const WORK_LOG_LIMIT = 200;

const isOpen = isNull(workSessions.endedAt);

/** Ends this person's open period, if any, inside the caller's transaction. */
export async function endOpenWork(tx: Tx, userId: string): Promise<void> {
  await tx
    .update(workSessions)
    .set({ endedAt: sql`now()` })
    .where(and(eq(workSessions.userId, userId), isOpen));
}

/** Ends whoever is working on this project, inside the caller's transaction. */
export async function endProjectWork(tx: Tx, projectId: string): Promise<void> {
  await tx
    .update(workSessions)
    .set({ endedAt: sql`now()` })
    .where(and(eq(workSessions.projectId, projectId), isOpen));
}

/**
 * Starts working at one of the person's own cubicles, ending any earlier period first.
 * The person's lock lines this up with check-out, and the cubicle's lock with finishing the project,
 * so neither can slip in between the checks and the new period.
 */
export function startWork(userId: string, projectId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    await lockUser(tx, userId);
    const checkedIn = await tx
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.userId, userId), isNull(attendanceSessions.checkedOutAt)));
    if (checkedIn.length === 0) return { ok: false, error: "You are not checked in." };

    const cubicle = await tx
      .select({ id: cubicles.id })
      .from(cubicles)
      .where(and(eq(cubicles.projectId, projectId), eq(cubicles.ownerId, userId)))
      .for("update");
    if (cubicle.length === 0) {
      return { ok: false, error: "You can only work in the cubicles of your own active projects." };
    }

    const [open] = await tx
      .select({ projectId: workSessions.projectId })
      .from(workSessions)
      .where(and(eq(workSessions.userId, userId), isOpen));
    if (open?.projectId === projectId) return { ok: true };

    await endOpenWork(tx, userId);
    await tx.insert(workSessions).values({ id: randomUUID(), userId, projectId });
    return { ok: true };
  });
}

export async function stopWork(userId: string): Promise<Result> {
  const stopped = await getDb()
    .update(workSessions)
    .set({ endedAt: sql`now()` })
    .where(and(eq(workSessions.userId, userId), isOpen))
    .returning({ id: workSessions.id });
  if (stopped.length === 0) return { ok: false, error: "You are not working on anything." };
  return { ok: true };
}

/** The person's work periods, newest first, with each project's current title. */
export function listWorkLog(userId: string) {
  return getDb()
    .select({
      id: workSessions.id,
      title: projects.title,
      startedAt: workSessions.startedAt,
      endedAt: workSessions.endedAt,
    })
    .from(workSessions)
    .innerJoin(projects, eq(projects.id, workSessions.projectId))
    .where(eq(workSessions.userId, userId))
    .orderBy(desc(workSessions.startedAt))
    .limit(WORK_LOG_LIMIT);
}
