import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  // Timestamped names keep every migration a new, dated file.
  migrations: { prefix: "timestamp" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
