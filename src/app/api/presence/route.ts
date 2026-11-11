import { parseSpot, reportPresence } from "@/server/presence";
import { requireCheckedIn } from "@/server/session";

/**
 * An open, visible tab calls this every few seconds: "still here, standing at this cell".
 * The reply is everyone checked in and the floor's key. The gate comes first, so someone
 * not checked in is sent back to the lobby and learns nothing about who is in.
 */
export async function POST(request: Request) {
  const viewer = await requireCheckedIn();
  const spot = parseSpot(await request.json().catch(() => undefined));
  if (spot === undefined) {
    return Response.json({ error: "Send { spot: { x, z } } or { spot: null }." }, { status: 400 });
  }
  const reply = await reportPresence(viewer, spot);
  return Response.json(reply, { headers: { "Cache-Control": "no-store" } });
}
