import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { attendanceSessions, users } from "@/db/schema";
import { lockUser } from "./users";
import type { Result } from "./validation";
import { endOpenWork } from "./work";

const TIME_LOG_LIMIT = 200;

const isOpen = isNull(attendanceSessions.checkedOutAt);

const timeLogColumns = {
  id: attendanceSessions.id,
  checkedInAt: attendanceSessions.checkedInAt,
  checkedOutAt: attendanceSessions.checkedOutAt,
};

export async function getOpenAttendance(userId: string): Promise<{ checkedInAt: Date } | null> {
  const found = await getDb()
    .select({ checkedInAt: attendanceSessions.checkedInAt })
    .from(attendanceSessions)
    .where(and(eq(attendanceSessions.userId, userId), isOpen))
    .limit(1);
  return found[0] ?? null;
}

/** Opens a record. The database's one-open-per-user rule is what refuses a double check-in. */
export async function checkIn(userId: string): Promise<Result> {
  const opened = await getDb()
    .insert(attendanceSessions)
    .values({ id: randomUUID(), userId })
    .onConflictDoNothing()
    .returning({ id: attendanceSessions.id });
  if (opened.length === 0) return { ok: false, error: "You are still checked in." };
  return { ok: true };
}

/**
 * Closes the open record and any open work period together, using the database clock so the time
 * cannot come before check-in. The person's lock stops a start of work slipping in alongside.
 */
export function checkOut(userId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    await lockUser(tx, userId);
    await endOpenWork(tx, userId);
    const closed = await tx
      .update(attendanceSessions)
      .set({ checkedOutAt: sql`now()` })
      .where(and(eq(attendanceSessions.userId, userId), isOpen))
      .returning({ id: attendanceSessions.id });
    if (closed.length === 0) return { ok: false, error: "You are not checked in." };
    return { ok: true };
  });
}

export function listTimeLog(userId: string) {
  return getDb()
    .select(timeLogColumns)
    .from(attendanceSessions)
    .where(eq(attendanceSessions.userId, userId))
    .orderBy(desc(attendanceSessions.checkedInAt))
    .limit(TIME_LOG_LIMIT);
}

export function listEveryonesTimeLog() {
  return getDb()
    .select({ ...timeLogColumns, name: users.name })
    .from(attendanceSessions)
    .innerJoin(users, eq(users.id, attendanceSessions.userId))
    .orderBy(desc(attendanceSessions.checkedInAt))
    .limit(TIME_LOG_LIMIT);
}
