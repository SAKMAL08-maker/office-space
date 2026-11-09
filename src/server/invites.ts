import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { invites, users } from "@/db/schema";
import { hashPassword } from "./auth";
import { hashToken, newToken } from "./tokens";
import { EmailTakenError, insertUserWithPassword } from "./users";
import {
  isRole,
  isValidEmail,
  nameProblem,
  normalizeEmail,
  passwordProblem,
  type Result,
} from "./validation";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const INVALID_LINK = "This invite link is no longer valid. Ask an admin for a new one.";

const isUsable = and(
  isNull(invites.usedAt),
  isNull(invites.revokedAt),
  gt(invites.expiresAt, sql`now()`),
);

/** Makes a single-use link. The raw token is returned once and never stored. */
export async function createInvite(input: {
  email: string;
  role: unknown;
  createdBy: string;
}): Promise<Result<{ token: string }>> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (!isRole(input.role)) return { ok: false, error: "Choose a role." };

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) return { ok: false, error: "That email already has an account." };

  const token = newToken();
  const role = input.role;
  await db.transaction(async (tx) => {
    // Only the newest link for an address should work.
    await tx
      .update(invites)
      .set({ revokedAt: new Date() })
      .where(and(eq(invites.email, email), isNull(invites.usedAt), isNull(invites.revokedAt)));
    await tx.insert(invites).values({
      id: randomUUID(),
      tokenHash: hashToken(token),
      email,
      role,
      createdBy: input.createdBy,
      expiresAt: new Date(Date.now() + INVITE_LIFETIME_MS),
    });
  });
  return { ok: true, token };
}

export async function revokeInvite(id: string): Promise<void> {
  await getDb()
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, id), isNull(invites.usedAt), isNull(invites.revokedAt)));
}

export async function findUsableInvite(token: string): Promise<{ email: string } | null> {
  const found = await getDb()
    .select({ email: invites.email })
    .from(invites)
    .where(and(eq(invites.tokenHash, hashToken(token)), isUsable))
    .limit(1);
  return found[0] ?? null;
}

export async function listPendingInvites() {
  return getDb()
    .select({
      id: invites.id,
      email: invites.email,
      role: invites.role,
      expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(isUsable)
    .orderBy(asc(invites.expiresAt));
}

export async function acceptInvite(input: {
  token: string;
  name: string;
  password: string;
}): Promise<Result> {
  const problem = nameProblem(input.name) ?? passwordProblem(input.password);
  if (problem) return { ok: false, error: problem };

  // Password hashing is deliberately slow, so bad links are turned away before it runs.
  if (!(await findUsableInvite(input.token))) return { ok: false, error: INVALID_LINK };
  const passwordHash = await hashPassword(input.password);

  try {
    return await getDb().transaction(async (tx) => {
      // Claiming the invite in one update means two simultaneous submits cannot both succeed.
      const [invite] = await tx
        .update(invites)
        .set({ usedAt: new Date() })
        .where(and(eq(invites.tokenHash, hashToken(input.token)), isUsable))
        .returning({ email: invites.email, role: invites.role });
      if (!invite) return { ok: false, error: INVALID_LINK } as const;

      await insertUserWithPassword(tx, {
        name: input.name,
        email: invite.email,
        role: invite.role,
        passwordHash,
      });
      return { ok: true } as const;
    });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { ok: false, error: "That email already has an account." };
    }
    throw error;
  }
}
