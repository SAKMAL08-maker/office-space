import { getPool } from "@/db/pool";

/** Reports whether the app can reach its database. Deliberately reveals no error details. */
export async function GET() {
  try {
    await getPool().query("select 1");
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Health check failed", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
