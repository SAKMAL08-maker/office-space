import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const realDatabaseUrl = process.env.DATABASE_URL;

async function callHealth() {
  // The pool is shared per module, so each test needs a fresh copy.
  vi.resetModules();
  const { GET } = await import("@/app/api/health/route");
  return GET();
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env.DATABASE_URL = realDatabaseUrl;
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("returns 503 without details when the database is unreachable", async () => {
    process.env.DATABASE_URL = "postgres://nobody:secret-value@127.0.0.1:1/none";

    const response = await callHealth();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"ok":false}');
  });

  it("returns 503 when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;

    const response = await callHealth();

    expect(response.status).toBe(503);
  });

  // CI always provides a real Postgres. Locally this skips unless DATABASE_URL is set.
  it.skipIf(!realDatabaseUrl)("returns 200 when the database answers", async () => {
    const response = await callHealth();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
