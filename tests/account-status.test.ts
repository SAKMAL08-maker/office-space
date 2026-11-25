import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import {
  attendanceSessions,
  invites,
  passwordResetLinks,
  projects,
  sessions,
  tasks,
  users,
  workSessions,
} from "@/db/schema";
import { disableUser, enableUser } from "@/server/account-status";
import { checkIn, getOpenAttendance } from "@/server/attendance";
import { acceptInvite, createInvite } from "@/server/invites";
import { createPasswordResetLink, findUsableResetLink } from "@/server/password-resets";
import { createProject, listProjects } from "@/server/projects";
import { createFirstAdmin } from "@/server/setup";
import { sendTask } from "@/server/tasks";
import { listOtherPeople } from "@/server/users";
import { startWork } from "@/server/work";
import {
  canUseDatabase,
  emptyDatabase,
  logIn,
  PASSWORD,
  postAuth,
  SETUP_TOKEN,
  stubAuthEnv,
} from "./helpers/accounts";

const request = vi.hoisted(() => ({ cookie: "" }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(request.cookie ? { cookie: request.cookie } : {}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const MEMBER = "member@example.com";
const OTHER_ADMIN = "bo@example.com";

describe.skipIf(!canUseDatabase)("disabling an account", () => {
  let adminId: string;
  let memberId: string;

  async function invite(email: string, role: "admin" | "member", name: string) {
    const invited = await createInvite({ email, role, createdBy: adminId });
    if (!invited.ok) throw new Error(invited.error);
    await acceptInvite({ token: invited.token, name, password: PASSWORD });
    await getDb().delete(invites);
    const [user] = await getDb().select().from(users).where(eq(users.email, email));
    return user.id;
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
    [{ id: adminId }] = await getDb().select().from(users);
    memberId = await invite(MEMBER, "member", "Mo");
  });
  afterEach(() => vi.unstubAllEnvs());

  const disable = (userId: string, by = adminId) => disableUser({ userId, adminId: by });

  it("logs them out, checks them out and ends their work, in one go", async () => {
    await logIn(MEMBER, PASSWORD);
    await checkIn(memberId);
    await createProject(memberId, { title: "Ledger", description: "" });
    const [project] = await listProjects(memberId);
    expect(await startWork(memberId, project.id)).toEqual({ ok: true });

    expect(await disable(memberId)).toEqual({ ok: true });

    expect(await getDb().select().from(sessions).where(eq(sessions.userId, memberId))).toEqual([]);
    expect(await getOpenAttendance(memberId)).toBeNull();
    const [attendance] = await getDb()
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.userId, memberId));
    expect(attendance.checkedOutAt).not.toBeNull();
    const openWork = await getDb()
      .select()
      .from(workSessions)
      .where(and(eq(workSessions.userId, memberId), isNull(workSessions.endedAt)));
    expect(openWork).toEqual([]);
    // Their projects and cubicles stay.
    expect(
      await getDb().select().from(projects).where(eq(projects.ownerId, memberId)),
    ).toHaveLength(1);
  });

  it("cancels the tasks waiting to and from them, and voids their reset link", async () => {
    await sendTask(adminId, { receiverId: memberId, title: "To Mo", description: "" });
    await sendTask(memberId, { receiverId: adminId, title: "From Mo", description: "" });
    const link = await createPasswordResetLink({ userId: memberId, createdBy: adminId });
    if (!link.ok) throw new Error(link.error);

    await disable(memberId);

    const statuses = (await getDb().select().from(tasks)).map((task) => task.status);
    expect(statuses).toEqual(["cancelled", "cancelled"]);
    const [stored] = await getDb().select().from(passwordResetLinks);
    expect(stored.revokedAt).not.toBeNull();
    expect(await findUsableResetLink(link.token)).toBeNull();
  });

  it("refuses the right password, with its own message", async () => {
    await disable(memberId);

    const response = await postAuth("/sign-in/email", { email: MEMBER, password: PASSWORD });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("ACCOUNT_DISABLED");
    expect(await getDb().select().from(sessions).where(eq(sessions.userId, memberId))).toEqual([]);

    // A wrong password still gets the usual answer, so the message tells a guesser nothing.
    const wrong = await postAuth("/sign-in/email", { email: MEMBER, password: "not the password" });
    expect(wrong.status).toBe(401);
  });

  it("treats a login that is still open as logged out", async () => {
    request.cookie = (await logIn(MEMBER, PASSWORD)) ?? "";
    const { getCurrentUser } = await import("@/server/session");
    expect(await getCurrentUser()).not.toBeNull();

    // As if the request was already under way when the session was deleted.
    await getDb().update(users).set({ disabledAt: new Date() }).where(eq(users.id, memberId));
    expect(await getCurrentUser()).toBeNull();
  });

  it("stops anything new opening for them", async () => {
    await createProject(memberId, { title: "Ledger", description: "" });
    const [project] = await listProjects(memberId);
    await disable(memberId);

    expect(await checkIn(memberId)).toEqual({ ok: false, error: "Your account is disabled." });
    expect((await startWork(memberId, project.id)).ok).toBe(false);
    expect(
      await sendTask(adminId, { receiverId: memberId, title: "Late", description: "" }),
    ).toEqual({ ok: false, error: "That person could not be found." });
    expect((await createPasswordResetLink({ userId: memberId, createdBy: adminId })).ok).toBe(
      false,
    );
    expect((await listOtherPeople(adminId)).map((person) => person.id)).toEqual([]);
  });

  it("refuses to disable yourself, someone already disabled, or the last admin", async () => {
    expect(await disable(adminId)).toEqual({
      ok: false,
      error: "You cannot disable your own account.",
    });
    await disable(memberId);
    expect((await disable(memberId)).ok).toBe(false);
    // Only an enabled admin can act, but the rule holds even if another one is asked to.
    expect(await disable(adminId, memberId)).toEqual({
      ok: false,
      error: "The last admin cannot be disabled.",
    });
  });

  it("lets only one of two admins disabling each other at once succeed", async () => {
    const otherAdminId = await invite(OTHER_ADMIN, "admin", "Bo");

    const results = await Promise.all([disable(otherAdminId), disable(adminId, otherAdminId)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const enabledAdmins = await getDb()
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.disabledAt)));
    expect(enabledAdmins).toHaveLength(1);
  });

  it("lets them log in again once enabled", async () => {
    await disable(memberId);
    expect(await enableUser(memberId)).toEqual({ ok: true });
    expect(await logIn(MEMBER, PASSWORD)).toBeTruthy();
    expect((await checkIn(memberId)).ok).toBe(true);
  });

  it("ends a login after a day", async () => {
    await logIn(MEMBER, PASSWORD);
    const [session] = await getDb().select().from(sessions).where(eq(sessions.userId, memberId));
    const hoursLeft = (session.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(23.9);
    expect(hoursLeft).toBeLessThanOrEqual(24);
  });

  describe("the admin actions", () => {
    const form = (id: string) => {
      const data = new FormData();
      data.set("id", id);
      return data;
    };
    const actions = () => import("@/app/admin/people/actions");

    it("refuse a member", async () => {
      request.cookie = (await logIn(MEMBER, PASSWORD)) ?? "";
      const { disableAccountAction, enableAccountAction } = await actions();

      await expect(disableAccountAction({}, form(adminId))).rejects.toThrow(
        /NEXT_HTTP_ERROR_FALLBACK;404/,
      );
      await expect(enableAccountAction({}, form(memberId))).rejects.toThrow(
        /NEXT_HTTP_ERROR_FALLBACK;404/,
      );
      const [admin] = await getDb().select().from(users).where(eq(users.id, adminId));
      expect(admin.disabledAt).toBeNull();
    });

    it("let an admin disable and enable someone", async () => {
      request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";
      const { disableAccountAction, enableAccountAction } = await actions();

      expect(await disableAccountAction({}, form(memberId))).toEqual({});
      expect(await logIn(MEMBER, PASSWORD)).toBeNull();
      expect(await enableAccountAction({}, form(memberId))).toEqual({});
      expect(await logIn(MEMBER, PASSWORD)).toBeTruthy();
    });
  });
});
