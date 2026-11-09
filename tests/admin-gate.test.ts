import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { invites, users } from "@/db/schema";
import { acceptInvite, createInvite } from "@/server/invites";
import { createFirstAdmin } from "@/server/setup";
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

const inviteForm = () => {
  const form = new FormData();
  form.set("email", "someone@example.com");
  form.set("role", "admin");
  return form;
};

describe.skipIf(!canUseDatabase)("admin actions are enforced on the server", () => {
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
    const [admin] = await getDb().select().from(users);
    const invited = await createInvite({
      email: "member@example.com",
      role: "member",
      createdBy: admin.id,
    });
    if (!invited.ok) throw new Error(invited.error);
    await acceptInvite({ token: invited.token, name: "Mo", password: PASSWORD });
    await getDb().delete(invites);
  });
  afterEach(() => vi.unstubAllEnvs());

  async function submitInvite() {
    const { createInviteAction } = await import("@/app/admin/people/actions");
    return createInviteAction({}, inviteForm());
  }

  it("sends a logged-out visitor to the login page", async () => {
    await expect(submitInvite()).rejects.toThrow(/NEXT_REDIRECT/);
    expect(await getDb().select().from(invites)).toHaveLength(0);
  });

  it("refuses a member", async () => {
    request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
    expect(request.cookie).not.toBe("");

    await expect(submitInvite()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(await getDb().select().from(invites)).toHaveLength(0);
  });

  it("lets an admin create an invite link", async () => {
    request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";

    const state = await submitInvite();

    expect(state.link).toMatch(/^http:\/\/localhost:3000\/invite\/.+/);
    expect(await getDb().select().from(invites)).toHaveLength(1);
  });

  it("does not let a member change their own role through the auth route", async () => {
    const cookie = (await logIn("member@example.com", PASSWORD)) ?? "";

    const response = await postAuth("/update-user", { role: "admin" }, cookie);

    expect(response.ok).toBe(false);
    const member = await getDb().select().from(users).where(eq(users.email, "member@example.com"));
    expect(member[0].role).toBe("member");
  });
});
