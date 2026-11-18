import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db/client";

/**
 * Each visitor gets this many tries a minute at logging in, and at each of the setup,
 * invite and reset forms. Every try counts, right or wrong.
 */
export const TRIES_PER_WINDOW = 5;
export const TRY_WINDOW_SECONDS = 60;

export type TryResult = { ok: true } | { ok: false; retryAfter: number };

/**
 * The visitor's IP address. Vercel replaces x-forwarded-for with the one address it saw,
 * so a visitor cannot pick their own. A list or anything else is not trusted, and those
 * visitors share one count, the same way the login library handles it.
 */
export function clientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for")?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;
  return "unknown";
}

/**
 * Counts one try at `key` and says whether it is allowed. One statement, so tries arriving
 * at the same moment cannot all slip through. Uses the login library's table and its rule:
 * a count starts again a full window after the last allowed try.
 */
export async function takeTry(key: string, now = Date.now()): Promise<TryResult> {
  const windowMs = TRY_WINDOW_SECONDS * 1000;
  const cutoff = now - windowMs;
  const result = await getDb().execute<{ count: number; last_request: string }>(sql`
    insert into rate_limits (id, key, count, last_request)
    values (${randomUUID()}, ${key}, 1, ${now})
    on conflict (key) do update set
      count = case when rate_limits.last_request <= ${cutoff} then 1
                   else rate_limits.count + 1 end,
      last_request = case when rate_limits.last_request <= ${cutoff}
                            or rate_limits.count < ${TRIES_PER_WINDOW} then ${now}
                          else rate_limits.last_request end
    returning count, last_request
  `);
  const row = result.rows[0];
  if (row.count === 1) {
    // A fresh count: a good moment to clear away rows nobody needs any more.
    await getDb().execute(sql`delete from rate_limits where last_request < ${cutoff}`);
  }
  if (row.count <= TRIES_PER_WINDOW) return { ok: true };
  const retryAfter = Math.ceil((Number(row.last_request) + windowMs - now) / 1000);
  return { ok: false, retryAfter: Math.max(1, retryAfter) };
}

/** Counts one try at a form, such as "/setup", for the visitor sending this request. */
export async function takeFormTry(path: string): Promise<TryResult> {
  return takeTry(`form:${clientIp(await headers())}|${path}`);
}
