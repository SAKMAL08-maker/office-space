import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { attendanceSessions, invites, users } from "@/db/schema";
import { acceptInvite, createInvite } from "@/server/invites";
import { createFirstAdmin } from "@/server/setup";
import {
  buildTimeLogCsv,
  csvCell,
  exportFileName,
  exportTimeZone,
  formatExportTime,
} from "@/server/time-export";
import {
  canUseDatabase,
  emptyDatabase,
  logIn,
  PASSWORD,
  SETUP_TOKEN,
  stubAuthEnv,
} from "./helpers/accounts";

const request = vi.hoisted(() => ({ cookie: "" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(request.cookie ? { cookie: request.cookie } : {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const BOM = "﻿";
const IN = new Date("2026-11-17T09:05:00Z");
const OUT = new Date("2026-11-17T17:20:30Z");

describe("CSV cells", () => {
  it("quotes every cell and doubles inner quotes", () => {
    expect(csvCell("Ada")).toBe('"Ada"');
    expect(csvCell('Ada "The Count", Lovelace')).toBe('"Ada ""The Count"", Lovelace"');
  });

  it("turns anything that could run as a formula into plain text", () => {
    expect(csvCell('=HYPERLINK("http://evil.test")')).toBe('"\'=HYPERLINK(""http://evil.test"")"');
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell("-1")).toBe(`"'-1"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("\tx")).toBe(`"'\tx"`);
    expect(csvCell("\rx")).toBe(`"'\rx"`);
    expect(csvCell("Mo = boss")).toBe('"Mo = boss"');
  });
});

describe("time zones", () => {
  it("keeps a real time zone and falls back to UTC for anything else", () => {
    expect(exportTimeZone("Europe/London")).toBe("Europe/London");
    expect(exportTimeZone("Asia/Manila")).toBe("Asia/Manila");
    expect(exportTimeZone(null)).toBe("UTC");
    expect(exportTimeZone("")).toBe("UTC");
    expect(exportTimeZone("Not/AZone")).toBe("UTC");
    expect(exportTimeZone('"><script>')).toBe("UTC");
  });

  it("writes times a spreadsheet reads, in the chosen zone", () => {
    expect(formatExportTime(IN, "UTC")).toBe("2026-11-17 09:05");
    expect(formatExportTime(IN, "Asia/Manila")).toBe("2026-11-17 17:05");
    expect(formatExportTime(new Date("2026-11-17T00:30:00Z"), "America/New_York")).toBe(
      "2026-11-16 19:30",
    );
  });

  it("dates the file name in the admin's own zone", () => {
    const lateEvening = new Date("2026-11-17T23:30:00Z");
    expect(exportFileName(lateEvening, "UTC")).toBe("time-log-2026-11-17.csv");
    expect(exportFileName(lateEvening, "Asia/Manila")).toBe("time-log-2026-11-18.csv");
  });
});

describe("buildTimeLogCsv", () => {
  it("starts with the UTF-8 mark and names the zone in the headers", () => {
    const csv = buildTimeLogCsv([], "Asia/Manila");
    expect(csv).toBe(
      `${BOM}"Name","Email","Checked in (Asia/Manila)","Checked out (Asia/Manila)","Minutes"\r\n`,
    );
  });

  it("writes closed records with whole minutes and open records with blanks", () => {
    const csv = buildTimeLogCsv(
      [
        { name: "Zoë", email: "zoe@example.com", checkedInAt: IN, checkedOutAt: OUT },
        { name: "Mo", email: "mo@example.com", checkedInAt: OUT, checkedOutAt: null },
      ],
      "UTC",
    );
    expect(csv.split("\r\n")).toEqual([
      `${BOM}"Name","Email","Checked in (UTC)","Checked out (UTC)","Minutes"`,
      '"Zoë","zoe@example.com","2026-11-17 09:05","2026-11-17 17:20","495"',
      '"Mo","mo@example.com","2026-11-17 17:20","",""',
      "",
    ]);
  });
});

describe.skipIf(!canUseDatabase)("the CSV download", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    stubAuthEnv();
    request.cookie = "";
    await emptyDatabase();
    await createFirstAdmin({
      token: SETUP_TOKEN,
      name: "Ada",
      email: "ada@example.com",
      password: PASSWORD,
    });
    [{ id: adminId }] = await getDb().select().from(users);
    const invited = await createInvite({
      email: "member@example.com",
      role: "member",
      createdBy: adminId,
    });
    if (!invited.ok) throw new Error(invited.error);
    await acceptInvite({ token: invited.token, name: "=Mo", password: PASSWORD });
    await getDb().delete(invites);
    const [member] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, "member@example.com"));
    memberId = member.id;
  });
  afterEach(() => vi.unstubAllEnvs());

  async function download(query = "") {
    const { GET } = await import("@/app/admin/time-log/csv/route");
    return GET(new Request(`http://localhost:3000/admin/time-log/csv${query}`));
  }

  it("sends a logged-out visitor to the login page", async () => {
    await expect(download()).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("gives a member the same not found as the admin pages", async () => {
    request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
    expect(request.cookie).not.toBe("");

    await expect(download()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("gives an admin every record, oldest first, as a download", async () => {
    await getDb()
      .insert(attendanceSessions)
      .values([
        { id: "b", userId: adminId, checkedInAt: OUT, checkedOutAt: null },
        { id: "a", userId: memberId, checkedInAt: IN, checkedOutAt: OUT },
      ]);
    request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";

    const response = await download("?tz=Asia%2FManila");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="time-log-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    // text() would drop the UTF-8 mark, so read the raw bytes.
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await response.arrayBuffer());
    expect(text.split("\r\n")).toEqual([
      `${BOM}"Name","Email","Checked in (Asia/Manila)","Checked out (Asia/Manila)","Minutes"`,
      `"'=Mo","member@example.com","2026-11-17 17:05","2026-11-18 01:20","495"`,
      '"Ada","ada@example.com","2026-11-18 01:20","",""',
      "",
    ]);
  });

  it("is not cut off at the page's 200 records", async () => {
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    await getDb()
      .insert(attendanceSessions)
      .values(
        Array.from({ length: 250 }, (_, i) => ({
          id: `r${i}`,
          userId: memberId,
          checkedInAt: new Date(start + i * 86_400_000),
          checkedOutAt: new Date(start + i * 86_400_000 + 3_600_000),
        })),
      );
    request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";

    const text = await (await download()).text();

    expect(text.trimEnd().split("\r\n")).toHaveLength(251);
    expect(text).toContain("(UTC)");
  });
});
