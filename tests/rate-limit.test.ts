import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, takeTry, TRIES_PER_WINDOW, TRY_WINDOW_SECONDS } from "@/server/rate-limit";
import { tooManyTries } from "@/ui/form-state";
import { createFirstAdmin } from "@/server/setup";
import {
  canUseDatabase,
  emptyDatabase,
  logIn,
  PASSWORD,
  postAuth,
  SETUP_TOKEN,
  stubAuthEnv,
} from "./helpers/accounts";

describe("the visitor's IP address", () => {
  it("trusts a single address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": " 2001:db8::1 " }))).toBe("2001:db8::1");
  });

  it("shares one count for a list, junk or nothing", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": "not-an-ip" }))).toBe("unknown");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("the wait message", () => {
  it("names the seconds left", () => {
    expect(tooManyTries(42)).toBe("Too many tries. Wait 42 seconds and try again.");
    expect(tooManyTries(1)).toBe("Too many tries. Wait 1 second and try again.");
  });
});

describe.skipIf(!canUseDatabase)("counting tries", () => {
  beforeEach(async () => {
    stubAuthEnv();
    await emptyDatabase();
  });
  afterEach(() => vi.unstubAllEnvs());

  it(`allows ${TRIES_PER_WINDOW} tries a minute, then says how long to wait`, async () => {
    const start = 1_800_000_000_000;
    for (let i = 0; i < TRIES_PER_WINDOW; i++) {
      expect(await takeTry("form:203.0.113.7|/setup", start + i * 1000)).toEqual({ ok: true });
    }
    const last = start + (TRIES_PER_WINDOW - 1) * 1000;

    expect(await takeTry("form:203.0.113.7|/setup", last + 10_000)).toEqual({
      ok: false,
      retryAfter: TRY_WINDOW_SECONDS - 10,
    });
  });

  it("refused tries do not push the wait back, and a full window later it opens again", async () => {
    const start = 1_800_000_000_000;
    for (let i = 0; i <= TRIES_PER_WINDOW; i++) await takeTry("form:a|/invite", start);
    const refusedLater = await takeTry("form:a|/invite", start + 30_000);
    expect(refusedLater).toEqual({ ok: false, retryAfter: TRY_WINDOW_SECONDS - 30 });

    expect(await takeTry("form:a|/invite", start + TRY_WINDOW_SECONDS * 1000)).toEqual({
      ok: true,
    });
  });

  it("counts each address and each form on its own", async () => {
    const now = 1_800_000_000_000;
    for (let i = 0; i <= TRIES_PER_WINDOW; i++) await takeTry("form:a|/reset", now);

    expect(await takeTry("form:b|/reset", now)).toEqual({ ok: true });
    expect(await takeTry("form:a|/setup", now)).toEqual({ ok: true });
  });

  it("refuses the sixth login in a minute, even with the right password", async () => {
    const result = await createFirstAdmin({
      token: SETUP_TOKEN,
      name: "Ada",
      email: "ada@example.com",
      password: PASSWORD,
    });
    expect(result.ok).toBe(true);

    for (let i = 0; i < TRIES_PER_WINDOW; i++) {
      expect(await logIn("ada@example.com", "a wrong password here")).toBeNull();
    }
    const refused = await postAuth("/sign-in/email", {
      email: "ada@example.com",
      password: PASSWORD,
    });

    expect(refused.status).toBe(429);
    const wait = Number(refused.headers.get("X-Retry-After"));
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(TRY_WINDOW_SECONDS);
  });
});
