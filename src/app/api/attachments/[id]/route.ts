import { downloadLink } from "@/server/attachments";
import { requireCheckedIn } from "@/server/session";

/**
 * Pages link here rather than to the bucket, because bucket links expire after a few minutes.
 * Each click checks the gate and access again, then sends the browser on to a fresh link.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireCheckedIn();
  const { id } = await params;
  const link = await downloadLink(viewer.id, id);
  if (!link) return new Response("That file is not there any more.", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: link, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
