import { sql } from "drizzle-orm";
import { vi } from "vitest";
import { getDb } from "@/db/client";

function isThrowawayDatabase(url: string | undefined): boolean {
  if (!url) return false;
  return new URL(url).pathname.endsWith("_test");
}

/**
 * These tests empty every table. They only run on a database whose name ends in _test,
 * so pointing DATABASE_URL at the live one makes them skip instead of wiping it.
 */
export const canUseDatabase = isThrowawayDatabase(process.env.DATABASE_URL);

export const SETUP_TOKEN = "test-setup-token-0123456789abcdef";
export const PASSWORD = "correct horse battery";
export const OTHER_PASSWORD = "a different long password";

export function stubAuthEnv() {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-secret-0123456789abcdefghij");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("SETUP_TOKEN", SETUP_TOKEN);
}

export async function emptyDatabase() {
  await getDb().execute(
    sql`truncate users, sessions, accounts, verifications, invites, password_reset_links cascade`,
  );
}

function authRequest(path: string, body: unknown, cookie?: string): Request {
  return new Request(`http://localhost:3000/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** Sends a request through the real auth route, the way a browser would. */
export async function postAuth(path: string, body: unknown, cookie?: string): Promise<Response> {
  const { POST } = await import("@/app/api/auth/[...all]/route");
  return POST(authRequest(path, body, cookie));
}

/** Logs in and returns the session cookie, or null if the login was refused. */
export async function logIn(email: string, password: string): Promise<string | null> {
  const response = await postAuth("/sign-in/email", { email, password });
  if (!response.ok) return null;
  const cookie = response.headers.getSetCookie()[0];
  return cookie ? cookie.split(";")[0] : null;
}
