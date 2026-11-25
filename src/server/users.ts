import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { accounts, users } from "@/db/schema";
import type { Role } from "./validation";

export class EmailTakenError extends Error {}

/**
 * Makes other transactions touching this person's seats or task limit wait their turn.
 * "No key update" still lets unrelated inserts that refer to the person go ahead.
 */
export async function lockUser(tx: Tx, userId: string): Promise<void> {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("no key update");
}

/**
 * Locks several people at once, always in id order, so two transactions locking the same pair
 * the other way round wait for each other instead of deadlocking. Returns the ids still enabled.
 */
export async function lockUsers(tx: Tx, userIds: string[]): Promise<Set<string>> {
  const locked = await tx
    .select({ id: users.id, disabledAt: users.disabledAt })
    .from(users)
    .where(inArray(users.id, userIds))
    .orderBy(asc(users.id))
    .for("no key update");
  return new Set(locked.filter((user) => !user.disabledAt).map((user) => user.id));
}

/**
 * Locks the person like lockUser, and says whether their account is still enabled. Disabling
 * takes the same lock, so a request already under way cannot open anything once it is done.
 */
export async function lockEnabledUser(tx: Tx, userId: string): Promise<boolean> {
  return (await lockUsers(tx, [userId])).has(userId);
}

/** Everyone a person could send a task to. Names only, so email addresses stay with admins. */
export function listOtherPeople(userId: string) {
  return getDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(ne(users.id, userId), isNull(users.disabledAt)))
    .orderBy(asc(users.name));
}

/**
 * Writes a user and their password login inside the caller's transaction.
 * Throws EmailTakenError so the whole transaction rolls back.
 */
export async function insertUserWithPassword(
  tx: Tx,
  input: { name: string; email: string; role: Role; passwordHash: string },
): Promise<string> {
  const id = randomUUID();
  const inserted = await tx
    .insert(users)
    .values({
      id,
      name: input.name.trim(),
      email: input.email,
      role: input.role,
      emailVerified: true,
    })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (inserted.length === 0) throw new EmailTakenError();

  await tx.insert(accounts).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: input.passwordHash,
  });
  return id;
}
