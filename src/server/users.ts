import { randomUUID } from "node:crypto";
import type { Tx } from "@/db/client";
import { accounts, users } from "@/db/schema";
import type { Role } from "./validation";

export class EmailTakenError extends Error {}

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
