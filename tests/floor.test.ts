import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { invites, users } from "@/db/schema";
import { checkIn, checkOut } from "@/server/attendance";
import { getFloor } from "@/server/floor";
import { acceptInvite, createInvite } from "@/server/invites";
import { createProject, finishProject, listProjects } from "@/server/projects";
import { createFirstAdmin } from "@/server/setup";
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

describe.skipIf(!canUseDatabase)("getFloor", () => {
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

  it("sends a logged-out visitor to the login page", async () => {
    await expect(getFloor()).rejects.toMatchObject({
      digest: expect.stringContaining(";/login;"),
    });
  });

  it("refuses someone not checked in, before and after a check-out", async () => {
    await logInAsMember();
    await expect(getFloor()).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });

    await checkIn(memberId);
    await checkOut(memberId);
    await expect(getFloor()).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });
  });

  it("lists everyone's office by name, with the cubicles of their active projects", async () => {
    await logInAsMember();
    await checkIn(memberId);
    const project = { title: "Lobby", description: "Draw it" };
    await createProject(adminId, project);
    await createProject(adminId, { ...project, title: "Floor" });
    await createProject(adminId, { ...project, title: "Doors" });
    const finished = (await listProjects(adminId)).find((p) => p.title === "Floor")!;
    await finishProject(adminId, finished.id);

    const floor = await getFloor();
    expect(floor.viewerId).toBe(memberId);
    const cubicle = (seat: number, title: string) => ({
      seat,
      projectId: expect.any(String),
      title,
      description: "Draw it",
      sentBy: null,
      workingSince: null,
    });
    expect(floor.offices).toEqual([
      { ownerId: memberId, name: "Mo", cubicles: [] },
      { ownerId: adminId, name: "Zoe", cubicles: [cubicle(1, "Lobby"), cubicle(3, "Doors")] },
    ]);
  });
});
