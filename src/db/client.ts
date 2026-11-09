import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { getPool } from "./pool";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let db: Db | undefined;

/** Typed queries on top of the shared connection pool. */
export function getDb(): Db {
  db ??= drizzle(getPool(), { schema });
  return db;
}
