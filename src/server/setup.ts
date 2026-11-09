import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "./auth";
import { secretsMatch } from "./tokens";
import { EmailTakenError, insertUserWithPassword } from "./users";
import {
  isValidEmail,
  nameProblem,
  normalizeEmail,
  passwordProblem,
  type Result,
} from "./validation";

const MIN_SETUP_TOKEN_LENGTH = 24;
// Any fixed number works. It only has to be the same for every setup attempt.
const SETUP_LOCK_ID = 7_210_001;

function setupToken(): string | null {
  const token = process.env.SETUP_TOKEN;
  return token && token.length >= MIN_SETUP_TOKEN_LENGTH ? token : null;
}

async function adminExists(): Promise<boolean> {
  const found = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  return found.length > 0;
}

/** Setup is open only when a strong token is configured and there is no admin yet. */
export async function isSetupOpen(): Promise<boolean> {
  return setupToken() !== null && !(await adminExists());
}

export async function createFirstAdmin(input: {
  token: string;
  name: string;
  email: string;
  password: string;
}): Promise<Result> {
  const expected = setupToken();
  if (!expected || !secretsMatch(input.token, expected)) {
    return { ok: false, error: "That setup token is not right." };
  }

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  const problem = nameProblem(input.name) ?? passwordProblem(input.password);
  if (problem) return { ok: false, error: problem };

  const closed = { ok: false, error: "Setup is already finished." } as const;
  if (await adminExists()) return closed;

  const passwordHash = await hashPassword(input.password);
  try {
    return await getDb().transaction(async (tx) => {
      // Two people submitting at once wait in line here, so only one can become the first admin.
      await tx.execute(sql`select pg_advisory_xact_lock(${SETUP_LOCK_ID})`);
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      if (admins.length > 0) return closed;

      await insertUserWithPassword(tx, { name: input.name, email, role: "admin", passwordHash });
      return { ok: true } as const;
    });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { ok: false, error: "That email already has an account." };
    }
    throw error;
  }
}
