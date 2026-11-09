import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { attendanceSessions, invites, users } from "@/db/schema";
import {
  checkIn,
  checkOut,
  getOpenAttendance,
  listEveryonesTimeLog,
  listTimeLog,
} from "@/server/attendance";
import { acceptInvite, createInvite } from "@/server/invites";
import { createFirstAdmin } from "@/server/setup";
import { formatDuration } from "@/ui/time-log-list";
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

describe("formatDuration", () => {
  const start = new Date("2026-11-10T08:00:00Z");
  const after = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

  it("shows minutes under an hour", () => {
    expect(formatDuration(start, after(59))).toBe("59m");
  });

  it("shows hours and minutes past an hour", () => {
    expect(formatDuration(start, after(125))).toBe("2h 5m");
  });
});

describe.skipIf(!canUseDatabase)("attendance", () => {
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
    await acceptInvite({ token: invited.token, name: "Mo", password: PASSWORD });
    await getDb().delete(invites);
    const [member] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, "member@example.com"));
    memberId = member.id;
  });
  afterEach(() => vi.unstubAllEnvs());

  const logInAsMember = async () => {
    request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
    expect(request.cookie).not.toBe("");
  };
  const actions = () => import("@/app/actions");
  const gate = async () => (await import("@/server/session")).requireCheckedIn();

  describe("rules", () => {
    it("opens one record on check-in", async () => {
      expect((await checkIn(memberId)).ok).toBe(true);
      expect(await getOpenAttendance(memberId)).not.toBeNull();
    });

    it("blocks a second check-in", async () => {
      await checkIn(memberId);
      expect((await checkIn(memberId)).ok).toBe(false);
      expect(await listTimeLog(memberId)).toHaveLength(1);
    });

    it("lets only one of several simultaneous check-ins through", async () => {
      const results = await Promise.all([1, 2, 3, 4].map(() => checkIn(memberId)));
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(await listTimeLog(memberId)).toHaveLength(1);
    });

    it("has the database refuse a second open record", async () => {
      await checkIn(memberId);
      await expect(
        getDb().insert(attendanceSessions).values({ id: "second", userId: memberId }),
      ).rejects.toThrow();
    });

    it("stays open however long ago the check-in was", async () => {
      await checkIn(memberId);
      await getDb()
        .update(attendanceSessions)
        .set({ checkedInAt: sql`now() - interval '30 days'` });

      expect(await getOpenAttendance(memberId)).not.toBeNull();
      expect((await listTimeLog(memberId))[0].checkedOutAt).toBeNull();
    });

    it("logs the time on check-out and allows a new check-in", async () => {
      await checkIn(memberId);
      expect((await checkOut(memberId)).ok).toBe(true);

      expect(await getOpenAttendance(memberId)).toBeNull();
      expect((await listTimeLog(memberId))[0].checkedOutAt).toBeInstanceOf(Date);
      expect((await checkIn(memberId)).ok).toBe(true);
      expect(await listTimeLog(memberId)).toHaveLength(2);
    });

    it("refuses a check-out with nothing open", async () => {
      expect((await checkOut(memberId)).ok).toBe(false);
    });

    it("only touches the person's own record", async () => {
      await checkIn(memberId);
      await checkIn(adminId);
      await checkOut(memberId);

      expect(await getOpenAttendance(adminId)).not.toBeNull();
      expect(await listTimeLog(memberId)).toHaveLength(1);
      expect(await listEveryonesTimeLog()).toHaveLength(2);
    });
  });

  describe("requireCheckedIn", () => {
    it("sends a logged-out visitor to the login page", async () => {
      await expect(gate()).rejects.toMatchObject({
        digest: expect.stringContaining(";/login;"),
      });
    });

    it("sends someone not checked in to the lobby", async () => {
      await logInAsMember();
      await expect(gate()).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });
    });

    it("lets a checked-in person through", async () => {
      await logInAsMember();
      await checkIn(memberId);
      await expect(gate()).resolves.toMatchObject({ id: memberId });
    });

    it("refuses again after check-out", async () => {
      await logInAsMember();
      await checkIn(memberId);
      await checkOut(memberId);
      await expect(gate()).rejects.toThrow(/NEXT_REDIRECT/);
    });
  });

  describe("the machine", () => {
    it("refuses a logged-out visitor", async () => {
      const { pressMachineAction } = await actions();
      await expect(pressMachineAction()).rejects.toThrow(/NEXT_REDIRECT/);
      expect(await getDb().select().from(attendanceSessions)).toHaveLength(0);
    });

    it("checks in someone who is checked out, without asking", async () => {
      await logInAsMember();
      const { pressMachineAction } = await actions();

      await expect(pressMachineAction()).resolves.toEqual({ stillCheckedIn: false });
      expect(await getOpenAttendance(memberId)).not.toBeNull();
    });

    it("asks someone who never checked out, and changes nothing until they answer", async () => {
      await logInAsMember();
      await checkIn(memberId);
      const { pressMachineAction } = await actions();

      await expect(pressMachineAction()).resolves.toEqual({ stillCheckedIn: true });

      const log = await listTimeLog(memberId);
      expect(log).toHaveLength(1);
      expect(log[0].checkedOutAt).toBeNull();
    });

    it("logs the check-out time when they answer yes", async () => {
      await logInAsMember();
      await checkIn(memberId);
      const { checkOutAction } = await actions();

      await checkOutAction();

      expect((await listTimeLog(memberId))[0].checkedOutAt).toBeInstanceOf(Date);
    });

    it("refuses a check-out from someone not checked in", async () => {
      await logInAsMember();
      const { checkOutAction } = await actions();
      await expect(checkOutAction()).rejects.toThrow(/NEXT_REDIRECT/);
    });
  });
});
