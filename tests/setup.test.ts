import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createFirstAdmin, isSetupOpen } from "@/server/setup";
import {
  canUseDatabase,
  emptyDatabase,
  logIn,
  PASSWORD,
  postAuth,
  SETUP_TOKEN,
  stubAuthEnv,
} from "./helpers/accounts";

const admin = { name: "Ada", email: "Ada@Example.com", password: PASSWORD };

describe.skipIf(!canUseDatabase)("first admin setup", () => {
  beforeEach(async () => {
    stubAuthEnv();
    await emptyDatabase();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refuses the wrong token", async () => {
    const result = await createFirstAdmin({ ...admin, token: "wrong" });

    expect(result.ok).toBe(false);
    expect(await getDb().select().from(users)).toHaveLength(0);
  });

  it("stays closed when the token is missing or too short", async () => {
    vi.stubEnv("SETUP_TOKEN", "short");

    expect(await isSetupOpen()).toBe(false);
    expect((await createFirstAdmin({ ...admin, token: "short" })).ok).toBe(false);
  });

  it("creates an admin who can log in, then locks itself", async () => {
    expect(await isSetupOpen()).toBe(true);

    expect(await createFirstAdmin({ ...admin, token: SETUP_TOKEN })).toEqual({ ok: true });

    const [created] = await getDb().select().from(users).where(eq(users.email, "ada@example.com"));
    expect(created.role).toBe("admin");
    expect(await logIn("ada@example.com", PASSWORD)).toBeTruthy();
    expect(await isSetupOpen()).toBe(false);

    const second = await createFirstAdmin({
      ...admin,
      email: "other@example.com",
      token: SETUP_TOKEN,
    });
    expect(second.ok).toBe(false);
  });

  it("lets only one of several simultaneous attempts become admin", async () => {
    const results = await Promise.all(
      ["a", "b", "c", "d"].map((name) =>
        createFirstAdmin({ ...admin, email: `${name}@example.com`, token: SETUP_TOKEN }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await getDb().select().from(users)).toHaveLength(1);
  });

  it("refuses public sign-up through the auth route", async () => {
    const response = await postAuth("/sign-up/email", {
      name: "Mallory",
      email: "mallory@example.com",
      password: PASSWORD,
    });

    expect(response.ok).toBe(false);
    expect(await getDb().select().from(users)).toHaveLength(0);
  });
});
