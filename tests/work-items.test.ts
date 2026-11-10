import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { cubicles, invites, projects, tasks, users } from "@/db/schema";
import { checkIn, checkOut } from "@/server/attendance";
import { acceptInvite, createInvite } from "@/server/invites";
import {
  createProject,
  finishProject,
  listProjects,
  reopenProject,
  updateProject,
} from "@/server/projects";
import { createFirstAdmin } from "@/server/setup";
import {
  acceptTask,
  cancelTask,
  countInbox,
  listInbox,
  listSent,
  MAX_WAITING_TASKS,
  rejectTask,
  sendTask,
} from "@/server/tasks";
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

describe.skipIf(!canUseDatabase)("work items", () => {
  let senderId: string;
  let receiverId: string;

  async function addMember(email: string, name: string): Promise<string> {
    const invited = await createInvite({ email, role: "member", createdBy: senderId });
    if (!invited.ok) throw new Error(invited.error);
    await acceptInvite({ token: invited.token, name, password: PASSWORD });
    const [member] = await getDb().select().from(users).where(eq(users.email, email));
    return member.id;
  }

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
    [{ id: senderId }] = await getDb().select().from(users);
    receiverId = await addMember("member@example.com", "Mo");
    await getDb().delete(invites);
  });
  afterEach(() => vi.unstubAllEnvs());

  const send = (title = "Build the lobby", to = receiverId, from = senderId) =>
    sendTask(from, { receiverId: to, title, description: "With a machine" });

  async function sendAndGetId(title?: string): Promise<string> {
    expect((await send(title)).ok).toBe(true);
    const [task] = await listSent(senderId);
    return task.id;
  }

  const count = async () => ({
    projects: (await getDb().select().from(projects)).length,
    cubicles: (await getDb().select().from(cubicles)).length,
  });

  describe("sending", () => {
    it("puts the task in the receiver's inbox and creates nothing else", async () => {
      await send();
      expect(await countInbox(receiverId)).toBe(1);
      expect((await listInbox(receiverId))[0]).toMatchObject({
        title: "Build the lobby",
        sentBy: "Ada",
      });
      expect(await count()).toEqual({ projects: 0, cubicles: 0 });
    });

    it("refuses sending to yourself, in the rules and in the database", async () => {
      expect((await send("Mine", senderId)).ok).toBe(false);
      await expect(
        getDb().insert(tasks).values({ id: "x", senderId, receiverId: senderId, title: "Mine" }),
      ).rejects.toThrow();
    });

    it("refuses an empty or over-long title, and an unknown person", async () => {
      expect((await send("   ")).ok).toBe(false);
      expect((await send("x".repeat(121))).ok).toBe(false);
      expect((await send("Fine", "nobody")).ok).toBe(false);
    });

    it("allows 10 waiting tasks per sender per receiver, and refuses the 11th", async () => {
      for (let i = 0; i < MAX_WAITING_TASKS; i += 1) {
        expect((await send(`Task ${i}`)).ok).toBe(true);
      }
      expect((await send("One too many")).ok).toBe(false);
      expect(await countInbox(receiverId)).toBe(MAX_WAITING_TASKS);
    });

    it("holds the limit when many sends arrive at once", async () => {
      const results = await Promise.all(
        Array.from({ length: MAX_WAITING_TASKS + 5 }, (_, i) => send(`Task ${i}`)),
      );
      expect(results.filter((result) => result.ok)).toHaveLength(MAX_WAITING_TASKS);
    });

    it("frees a slot once a task is answered", async () => {
      for (let i = 0; i < MAX_WAITING_TASKS; i += 1) await send(`Task ${i}`);
      const [newest] = await listSent(senderId);
      await rejectTask(receiverId, newest.id, "");
      expect((await send("Fits now")).ok).toBe(true);
    });

    it("counts each sender and each receiver separately", async () => {
      const thirdId = await addMember("third@example.com", "Tess");
      for (let i = 0; i < MAX_WAITING_TASKS; i += 1) await send(`Task ${i}`);
      expect((await send("To someone else", thirdId)).ok).toBe(true);
      expect((await send("From someone else", receiverId, thirdId)).ok).toBe(true);
    });
  });

  describe("answering", () => {
    it("turns an accepted task into one project with one cubicle", async () => {
      const id = await sendAndGetId();
      expect((await acceptTask(receiverId, id)).ok).toBe(true);

      const [project] = await listProjects(receiverId);
      expect(project).toMatchObject({ title: "Build the lobby", seat: 1, sentBy: "Ada" });
      expect(await count()).toEqual({ projects: 1, cubicles: 1 });
      expect(await countInbox(receiverId)).toBe(0);
      expect((await listSent(senderId))[0].status).toBe("accepted");
    });

    it("gives the sender no project", async () => {
      await acceptTask(receiverId, await sendAndGetId());
      expect(await listProjects(senderId)).toHaveLength(0);
    });

    it("creates exactly one project when accepted several times at once", async () => {
      const id = await sendAndGetId();
      const results = await Promise.all([1, 2, 3, 4].map(() => acceptTask(receiverId, id)));
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(await count()).toEqual({ projects: 1, cubicles: 1 });
    });

    it("creates nothing on reject, and shows the sender the reason", async () => {
      const id = await sendAndGetId();
      expect((await rejectTask(receiverId, id, " Too busy ")).ok).toBe(true);
      expect(await count()).toEqual({ projects: 0, cubicles: 0 });
      expect((await listSent(senderId))[0]).toMatchObject({
        status: "rejected",
        rejectReason: "Too busy",
      });
    });

    it("allows a reject with no reason and refuses an over-long one", async () => {
      const id = await sendAndGetId();
      expect((await rejectTask(receiverId, id, "x".repeat(501))).ok).toBe(false);
      expect((await rejectTask(receiverId, id, "")).ok).toBe(true);
      expect((await listSent(senderId))[0].rejectReason).toBeNull();
    });

    it("lets only the receiver accept or reject", async () => {
      const id = await sendAndGetId();
      expect((await acceptTask(senderId, id)).ok).toBe(false);
      expect((await rejectTask(senderId, id, "")).ok).toBe(false);
      expect((await listSent(senderId))[0].status).toBe("pending");
    });

    it("lets only the sender cancel, and creates nothing", async () => {
      const id = await sendAndGetId();
      expect((await cancelTask(receiverId, id)).ok).toBe(false);
      expect((await cancelTask(senderId, id)).ok).toBe(true);
      expect(await countInbox(receiverId)).toBe(0);
      expect(await count()).toEqual({ projects: 0, cubicles: 0 });
    });

    it("refuses any answer once a task has been answered", async () => {
      const id = await sendAndGetId();
      await cancelTask(senderId, id);
      expect((await acceptTask(receiverId, id)).ok).toBe(false);
      expect((await rejectTask(receiverId, id, "")).ok).toBe(false);
      expect((await cancelTask(senderId, id)).ok).toBe(false);
      expect(await count()).toEqual({ projects: 0, cubicles: 0 });
    });
  });

  describe("projects", () => {
    const create = (title: string) => createProject(receiverId, { title, description: "" });
    const projectId = async (title: string) => {
      const found = await listProjects(receiverId);
      return found.find((project) => project.title === title)!.id;
    };
    const seatOf = async (title: string) =>
      (await listProjects(receiverId)).find((project) => project.title === title)!.seat;

    it("gives a new project a cubicle at the next seat", async () => {
      await create("One");
      await create("Two");
      expect(await seatOf("One")).toBe(1);
      expect(await seatOf("Two")).toBe(2);
    });

    it("never gives two projects the same seat when created at once", async () => {
      await Promise.all([1, 2, 3, 4, 5].map((n) => create(`P${n}`)));
      const seats = (await listProjects(receiverId)).map((project) => project.seat).sort();
      expect(seats).toEqual([1, 2, 3, 4, 5]);
    });

    it("has the database refuse a second cubicle for one project", async () => {
      await create("One");
      const id = await projectId("One");
      await expect(
        getDb()
          .insert(cubicles)
          .values({ id: "second", ownerId: receiverId, projectId: id, seat: 9 }),
      ).rejects.toThrow();
    });

    it("edits the details and leaves the task's original wording alone", async () => {
      await acceptTask(receiverId, await sendAndGetId());
      const id = await projectId("Build the lobby");
      const result = await updateProject(receiverId, id, { title: "New name", description: "New" });
      expect(result.ok).toBe(true);

      expect((await listProjects(receiverId))[0]).toMatchObject({ title: "New name" });
      expect((await listSent(senderId))[0].title).toBe("Build the lobby");
    });

    it("refuses bad details and edits by anyone but the owner", async () => {
      await create("One");
      const id = await projectId("One");
      expect((await updateProject(receiverId, id, { title: " ", description: "" })).ok).toBe(false);
      expect((await updateProject(senderId, id, { title: "Taken", description: "" })).ok).toBe(
        false,
      );
      expect(await seatOf("One")).toBe(1);
    });

    it("removes the cubicle on finish and keeps the project", async () => {
      await create("One");
      expect((await finishProject(receiverId, await projectId("One"))).ok).toBe(true);
      expect(await count()).toEqual({ projects: 1, cubicles: 0 });
      expect((await listProjects(receiverId))[0].finishedAt).not.toBeNull();
    });

    it("refuses editing or finishing a finished project", async () => {
      await create("One");
      const id = await projectId("One");
      await finishProject(receiverId, id);
      expect((await updateProject(receiverId, id, { title: "Late", description: "" })).ok).toBe(
        false,
      );
      expect((await finishProject(receiverId, id)).ok).toBe(false);
    });

    it("reopens into the lowest free seat", async () => {
      await create("One");
      await create("Two");
      const id = await projectId("One");
      await finishProject(receiverId, await projectId("Two"));
      await finishProject(receiverId, id);
      await create("Three");

      expect((await reopenProject(receiverId, id)).ok).toBe(true);
      expect(await seatOf("Three")).toBe(1);
      expect(await seatOf("One")).toBe(2);
    });

    it("refuses reopening an active project, and anyone but the owner", async () => {
      await create("One");
      const id = await projectId("One");
      expect((await reopenProject(receiverId, id)).ok).toBe(false);
      await finishProject(receiverId, id);
      expect((await reopenProject(senderId, id)).ok).toBe(false);
      expect((await finishProject(senderId, id)).ok).toBe(false);
      expect(await count()).toEqual({ projects: 1, cubicles: 0 });
    });

    it("lists active projects before finished ones", async () => {
      await create("Done");
      await finishProject(receiverId, await projectId("Done"));
      await create("Older active");
      expect((await listProjects(receiverId)).map((project) => project.title)).toEqual([
        "Older active",
        "Done",
      ]);
    });
  });

  describe("check-in gate", () => {
    const form = (fields: Record<string, string>) => {
      const data = new FormData();
      for (const [name, value] of Object.entries(fields)) data.set(name, value);
      return data;
    };
    const logInAsMember = async () => {
      request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
      expect(request.cookie).not.toBe("");
    };
    const projectActions = () => import("@/app/projects/actions");
    const inboxActions = () => import("@/app/inbox/actions");
    const sentActions = () => import("@/app/sent/actions");

    const everyAction = async () => {
      const { createProjectAction, updateProjectAction, finishProjectAction, reopenProjectAction } =
        await projectActions();
      const { acceptTaskAction, rejectTaskAction } = await inboxActions();
      const { sendTaskAction, cancelTaskAction } = await sentActions();
      return [
        createProjectAction,
        updateProjectAction,
        finishProjectAction,
        reopenProjectAction,
        acceptTaskAction,
        rejectTaskAction,
        sendTaskAction,
        cancelTaskAction,
      ];
    };

    it("sends every action back to the lobby when not checked in", async () => {
      await logInAsMember();
      const data = form({ id: "x", title: "T", description: "", receiverId: senderId });
      for (const action of await everyAction()) {
        await expect(action({}, data)).rejects.toMatchObject({
          digest: expect.stringContaining(";/;"),
        });
      }
      expect(await count()).toEqual({ projects: 0, cubicles: 0 });
      expect(await listSent(receiverId)).toHaveLength(0);
    });

    it("sends every action to the login page when logged out", async () => {
      for (const action of await everyAction()) {
        await expect(action({}, form({ id: "x" }))).rejects.toMatchObject({
          digest: expect.stringContaining(";/login;"),
        });
      }
    });

    it("refuses again after checking out", async () => {
      await logInAsMember();
      await checkIn(receiverId);
      await checkOut(receiverId);
      const { createProjectAction } = await projectActions();
      await expect(
        createProjectAction({}, form({ title: "Late", description: "" })),
      ).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });
      expect(await count()).toEqual({ projects: 0, cubicles: 0 });
    });

    it("takes the owner from the session, not the form", async () => {
      await logInAsMember();
      await checkIn(receiverId);
      const { createProjectAction } = await projectActions();
      const state = await createProjectAction(
        {},
        form({ title: "Mine", description: "", ownerId: senderId }),
      );
      expect(state).toEqual({});
      expect(await listProjects(receiverId)).toHaveLength(1);
      expect(await listProjects(senderId)).toHaveLength(0);
    });

    it("hands the typed details back when the server refuses", async () => {
      await logInAsMember();
      await checkIn(receiverId);
      const { sendTaskAction } = await sentActions();
      const state = await sendTaskAction(
        {},
        form({ title: "Keep this", description: "And this", receiverId: "nobody" }),
      );
      expect(state).toMatchObject({
        error: expect.any(String),
        title: "Keep this",
        description: "And this",
      });
    });
  });
});
