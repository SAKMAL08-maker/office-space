import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { attachments, invites, MAX_ATTACHMENT_BYTES, projects, users } from "@/db/schema";
import { checkIn } from "@/server/attendance";
import {
  cleanFileName,
  downloadLink,
  filesByProject,
  fileProblem,
  finishUpload,
  MAX_FILES_PER_PROJECT,
  removeAttachment,
  startUpload,
} from "@/server/attachments";
import { acceptInvite, createInvite } from "@/server/invites";
import { createProject, finishProject } from "@/server/projects";
import { createFirstAdmin } from "@/server/setup";
import { acceptTask, listSent, sendTask } from "@/server/tasks";
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

// A pretend bucket: the tests decide what it holds, and nothing leaves this machine.
const bucket = vi.hoisted(() => ({ sizes: new Map<string, number>(), deleted: [] as string[] }));
vi.mock("@/server/storage", () => ({
  signUpload: async (key: string, size: number) => `https://bucket.test/put/${key}?size=${size}`,
  signDownload: async (key: string) => `https://bucket.test/get/${key}`,
  storedSize: async (key: string) => bucket.sizes.get(key) ?? null,
  deleteStored: async (key: string) => {
    bucket.deleted.push(key);
    bucket.sizes.delete(key);
  },
  UPLOAD_HEADERS: {},
}));

describe("file names and sizes", () => {
  it("keeps only the last part of a path and drops control characters", () => {
    expect(cleanFileName("C:\\Users\\me\\plan.pdf")).toBe("plan.pdf");
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName("a\nb\u0000.txt")).toBe("ab.txt");
    expect(cleanFileName("  ")).toBeNull();
    expect(cleanFileName("x".repeat(201))).toBeNull();
  });

  it("refuses empty, over-size and odd sizes", () => {
    expect(fileProblem({ fileName: "a.txt", size: 0 })).not.toBeNull();
    expect(fileProblem({ fileName: "a.txt", size: 1.5 })).not.toBeNull();
    expect(fileProblem({ fileName: "a.txt", size: MAX_ATTACHMENT_BYTES + 1 })).not.toBeNull();
    expect(fileProblem({ fileName: "a.txt", size: MAX_ATTACHMENT_BYTES })).toBeNull();
  });
});

describe.skipIf(!canUseDatabase)("attachments", () => {
  let senderId: string;
  let ownerId: string;
  let strangerId: string;
  let projectId: string;

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
    bucket.sizes.clear();
    bucket.deleted.length = 0;
    await emptyDatabase();
    await createFirstAdmin({
      token: SETUP_TOKEN,
      name: "Ada",
      email: "ada@example.com",
      password: PASSWORD,
    });
    [{ id: senderId }] = await getDb().select().from(users);
    ownerId = await addMember("member@example.com", "Mo");
    strangerId = await addMember("third@example.com", "Tess");
    await getDb().delete(invites);

    // Ada sends Mo a task and Mo accepts, so Mo owns the project and Ada sent it.
    await sendTask(senderId, { receiverId: ownerId, title: "Lobby", description: "" });
    const [task] = await listSent(senderId);
    await acceptTask(ownerId, task.id);
    [{ id: projectId }] = await getDb().select().from(projects);
  });
  afterEach(() => vi.unstubAllEnvs());

  const choice = (size = 100, fileName = "plan.pdf") => ({ fileName, size });

  /** Starts an upload, "sends" the file to the pretend bucket, and finishes it. */
  async function uploadAs(userId: string, size = 100): Promise<string> {
    const started = await startUpload(userId, projectId, choice(size));
    if (!started.ok) throw new Error(started.error);
    const [row] = await getDb().select().from(attachments).where(eq(attachments.id, started.id));
    bucket.sizes.set(row.storageKey, size);
    expect(await finishUpload(userId, started.id)).toEqual({ ok: true });
    return started.id;
  }

  describe("uploading", () => {
    it("lets the owner and the sender add files, and nobody else", async () => {
      const started = await startUpload(ownerId, projectId, choice());
      expect(started).toMatchObject({ ok: true });
      if (started.ok) {
        expect(started.url).toContain(`attachments/${projectId}/${started.id}`);
        expect(started.url).toContain("size=100");
      }
      expect(await startUpload(senderId, projectId, choice())).toMatchObject({ ok: true });
      expect(await startUpload(strangerId, projectId, choice())).toMatchObject({ ok: false });
      expect(await startUpload(ownerId, "no-such-project", choice())).toMatchObject({ ok: false });
    });

    it("refuses bad files before writing anything", async () => {
      expect(await startUpload(ownerId, projectId, choice(0))).toMatchObject({ ok: false });
      expect(await startUpload(ownerId, projectId, choice(MAX_ATTACHMENT_BYTES + 1))).toMatchObject(
        { ok: false },
      );
      expect(await getDb().select().from(attachments)).toEqual([]);
    });

    it("stores the cleaned-up name", async () => {
      await startUpload(ownerId, projectId, choice(100, "C:\\secret\\plan.pdf"));
      const [row] = await getDb().select().from(attachments);
      expect(row.fileName).toBe("plan.pdf");
    });

    it("refuses new files on a finished project but still lists the old ones", async () => {
      const id = await uploadAs(ownerId);
      await finishProject(ownerId, projectId);
      expect(await startUpload(ownerId, projectId, choice())).toMatchObject({ ok: false });
      expect(await downloadLink(ownerId, id)).toContain("https://bucket.test/get/");
    });

    it("allows 20 files per project, even when many uploads start at once", async () => {
      const results = await Promise.all(
        Array.from({ length: MAX_FILES_PER_PROJECT + 5 }, () =>
          startUpload(ownerId, projectId, choice()),
        ),
      );
      expect(results.filter((result) => result.ok)).toHaveLength(MAX_FILES_PER_PROJECT);
    });

    it("clears uploads abandoned for an hour, so they stop counting", async () => {
      for (let i = 0; i < MAX_FILES_PER_PROJECT; i += 1) {
        await startUpload(ownerId, projectId, choice());
      }
      expect(await startUpload(ownerId, projectId, choice())).toMatchObject({ ok: false });
      await getDb()
        .update(attachments)
        .set({ createdAt: sql`now() - interval '2 hours'` });
      expect(await startUpload(ownerId, projectId, choice())).toMatchObject({ ok: true });
      expect(bucket.deleted).toHaveLength(MAX_FILES_PER_PROJECT);
      expect(await getDb().select().from(attachments)).toHaveLength(1);
    });
  });

  describe("finishing", () => {
    it("marks the file ready only when the bucket holds it at the promised size", async () => {
      const id = await uploadAs(ownerId, 100);
      const [row] = await getDb().select().from(attachments);
      expect(row).toMatchObject({ id, status: "ready" });
    });

    it("throws away an upload of the wrong size, in the bucket and in the database", async () => {
      const started = await startUpload(ownerId, projectId, choice(100));
      if (!started.ok) throw new Error(started.error);
      const [row] = await getDb().select().from(attachments);
      bucket.sizes.set(row.storageKey, 999);
      expect(await finishUpload(ownerId, started.id)).toMatchObject({ ok: false });
      expect(bucket.deleted).toEqual([row.storageKey]);
      expect(await getDb().select().from(attachments)).toEqual([]);
    });

    it("clears the record when nothing arrived", async () => {
      const started = await startUpload(ownerId, projectId, choice());
      if (!started.ok) throw new Error(started.error);
      expect(await finishUpload(ownerId, started.id)).toMatchObject({ ok: false });
      expect(await getDb().select().from(attachments)).toEqual([]);
    });

    it("only lets the uploader finish their own upload", async () => {
      const started = await startUpload(ownerId, projectId, choice());
      if (!started.ok) throw new Error(started.error);
      expect(await finishUpload(senderId, started.id)).toMatchObject({ ok: false });
    });
  });

  describe("seeing and downloading", () => {
    it("shows ready files to the owner and the sender only", async () => {
      const id = await uploadAs(senderId);
      await startUpload(ownerId, projectId, choice()); // still pending, so not listed

      const forOwner = await filesByProject(ownerId, [projectId]);
      expect(forOwner.get(projectId)).toEqual([
        { id, fileName: "plan.pdf", size: 100, canRemove: true },
      ]);
      expect((await filesByProject(senderId, [projectId])).get(projectId)).toHaveLength(1);
      expect((await filesByProject(strangerId, [projectId])).size).toBe(0);

      expect(await downloadLink(ownerId, id)).toContain("https://bucket.test/get/");
      expect(await downloadLink(senderId, id)).toContain("https://bucket.test/get/");
      expect(await downloadLink(strangerId, id)).toBeNull();
    });

    it("gives no link for an upload that has not finished", async () => {
      const started = await startUpload(ownerId, projectId, choice());
      if (!started.ok) throw new Error(started.error);
      expect(await downloadLink(ownerId, started.id)).toBeNull();
    });

    it("keeps a person's own project files to themselves", async () => {
      await createProject(strangerId, { title: "Mine", description: "" });
      const [mine] = await getDb().select().from(projects).where(eq(projects.ownerId, strangerId));
      const started = await startUpload(senderId, mine.id, choice());
      expect(started).toMatchObject({ ok: false });
    });
  });

  describe("removing", () => {
    it("lets the uploader or the owner remove a file, and deletes the stored copy", async () => {
      const bySender = await uploadAs(senderId);
      const byOwner = await uploadAs(ownerId);

      expect(await removeAttachment(strangerId, bySender)).toMatchObject({ ok: false });
      expect(await removeAttachment(senderId, byOwner)).toMatchObject({ ok: false });

      expect(await removeAttachment(ownerId, bySender)).toEqual({ ok: true });
      expect(await removeAttachment(ownerId, byOwner)).toEqual({ ok: true });
      expect(bucket.deleted).toHaveLength(2);
      expect(await getDb().select().from(attachments)).toEqual([]);
    });

    it("tells the sender which files they may remove", async () => {
      await uploadAs(ownerId);
      await uploadAs(senderId);
      const listed = (await filesByProject(senderId, [projectId])).get(projectId) ?? [];
      expect(listed.map((file) => file.canRemove)).toEqual([false, true]);
    });
  });

  describe("the database", () => {
    it("refuses an empty or over-size file record by itself", async () => {
      const row = { projectId, uploaderId: ownerId, fileName: "a" };
      await expect(
        getDb()
          .insert(attachments)
          .values({ ...row, id: "a", storageKey: "a", size: 0 }),
      ).rejects.toThrow();
      await expect(
        getDb()
          .insert(attachments)
          .values({ ...row, id: "b", storageKey: "b", size: MAX_ATTACHMENT_BYTES + 1 }),
      ).rejects.toThrow();
    });
  });

  describe("the download address", () => {
    const get = async (id: string) => {
      const { GET } = await import("@/app/api/attachments/[id]/route");
      return GET(new Request(`http://localhost:3000/api/attachments/${id}`), {
        params: Promise.resolve({ id }),
      });
    };

    it("sends people who are not checked in away, and the rest on to a fresh link", async () => {
      const id = await uploadAs(ownerId);
      await expect(get(id)).rejects.toMatchObject({
        digest: expect.stringContaining(";/login;"),
      });
      request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
      await expect(get(id)).rejects.toMatchObject({ digest: expect.stringContaining(";/;") });

      await checkIn(ownerId);
      const response = await get(id);
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toContain("https://bucket.test/get/");
      expect(response.headers.get("cache-control")).toBe("no-store");
    });

    it("answers 404 to a checked-in stranger", async () => {
      const id = await uploadAs(ownerId);
      request.cookie = (await logIn("third@example.com", PASSWORD)) ?? "";
      await checkIn(strangerId);
      expect((await get(id)).status).toBe(404);
    });
  });
});
