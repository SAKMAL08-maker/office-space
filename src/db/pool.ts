import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

let pool: Pool | undefined;

/** One shared connection pool per server instance, created on first use. */
export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  pool = new Pool({ connectionString, max: 5 });
  // Without a listener, a dropped idle connection would crash the server process.
  pool.on("error", (error) => console.error("Idle database connection failed", error.message));
  // Lets Vercel close idle connections cleanly before it suspends a function.
  attachDatabasePool(pool);
  return pool;
}
