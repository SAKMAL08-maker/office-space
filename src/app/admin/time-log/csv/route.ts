import { listTimeLogForExport } from "@/server/attendance";
import { requireAdmin } from "@/server/session";
import { buildTimeLogCsv, exportFileName, exportTimeZone } from "@/server/time-export";

/**
 * Sends everyone's time log as a CSV, built from the database each time it is asked for. Admins
 * only; anyone else gets the same "not found" as the admin pages. The browser names its own time
 * zone in `?tz=`, since only it knows where the admin is.
 */
export async function GET(request: Request) {
  await requireAdmin();
  const timeZone = exportTimeZone(new URL(request.url).searchParams.get("tz"));
  const csv = buildTimeLogCsv(await listTimeLogForExport(), timeZone);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(new Date(), timeZone)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
