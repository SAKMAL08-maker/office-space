import { checkedPicture, findPicture } from "@/server/pictures";
import { requireUser } from "@/server/session";
import { openStored } from "@/server/storage";

const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/**
 * Sends a profile picture to anyone logged in. The bytes come through the server rather than a
 * bucket link, only while their first bytes still match the type the server found, and with
 * headers that stop a browser from ever treating it as a page. A new picture gets a new id, so
 * this one never changes and the browser can keep it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const picture = await findPicture(id);
  const stored = picture && (await openStored(picture.storageKey));
  const body = stored && (await checkedPicture(stored, picture.contentType));
  if (!picture || !body) {
    return new Response("That picture is not there any more.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(body, {
    headers: {
      "Content-Type": picture.contentType,
      "Content-Length": String(picture.size),
      "Content-Disposition": `inline; filename="picture.${EXTENSIONS[picture.contentType]}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
