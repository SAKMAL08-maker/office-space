import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { invites, users, workSessions } from "@/db/schema";
import { checkIn, checkOut } from "@/server/attendance";
import { getFloor } from "@/server/floor";
import { acceptInvite, createInvite } from "@/server/invites";
import { createProject, finishProject, listProjects, reopenProject } from "@/server/projects";
import { createFirstAdmin } from "@/server/setup";
import { acceptTask, sendTask } from "@/server/tasks";
import { listWorkLog, startWork, stopWork } from "@/server/work";
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

const openPeriods = (userId: string) =>
  getDb()
    .select()
    .from(workSessions)
    .where(and(eq(workSessions.userId, userId), isNull(workSessions.endedAt)));

describe.skipIf(!canUseDatabase)("working at a cubicle", () => {
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

  /** Creates projects for the person and returns their ids in the order given. */
  async function projectsFor(ownerId: string, ...titles: string[]) {
    for (const title of titles) await createProject(ownerId, { title, description: "" });
    const listed = await listProjects(ownerId);
    return titles.map((title) => listed.find((p) => p.title === title)!.id);
  }

  it("refuses to start before check-in", async () => {
    const [lobby] = await projectsFor(memberId, "Lobby");
    expect(await startWork(memberId, lobby)).toEqual({
      ok: false,
      error: "You are not checked in.",
    });
    expect(await openPeriods(memberId)).toHaveLength(0);
  });

  it("lets only the owner work in a cubicle, and only while the project is active", async () => {
    await checkIn(memberId);
    const [theirs] = await projectsFor(adminId, "Not mine");
    const [finished] = await projectsFor(memberId, "Old");
    await finishProject(memberId, finished);

    for (const projectId of [theirs, finished, "no-such-project"]) {
      const result = await startWork(memberId, projectId);
      expect(result.ok).toBe(false);
    }
    expect(await openPeriods(memberId)).toHaveLength(0);
  });

  it("starts a period, keeps it when started again, and moves it when starting elsewhere", async () => {
    await checkIn(memberId);
    const [lobby, floor] = await projectsFor(memberId, "Lobby", "Floor");

    expect(await startWork(memberId, lobby)).toEqual({ ok: true });
    const [first] = await openPeriods(memberId);
    expect(first.projectId).toBe(lobby);

    expect(await startWork(memberId, lobby)).toEqual({ ok: true });
    expect(await openPeriods(memberId)).toEqual([first]);

    expect(await startWork(memberId, floor)).toEqual({ ok: true });
    const open = await openPeriods(memberId);
    expect(open.map((period) => period.projectId)).toEqual([floor]);

    const log = await listWorkLog(memberId);
    expect(log.map((entry) => entry.title).sort()).toEqual(["Floor", "Lobby"]);
    const ended = log.find((entry) => entry.title === "Lobby")!;
    expect(ended.endedAt).not.toBeNull();
    expect(ended.endedAt!.getTime()).toBeGreaterThanOrEqual(ended.startedAt.getTime());
  });

  it("keeps only one open period when two starts arrive at once", async () => {
    await checkIn(memberId);
    const [a, b] = await projectsFor(memberId, "A", "B");
    const results = await Promise.all([startWork(memberId, a), startWork(memberId, b)]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(await openPeriods(memberId)).toHaveLength(1);
  });

  it("stops working, and says so when there is nothing to stop", async () => {
    await checkIn(memberId);
    const [lobby] = await projectsFor(memberId, "Lobby");
    await startWork(memberId, lobby);

    expect(await stopWork(memberId)).toEqual({ ok: true });
    expect(await openPeriods(memberId)).toHaveLength(0);
    expect(await stopWork(memberId)).toEqual({
      ok: false,
      error: "You are not working on anything.",
    });
  });

  it("ends the period on check-out, even if a start arrives at the same moment", async () => {
    await checkIn(memberId);
    const [lobby, floor] = await projectsFor(memberId, "Lobby", "Floor");
    await startWork(memberId, lobby);

    await Promise.all([checkOut(memberId), startWork(memberId, floor)]);
    expect(await openPeriods(memberId)).toHaveLength(0);
  });

  it("ends the period when its project is finished, and not when another one is", async () => {
    await checkIn(memberId);
    const [lobby, floor] = await projectsFor(memberId, "Lobby", "Floor");
    await startWork(memberId, lobby);

    await finishProject(memberId, floor);
    expect(await openPeriods(memberId)).toHaveLength(1);

    await finishProject(memberId, lobby);
    expect(await openPeriods(memberId)).toHaveLength(0);

    // Reopening gives the cubicle back, but work only starts again when asked.
    await reopenProject(memberId, lobby);
    expect(await openPeriods(memberId)).toHaveLength(0);
    expect(await startWork(memberId, lobby)).toEqual({ ok: true });
  });

  it("shows who is working on the floor and in My projects", async () => {
    await checkIn(memberId);
    await checkIn(adminId);
    const sent = await sendTask(adminId, {
      receiverId: memberId,
      title: "Signs",
      description: "Paint them",
    });
    expect(sent.ok).toBe(true);
    const [task] = await getDb().query.tasks.findMany();
    await acceptTask(memberId, task.id);
    const [signs] = (await listProjects(memberId)).map((p) => p.id);
    await startWork(memberId, signs);

    request.cookie = (await logIn("zoe@example.com", PASSWORD)) ?? "";
    const floor = await getFloor();
    const mo = floor.offices.find((office) => office.ownerId === memberId)!;
    expect(mo.cubicles).toEqual([
      {
        seat: 1,
        projectId: signs,
        title: "Signs",
        description: "Paint them",
        sentBy: "Zoe",
        workingSince: expect.any(Date),
      },
    ]);

    const [listed] = await listProjects(memberId);
    expect(listed.workingSince).toEqual(expect.any(Date));
    await stopWork(memberId);
    const [after] = await listProjects(memberId);
    expect(after.workingSince).toBeNull();
  });
});
