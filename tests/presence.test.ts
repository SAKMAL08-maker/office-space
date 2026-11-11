import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/presence/route";
import { getDb } from "@/db/client";
import { attendanceSessions, invites, presence, users } from "@/db/schema";
import { checkIn, checkOut } from "@/server/attendance";
import { getFloor } from "@/server/floor";
import { acceptInvite, createInvite } from "@/server/invites";
import { listPresence, parseSpot } from "@/server/presence";
import { createProject, listProjects } from "@/server/projects";
import { createFirstAdmin } from "@/server/setup";
import { startWork } from "@/server/work";
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

describe("parseSpot", () => {
  it("accepts a whole cell, or null for a page with no 3D office", () => {
    expect(parseSpot({ spot: { x: 2, z: -5 } })).toEqual({ x: 2, z: -5 });
    expect(parseSpot({ spot: null })).toBeNull();
  });

  it("refuses anything else", () => {
    for (const body of [
      null,
      "spot",
      {},
      { spot: {} },
      { spot: { x: 1 } },
      { spot: { x: 1.5, z: 0 } },
      { spot: { x: "1", z: 0 } },
      { spot: { x: 1001, z: 0 } },
      { spot: { x: 0, z: Number.NaN } },
    ]) {
      expect(parseSpot(body)).toBeUndefined();
    }
  });
});

const post = (body: unknown) =>
  POST(
    new Request("http://localhost:3000/api/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe.skipIf(!canUseDatabase)("presence", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    stubAuthEnv();
    request.cookie = "";
    await emptyDatabase();
    await createFirstAdmin({
      token: SETUP_TOKEN,
      name: "Zoe",
      email: "zoe@example.com",
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

  /** Pretends the person's tab last spoke this many seconds ago. */
  const lastSeenSecondsAgo = (userId: string, seconds: number) =>
    getDb()
      .update(presence)
      .set({ lastSeenAt: sql`now() - make_interval(secs => ${seconds})` })
      .where(eq(presence.userId, userId));

  it("sends a logged-out visitor to log in, and someone checked out to the lobby", async () => {
    await expect(post({ spot: null })).rejects.toMatchObject({
      digest: expect.stringContaining(";/login;"),
    });
    await logInAsMember();
    await expect(post({ spot: null })).rejects.toMatchObject({
      digest: expect.stringContaining(";/;"),
    });
    expect(await getDb().select().from(presence)).toEqual([]);
  });

  it("refuses a made-up body without saving anything", async () => {
    await logInAsMember();
    await checkIn(memberId);
    expect((await post("not json")).status).toBe(400);
    expect((await post({ spot: { x: 99999, z: 0 } })).status).toBe(400);
    expect(await getDb().select().from(presence)).toEqual([]);
  });

  it("saves the spot and answers with everyone checked in and the floor's key", async () => {
    await logInAsMember();
    await checkIn(memberId);
    const response = await post({ spot: { x: 2, z: -5 } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const reply = await response.json();
    // Zoe has not checked in, so she is not listed.
    expect(reply.people).toEqual([
      { id: memberId, name: "Mo", spot: { x: 2, z: -5 }, away: false, workingOn: null },
    ]);
    expect(reply.floorKey).toBe((await getFloor()).key);
  });

  it("keeps the last spot when a page without 3D only says it is still here", async () => {
    await logInAsMember();
    await checkIn(memberId);
    await post({ spot: { x: 2, z: -5 } });
    await lastSeenSecondsAgo(memberId, 60);
    await post({ spot: null });
    const [row] = await getDb().select().from(presence);
    expect(row).toMatchObject({ x: 2, z: -5 });
    expect(Date.now() - row.lastSeenAt.getTime()).toBeLessThan(10_000);
  });

  it("shows someone as away after two minutes of silence, still checked in", async () => {
    await logInAsMember();
    await checkIn(memberId);
    await checkIn(adminId);
    // Checked in ten minutes ago, so the aged reports below still come after the check-in.
    await getDb()
      .update(attendanceSessions)
      .set({ checkedInAt: sql`now() - interval '10 minutes'` });
    await post({ spot: { x: 2, z: -5 } });

    await lastSeenSecondsAgo(memberId, 110);
    expect((await listPresence()).find((p) => p.id === memberId)?.away).toBe(false);
    await lastSeenSecondsAgo(memberId, 130);
    expect((await listPresence()).find((p) => p.id === memberId)).toMatchObject({
      away: true,
      spot: { x: 2, z: -5 },
    });
    // Zoe is checked in but her tab has never reported, so she is away too, with no spot.
    expect((await listPresence()).find((p) => p.id === adminId)).toMatchObject({
      away: true,
      spot: null,
    });
  });

  it("leaves out people who checked out, and ignores a spot from before the latest check-in", async () => {
    await logInAsMember();
    await checkIn(memberId);
    await post({ spot: { x: 2, z: -5 } });
    await checkOut(memberId);
    expect(await listPresence()).toEqual([]);

    // Check-in and the old report share a clock tick in a fast test, so age the old report.
    await lastSeenSecondsAgo(memberId, 5);
    await checkIn(memberId);
    expect(await listPresence()).toEqual([
      { id: memberId, name: "Mo", spot: null, away: true, workingOn: null },
    ]);
  });

  it("says what each person is working on", async () => {
    await logInAsMember();
    await checkIn(memberId);
    await createProject(memberId, { title: "Lobby", description: "" });
    const [project] = await listProjects(memberId);
    await startWork(memberId, project.id);

    const reply = await (await post({ spot: null })).json();
    expect(reply.people[0].workingOn).toEqual({
      projectId: project.id,
      title: "Lobby",
      since: expect.any(String),
    });
  });

  it("changes the floor's key when a cubicle appears, but not when someone starts working", async () => {
    await logInAsMember();
    await checkIn(memberId);
    const before = (await getFloor()).key;
    await createProject(memberId, { title: "Lobby", description: "" });
    const withCubicle = (await getFloor()).key;
    expect(withCubicle).not.toBe(before);

    const [project] = await listProjects(memberId);
    await startWork(memberId, project.id);
    expect((await getFloor()).key).toBe(withCubicle);
  });
});
