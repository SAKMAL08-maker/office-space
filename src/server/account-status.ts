import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { passwordResetLinks, sessions, tasks, users } from "@/db/schema";
import { closeOpenAttendance } from "./attendance";
import type { Result } from "./validation";
import { endOpenWork } from "./work";

const NOT_FOUND = "That person no longer exists.";

/**
 * Turns an account off, for example when someone leaves or loses their laptop. In one transaction:
 * logs them out everywhere, ends their work period and checks them out (the one time anyone but
 * the person closes these), cancels the tasks waiting to or from them, and voids their reset link.
 * Their projects, cubicles and time log stay as they are.
 */
export function disableUser(input: { userId: string; adminId: string }): Promise<Result> {
  if (input.userId === input.adminId) {
    return Promise.resolve({ ok: false, error: "You cannot disable your own account." });
  }

  return getDb().transaction(async (tx): Promise<Result> => {
    // Every enabled admin is locked, so two admins disabling each other at once cannot both
    // succeed and leave nobody able to run the office. The person is locked too (the lock that
    // check-in, starting work and sending a task take), so nothing new opens while this runs.
    // One query in id order, like lockUsers, so it cannot deadlock with a task being sent.
    const locked = await tx
      .select({ id: users.id, role: users.role, disabledAt: users.disabledAt })
      .from(users)
      .where(or(and(eq(users.role, "admin"), isNull(users.disabledAt)), eq(users.id, input.userId)))
      .orderBy(asc(users.id))
      .for("update");
    const person = locked.find((user) => user.id === input.userId);
    if (!person) return { ok: false, error: NOT_FOUND };
    const admins = locked.filter((user) => user.role === "admin" && !user.disabledAt);
    if (person.disabledAt) return { ok: false, error: "This account is already disabled." };
    if (person.role === "admin" && admins.length <= 1) {
      return { ok: false, error: "The last admin cannot be disabled." };
    }

    await tx
      .update(users)
      .set({ disabledAt: sql`now()` })
      .where(eq(users.id, input.userId));
    await tx.delete(sessions).where(eq(sessions.userId, input.userId));
    await endOpenWork(tx, input.userId);
    await closeOpenAttendance(tx, input.userId);
    await tx
      .update(tasks)
      .set({ status: "cancelled", decidedAt: sql`now()` })
      .where(
        and(
          eq(tasks.status, "pending"),
          or(eq(tasks.receiverId, input.userId), eq(tasks.senderId, input.userId)),
        ),
      );
    await tx
      .update(passwordResetLinks)
      .set({ revokedAt: sql`now()` })
      .where(
        and(
          eq(passwordResetLinks.userId, input.userId),
          isNull(passwordResetLinks.usedAt),
          isNull(passwordResetLinks.revokedAt),
        ),
      );
    return { ok: true };
  });
}

/** Turns an account back on. They log in with their old password, or an admin sends a reset link. */
export async function enableUser(userId: string): Promise<Result> {
  const enabled = await getDb()
    .update(users)
    .set({ disabledAt: null })
    .where(eq(users.id, userId))
    .returning({ disabledAt: users.disabledAt });
  return enabled.length > 0 ? { ok: true } : { ok: false, error: NOT_FOUND };
}
