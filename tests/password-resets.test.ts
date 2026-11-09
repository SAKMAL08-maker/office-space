import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { passwordResetLinks, sessions, users } from "@/db/schema";
import { createPasswordResetLink, redeemPasswordResetLink } from "@/server/password-resets";
import { createFirstAdmin } from "@/server/setup";
import {
  canUseDatabase,
  emptyDatabase,
  logIn,
  OTHER_PASSWORD,
  PASSWORD,
  SETUP_TOKEN,
  stubAuthEnv,
} from "./helpers/accounts";

const EMAIL = "ada@example.com";
let userId: string;

async function resetLink() {
  const result = await createPasswordResetLink({ userId, createdBy: userId });
  if (!result.ok) throw new Error(result.error);
  return result.token;
}

const redeem = (token: string) => redeemPasswordResetLink({ token, password: OTHER_PASSWORD });

describe.skipIf(!canUseDatabase)("password reset links", () => {
  beforeEach(async () => {
    stubAuthEnv();
    await emptyDatabase();
    await createFirstAdmin({ token: SETUP_TOKEN, name: "Ada", email: EMAIL, password: PASSWORD });
    const [user] = await getDb().select().from(users);
    userId = user.id;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("changes the password and ends existing logins", async () => {
    await logIn(EMAIL, PASSWORD);
    expect(await getDb().select().from(sessions)).toHaveLength(1);

    expect(await redeem(await resetLink())).toEqual({ ok: true });

    expect(await getDb().select().from(sessions)).toHaveLength(0);
    expect(await logIn(EMAIL, PASSWORD)).toBeNull();
    expect(await logIn(EMAIL, OTHER_PASSWORD)).toBeTruthy();
  });

  it("works only once", async () => {
    const token = await resetLink();
    await redeem(token);

    expect((await redeem(token)).ok).toBe(false);
  });

  it("refuses an expired link and leaves the password alone", async () => {
    const token = await resetLink();
    await getDb()
      .update(passwordResetLinks)
      .set({ expiresAt: new Date(Date.now() - 1000) });

    expect((await redeem(token)).ok).toBe(false);
    expect(await logIn(EMAIL, PASSWORD)).toBeTruthy();
  });

  it("cancels the older link when a new one is made", async () => {
    const older = await resetLink();
    const newer = await resetLink();

    expect((await redeem(older)).ok).toBe(false);
    expect((await redeem(newer)).ok).toBe(true);
  });

  it("refuses a made-up link", async () => {
    expect((await redeem("not-a-real-token")).ok).toBe(false);
  });
});
