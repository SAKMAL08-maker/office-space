import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accounts, passwordResetLinks, sessions, users } from "@/db/schema";
import { hashPassword } from "./auth";
import { hashToken, newToken } from "./tokens";
import { passwordProblem, type Result } from "./validation";

// Longer than a typical emailed link, because an admin has to pass this one on by hand.
const RESET_LIFETIME_MS = 24 * 60 * 60 * 1000;
const INVALID_LINK = "This reset link is no longer valid. Ask an admin for a new one.";

const isUsable = and(
  isNull(passwordResetLinks.usedAt),
  isNull(passwordResetLinks.revokedAt),
  gt(passwordResetLinks.expiresAt, sql`now()`),
);

/** Makes a single-use link. The raw token is returned once and never stored. */
export async function createPasswordResetLink(input: {
  userId: string;
  createdBy: string;
}): Promise<Result<{ token: string }>> {
  const db = getDb();
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (found.length === 0) return { ok: false, error: "That person no longer exists." };

  const token = newToken();
  await db.transaction(async (tx) => {
    // Only the newest link for a person should work.
    await tx
      .update(passwordResetLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(passwordResetLinks.userId, input.userId),
          isNull(passwordResetLinks.usedAt),
          isNull(passwordResetLinks.revokedAt),
        ),
      );
    await tx.insert(passwordResetLinks).values({
      id: randomUUID(),
      tokenHash: hashToken(token),
      userId: input.userId,
      createdBy: input.createdBy,
      expiresAt: new Date(Date.now() + RESET_LIFETIME_MS),
    });
  });
  return { ok: true, token };
}

export async function findUsableResetLink(token: string): Promise<{ email: string } | null> {
  const found = await getDb()
    .select({ email: users.email })
    .from(passwordResetLinks)
    .innerJoin(users, eq(users.id, passwordResetLinks.userId))
    .where(and(eq(passwordResetLinks.tokenHash, hashToken(token)), isUsable))
    .limit(1);
  return found[0] ?? null;
}

/** Sets the new password and signs the person out everywhere, all in one transaction. */
export async function redeemPasswordResetLink(input: {
  token: string;
  password: string;
}): Promise<Result> {
  const problem = passwordProblem(input.password);
  if (problem) return { ok: false, error: problem };

  // Password hashing is deliberately slow, so bad links are turned away before it runs.
  if (!(await findUsableResetLink(input.token))) return { ok: false, error: INVALID_LINK };
  const passwordHash = await hashPassword(input.password);

  return getDb().transaction(async (tx) => {
    const [link] = await tx
      .update(passwordResetLinks)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetLinks.tokenHash, hashToken(input.token)), isUsable))
      .returning({ userId: passwordResetLinks.userId });
    if (!link) return { ok: false, error: INVALID_LINK } as const;

    await tx
      .update(accounts)
      .set({ password: passwordHash })
      .where(and(eq(accounts.userId, link.userId), eq(accounts.providerId, "credential")));
    await tx.delete(sessions).where(eq(sessions.userId, link.userId));
    return { ok: true } as const;
  });
}
