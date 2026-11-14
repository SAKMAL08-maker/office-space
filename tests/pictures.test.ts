import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { invites, MAX_PICTURE_BYTES, profilePictures, users } from "@/db/schema";
import { acceptInvite, createInvite } from "@/server/invites";
import {
  currentPictureId,
  finishPictureUpload,
  pictureSizeProblem,
  pictureType,
  removePicture,
  startPictureUpload,
} from "@/server/pictures";
import { listPresence } from "@/server/presence";
import { checkIn } from "@/server/attendance";
import { createFirstAdmin } from "@/server/setup";
import { avatarColors, contrast, initials, pictureUrl } from "@/ui/avatar-style";
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

// A pretend bucket holding real bytes, so the first-bytes check runs on something.
const bucket = vi.hoisted(() => ({
  files: new Map<string, Uint8Array<ArrayBuffer>>(),
  deleted: [] as string[],
}));
vi.mock("@/server/storage", () => ({
  signUpload: async (key: string, size: number) => `https://bucket.test/put/${key}?size=${size}`,
  storedSize: async (key: string) => bucket.files.get(key)?.length ?? null,
  readStoredStart: async (key: string, length: number) =>
    bucket.files.get(key)?.slice(0, length) ?? null,
  openStored: async (key: string) => {
    const bytes = bucket.files.get(key);
    return bytes ? new Blob([bytes]).stream() : null;
  },
  deleteStored: async (key: string) => {
    bucket.deleted.push(key);
    bucket.files.delete(key);
  },
  UPLOAD_HEADERS: {},
}));

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string" ? Array.from(part, (c) => c.charCodeAt(0)) : part,
    ),
  );

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "rest of the picture");
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0], "rest of the picture");
const WEBP = bytes("RIFF", [0x10, 0, 0, 0], "WEBPVP8 rest");
const SVG = bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const HTML = bytes("<!doctype html><script>alert(1)</script>");

describe("what a picture really is", () => {
  it("knows PNG, JPEG and WebP by their first bytes", () => {
    expect(pictureType(PNG)).toBe("image/png");
    expect(pictureType(JPEG)).toBe("image/jpeg");
    expect(pictureType(WEBP)).toBe("image/webp");
  });

  it("refuses SVG, web pages, text and look-alikes", () => {
    expect(pictureType(SVG)).toBeNull();
    expect(pictureType(HTML)).toBeNull();
    expect(pictureType(bytes("just some text"))).toBeNull();
    expect(pictureType(bytes("RIFF", [0, 0, 0, 0], "WAVEfmt "))).toBeNull();
    expect(pictureType(bytes([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(pictureType(new Uint8Array())).toBeNull();
  });

  it("refuses empty, over-size and odd sizes", () => {
    expect(pictureSizeProblem(0)).not.toBeNull();
    expect(pictureSizeProblem(1.5)).not.toBeNull();
    expect(pictureSizeProblem(MAX_PICTURE_BYTES + 1)).not.toBeNull();
    expect(pictureSizeProblem(MAX_PICTURE_BYTES)).toBeNull();
  });
});

describe("initials and colours", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  mo  ")).toBe("M");
    expect(initials("Jean Paul Sartre")).toBe("JS");
    expect(initials("élodie ñúñez")).toBe("ÉÑ");
    expect(initials("😀 Smile")).toBe("😀S");
    expect(initials("   ")).toBe("?");
  });

  it("keeps the letters readable on every shirt colour", () => {
    for (let i = 0; i < 200; i++) {
      const { background, ink } = avatarColors(`person-${i}`);
      expect(contrast(background, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("builds a safe address for a picture", () => {
    expect(pictureUrl("abc")).toBe("/api/pictures/abc");
    expect(pictureUrl("../x?y")).toBe("/api/pictures/..%2Fx%3Fy");
  });
});

describe.skipIf(!canUseDatabase)("profile pictures", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    stubAuthEnv();
    request.cookie = "";
    bucket.files.clear();
    bucket.deleted.length = 0;
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
    [{ id: memberId }] = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, "member@example.com"));
    await getDb().delete(invites);
  });
  afterEach(() => vi.unstubAllEnvs());

  const storageKey = async (pictureId: string) => {
    const [row] = await getDb()
      .select()
      .from(profilePictures)
      .where(eq(profilePictures.id, pictureId));
    return row.storageKey;
  };

  /** Starts an upload, "sends" these bytes to the pretend bucket, and finishes it. */
  async function uploadAs(userId: string, content: Uint8Array<ArrayBuffer> = PNG) {
    const started = await startPictureUpload(userId, content.length);
    if (!started.ok) throw new Error(started.error);
    bucket.files.set(await storageKey(started.id), content);
    return { id: started.id, finished: await finishPictureUpload(userId, started.id) };
  }

  describe("uploading", () => {
    it("signs a link for the exact size, under the person's own key", async () => {
      const started = await startPictureUpload(memberId, 500);
      expect(started).toMatchObject({ ok: true });
      if (started.ok) {
        expect(started.url).toContain(`pictures/${memberId}/${started.id}`);
        expect(started.url).toContain("size=500");
      }
      expect(await currentPictureId(memberId)).toBeNull();
    });

    it("refuses bad sizes before writing anything", async () => {
      expect(await startPictureUpload(memberId, 0)).toMatchObject({ ok: false });
      expect(await startPictureUpload(memberId, MAX_PICTURE_BYTES + 1)).toMatchObject({
        ok: false,
      });
      expect(await getDb().select().from(profilePictures)).toEqual([]);
    });

    it("makes a real picture ready, with the type found in its bytes", async () => {
      for (const [content, type] of [
        [PNG, "image/png"],
        [JPEG, "image/jpeg"],
        [WEBP, "image/webp"],
      ] as const) {
        const { id, finished } = await uploadAs(memberId, content);
        expect(finished).toEqual({ ok: true });
        expect(await currentPictureId(memberId)).toBe(id);
        const [row] = await getDb()
          .select()
          .from(profilePictures)
          .where(eq(profilePictures.id, id));
        expect(row).toMatchObject({ status: "ready", contentType: type });
      }
    });

    it("refuses and deletes an SVG, a web page or text, whatever its name", async () => {
      for (const content of [SVG, HTML, bytes("hello")]) {
        const { id, finished } = await uploadAs(memberId, content);
        expect(finished).toEqual({
          ok: false,
          error: expect.stringContaining("PNG, JPEG or WebP"),
        });
        expect(bucket.deleted).toContain(`pictures/${memberId}/${id}`);
      }
      expect(await getDb().select().from(profilePictures)).toEqual([]);
      expect(await currentPictureId(memberId)).toBeNull();
    });

    it("throws away an upload that is missing or the wrong size", async () => {
      const missing = await startPictureUpload(memberId, PNG.length);
      if (!missing.ok) throw new Error(missing.error);
      expect(await finishPictureUpload(memberId, missing.id)).toMatchObject({ ok: false });

      const short = await startPictureUpload(memberId, PNG.length + 5);
      if (!short.ok) throw new Error(short.error);
      bucket.files.set(await storageKey(short.id), PNG);
      expect(await finishPictureUpload(memberId, short.id)).toMatchObject({ ok: false });
      expect(bucket.files.size).toBe(0);
      expect(await getDb().select().from(profilePictures)).toEqual([]);
    });

    it("does not let anyone else finish someone's upload", async () => {
      const started = await startPictureUpload(memberId, PNG.length);
      if (!started.ok) throw new Error(started.error);
      bucket.files.set(await storageKey(started.id), PNG);
      expect(await finishPictureUpload(adminId, started.id)).toMatchObject({ ok: false });
      expect(await currentPictureId(memberId)).toBeNull();
      expect(await currentPictureId(adminId)).toBeNull();
    });

    it("swaps in a new picture and deletes the old one", async () => {
      const first = await uploadAs(memberId);
      const firstKey = await storageKey(first.id);
      const second = await uploadAs(memberId, JPEG);
      expect(second.finished).toEqual({ ok: true });
      expect(await currentPictureId(memberId)).toBe(second.id);
      expect(bucket.deleted).toContain(firstKey);
      expect(bucket.files.has(firstKey)).toBe(false);
      expect(await getDb().select().from(profilePictures)).toHaveLength(1);
    });

    it("keeps a failed upload from touching the current picture", async () => {
      const good = await uploadAs(memberId);
      await uploadAs(memberId, SVG);
      expect(await currentPictureId(memberId)).toBe(good.id);
    });

    it("allows only a few uploads on the way at once, and clears abandoned ones", async () => {
      for (let i = 0; i < 3; i++) {
        expect(await startPictureUpload(memberId, 100)).toMatchObject({ ok: true });
      }
      expect(await startPictureUpload(memberId, 100)).toMatchObject({
        ok: false,
        error: expect.stringContaining("Too many"),
      });

      // Upload links last five minutes; after ten, nothing can still arrive.
      await getDb().execute(
        sql`update profile_pictures set created_at = now() - interval '11 minutes'`,
      );
      expect(await startPictureUpload(memberId, 100)).toMatchObject({ ok: true });
      expect(bucket.deleted).toHaveLength(3);
      expect(await getDb().select().from(profilePictures)).toHaveLength(1);
    });
  });

  describe("removing", () => {
    it("removes the picture and its stored copy", async () => {
      const { id } = await uploadAs(memberId);
      const key = await storageKey(id);
      expect(await removePicture(memberId)).toEqual({ ok: true });
      expect(await currentPictureId(memberId)).toBeNull();
      expect(bucket.files.has(key)).toBe(false);
      expect(await removePicture(memberId)).toMatchObject({ ok: false });
    });

    it("lets only an admin remove someone else's picture", async () => {
      await uploadAs(memberId);
      const { removePictureAction } = await import("@/app/admin/people/actions");
      const form = new FormData();
      form.set("id", memberId);

      request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
      await expect(removePictureAction({}, form)).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      expect(await currentPictureId(memberId)).not.toBeNull();

      request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";
      expect(await removePictureAction({}, form)).toEqual({});
      expect(await currentPictureId(memberId)).toBeNull();
    });

    it("removes only the signed-in person's own picture from the profile page", async () => {
      await uploadAs(memberId);
      await uploadAs(adminId);
      const { removeMyPictureAction } = await import("@/app/profile/actions");
      await expect(removeMyPictureAction()).rejects.toThrow(/NEXT_REDIRECT/);

      request.cookie = (await logIn("member@example.com", PASSWORD)) ?? "";
      expect(await removeMyPictureAction()).toEqual({});
      expect(await currentPictureId(memberId)).toBeNull();
      expect(await currentPictureId(adminId)).not.toBeNull();
    });
  });

  describe("the database", () => {
    it("allows one ready picture per person, with a known type and size", async () => {
      const row = { userId: memberId, size: 10 };
      await getDb()
        .insert(profilePictures)
        .values({ ...row, id: "a", storageKey: "a", status: "ready", contentType: "image/png" });
      await expect(
        getDb()
          .insert(profilePictures)
          .values({ ...row, id: "b", storageKey: "b", status: "ready", contentType: "image/png" }),
      ).rejects.toThrow();
      await expect(
        getDb()
          .insert(profilePictures)
          .values({ ...row, id: "c", storageKey: "c", status: "ready" }),
      ).rejects.toThrow();
      await expect(
        getDb()
          .insert(profilePictures)
          .values({
            ...row,
            id: "d",
            storageKey: "d",
            contentType: "image/svg+xml" as "image/png",
          }),
      ).rejects.toThrow();
      await expect(
        getDb()
          .insert(profilePictures)
          .values({ ...row, id: "e", storageKey: "e", size: MAX_PICTURE_BYTES + 1 }),
      ).rejects.toThrow();
    });
  });

  describe("the picture address", () => {
    const get = async (id: string) => {
      const { GET } = await import("@/app/api/pictures/[id]/route");
      return GET(new Request(`http://localhost:3000/api/pictures/${id}`), {
        params: Promise.resolve({ id }),
      });
    };

    it("sends logged-out visitors to log in", async () => {
      const { id } = await uploadAs(memberId);
      await expect(get(id)).rejects.toMatchObject({
        digest: expect.stringContaining(";/login;"),
      });
    });

    it("shows the picture to anyone logged in, checked in or not, with safe headers", async () => {
      const { id } = await uploadAs(memberId, JPEG);
      request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";
      const response = await get(id);
      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(JPEG);
      expect(Object.fromEntries(response.headers)).toMatchObject({
        "content-type": "image/jpeg",
        "content-length": String(JPEG.length),
        "content-disposition": 'inline; filename="picture.jpg"',
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "cache-control": "private, max-age=31536000, immutable",
      });
    });

    it("answers 404 for a removed, replaced, pending or made-up picture", async () => {
      request.cookie = (await logIn("ada@example.com", PASSWORD)) ?? "";
      const first = await uploadAs(memberId);
      await uploadAs(memberId);
      expect((await get(first.id)).status).toBe(404);

      const pending = await startPictureUpload(memberId, 100);
      if (!pending.ok) throw new Error(pending.error);
      expect((await get(pending.id)).status).toBe(404);

      await removePicture(memberId);
      const gone = await get("no-such-picture");
      expect(gone.status).toBe(404);
      expect(gone.headers.get("cache-control")).toBe("no-store");
    });
  });

  it("tells presence each person's picture", async () => {
    await checkIn(memberId);
    await checkIn(adminId);
    const { id } = await uploadAs(memberId);
    const people = await listPresence();
    expect(people.map(({ name, pictureId }) => ({ name, pictureId }))).toEqual([
      { name: "Ada", pictureId: null },
      { name: "Mo", pictureId: id },
    ]);
  });
});
