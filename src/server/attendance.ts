import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { attendanceSessions, users } from "@/db/schema";
import { lockEnabledUser, lockUser } from "./users";
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

/**
 * Opens a record. The database's one-open-per-user rule is what refuses a double check-in. The
 * person's lock lines this up with disabling them, which closes the record they had open.
 */
export function checkIn(userId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    if (!(await lockEnabledUser(tx, userId))) {
      return { ok: false, error: "Your account is disabled." };
    }
    const opened = await tx
      .insert(attendanceSessions)
      .values({ id: randomUUID(), userId })
      .onConflictDoNothing()
      .returning({ id: attendanceSessions.id });
    if (opened.length === 0) return { ok: false, error: "You are still checked in." };
    return { ok: true };
  });
}

/** Closes the open record, if any, inside the caller's transaction. */
export async function closeOpenAttendance(tx: Tx, userId: string): Promise<boolean> {
  const closed = await tx
    .update(attendanceSessions)
    .set({ checkedOutAt: sql`now()` })
    .where(and(eq(attendanceSessions.userId, userId), isOpen))
    .returning({ id: attendanceSessions.id });
  return closed.length > 0;
}

/**
 * Closes the open record and any open work period together, using the database clock so the time
 * cannot come before check-in. The person's lock stops a start of work slipping in alongside.
 */
export function checkOut(userId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    await lockUser(tx, userId);
    await endOpenWork(tx, userId);
    if (!(await closeOpenAttendance(tx, userId))) {
      return { ok: false, error: "You are not checked in." };
    }
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

/** Every record, oldest first, for the CSV download. No limit: the file is the whole log. */
export function listTimeLogForExport() {
  return getDb()
    .select({ ...timeLogColumns, name: users.name, email: users.email })
    .from(attendanceSessions)
    .innerJoin(users, eq(users.id, attendanceSessions.userId))
    .orderBy(asc(attendanceSessions.checkedInAt), asc(attendanceSessions.id));
}
