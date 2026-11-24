import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

// Works out the headers one address ends up with, the way Next.js does: every matching entry
// applies in order, and a later entry's value for the same header wins.
async function headersFor(path: string) {
  const entries = (await nextConfig.headers?.()) ?? [];
  const result = new Map<string, string>();
  for (const entry of entries) {
    const pattern = entry.source.replace(/:\w+\*/g, ".*").replace(/:\w+/g, "[^/]+");
    if (!new RegExp(`^${pattern}$`).test(path)) continue;
    for (const { key, value } of entry.headers) result.set(key, value);
  }
  return result;
}

describe("security headers", () => {
  const paths = [
    "/",
    "/login",
    "/floor",
    "/profile",
    "/admin/time-log/csv",
    "/api/presence",
    "/api/health",
    "/api/pictures/abc",
    "/api/attachments/abc",
    "/invite/abc",
    "/reset/abc",
    "/setup",
  ];

  it.each(paths)("%s cannot be framed and is never type-sniffed", async (path) => {
    const headers = await headersFor(path);
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Referrer-Policy")).toMatch(
      /^(strict-origin-when-cross-origin|no-referrer)$/,
    );
  });

  it("keeps the picture route's sandbox, which a route's own header could not override", async () => {
    const headers = await headersFor("/api/pictures/abc");
    expect(headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; sandbox; frame-ancestors 'none'",
    );
  });

  it.each(["/invite/abc", "/reset/abc", "/setup", "/api/attachments/abc"])(
    "%s still sends no referrer",
    async (path) => {
      expect((await headersFor(path)).get("Referrer-Policy")).toBe("no-referrer");
    },
  );

  it("keeps secret links out of search engines", async () => {
    for (const path of ["/invite/abc", "/reset/abc", "/setup"]) {
      expect((await headersFor(path)).get("X-Robots-Tag")).toBe("noindex");
    }
    expect((await headersFor("/login")).has("X-Robots-Tag")).toBe(false);
  });
});
