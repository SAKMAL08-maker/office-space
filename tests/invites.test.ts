import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { invites, users } from "@/db/schema";
import {
  acceptInvite,
  createInvite,
  findUsableInvite,
  listPendingInvites,
  revokeInvite,
} from "@/server/invites";
import { createFirstAdmin } from "@/server/setup";
import {
  canUseDatabase,
  emptyDatabase,
  logIn,
  PASSWORD,
  SETUP_TOKEN,
  stubAuthEnv,
} from "./helpers/accounts";

let adminId: string;

async function invite(email = "new@example.com", role = "member") {
  const result = await createInvite({ email, role, createdBy: adminId });
  if (!result.ok) throw new Error(result.error);
  return result.token;
}

const accept = (token: string) => acceptInvite({ token, name: "Newcomer", password: PASSWORD });

describe.skipIf(!canUseDatabase)("invites", () => {
  beforeEach(async () => {
    stubAuthEnv();
    await emptyDatabase();
    await createFirstAdmin({
      token: SETUP_TOKEN,
      name: "Ada",
      email: "ada@example.com",
      password: PASSWORD,
    });
    const [admin] = await getDb().select().from(users);
    adminId = admin.id;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("creates a member who can log in", async () => {
    expect(await accept(await invite())).toEqual({ ok: true });

    const [created] = await getDb().select().from(users).where(eq(users.email, "new@example.com"));
    expect(created.role).toBe("member");
    expect(await logIn("new@example.com", PASSWORD)).toBeTruthy();
  });

  it("gives the invited person the role chosen by the admin", async () => {
    await accept(await invite("boss@example.com", "admin"));

    const [created] = await getDb().select().from(users).where(eq(users.email, "boss@example.com"));
    expect(created.role).toBe("admin");
  });

  it("stores only a hash of the link", async () => {
    const token = await invite();

    const [stored] = await getDb().select().from(invites);
    expect(stored.tokenHash).not.toContain(token);
  });

  it("works only once", async () => {
    const token = await invite();
    await accept(token);

    expect((await accept(token)).ok).toBe(false);
    expect(await findUsableInvite(token)).toBeNull();
  });

  it("lets only one of several simultaneous submits succeed", async () => {
    const token = await invite();

    const results = await Promise.all([accept(token), accept(token), accept(token)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await getDb().select().from(users)).toHaveLength(2);
  });

  it("refuses an expired link", async () => {
    const token = await invite();
    await getDb()
      .update(invites)
      .set({ expiresAt: new Date(Date.now() - 1000) });

    expect((await accept(token)).ok).toBe(false);
  });

  it("refuses a cancelled link and drops it from the waiting list", async () => {
    const token = await invite();
    const [pending] = await listPendingInvites();

    await revokeInvite(pending.id);

    expect((await accept(token)).ok).toBe(false);
    expect(await listPendingInvites()).toHaveLength(0);
  });

  it("cancels the older link when the same address is invited again", async () => {
    const older = await invite();
    const newer = await invite();

    expect((await accept(older)).ok).toBe(false);
    expect((await accept(newer)).ok).toBe(true);
  });

  it("refuses to invite an address that already has an account", async () => {
    const result = await createInvite({
      email: "ADA@example.com",
      role: "member",
      createdBy: adminId,
    });

    expect(result.ok).toBe(false);
  });

  it("refuses a weak password without using up the invite", async () => {
    const token = await invite();

    expect((await acceptInvite({ token, name: "Newcomer", password: "short" })).ok).toBe(false);
    expect(await findUsableInvite(token)).not.toBeNull();
  });
});
