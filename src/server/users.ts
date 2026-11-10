import { randomUUID } from "node:crypto";
import { asc, eq, ne } from "drizzle-orm";
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

/** Everyone a person could send a task to. Names only, so email addresses stay with admins. */
export function listOtherPeople(userId: string) {
  return getDb()
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(ne(users.id, userId))
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
