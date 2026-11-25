import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { TRIES_PER_WINDOW, TRY_WINDOW_SECONDS } from "./rate-limit";
import { ACCOUNT_DISABLED, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./validation";

export const SESSION_LIFETIME_SECONDS = 24 * 60 * 60;

/** The address of this deployment. Links are built from it, never from a request's Host header. */
export function appBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function trustedOrigins(): string[] {
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];
  return hosts.filter((host) => !!host).map((host) => `https://${host}`);
}

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");

  return betterAuth({
    secret,
    baseURL: appBaseUrl(),
    trustedOrigins: trustedOrigins(),
    telemetry: { enabled: false },
    database: drizzleAdapter(getDb(), { provider: "pg", schema, usePlural: true }),
    emailAndPassword: {
      enabled: true,
      // Accounts are only made by the setup page and invite links, which write them directly.
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    },
    // This app has no email service and no profile page yet, so these routes stay closed.
    disabledPaths: [
      "/sign-up/email",
      "/update-user",
      "/change-email",
      "/delete-user",
      "/request-password-reset",
      "/reset-password",
      "/send-verification-email",
      "/verify-email",
    ],
    rateLimit: {
      // On everywhere, not only in production, so tests and local runs behave like the live site.
      enabled: true,
      // Kept in the database: Vercel runs several copies of the app, and memory is not shared.
      storage: "database",
      customRules: {
        "/sign-in/*": { window: TRY_WINDOW_SECONDS, max: TRIES_PER_WINDOW },
      },
    },
    session: {
      // A login ends after a day without use, so a lost laptop is logged out by the next day.
      expiresIn: SESSION_LIFETIME_SECONDS,
      // Each use moves that day forward, but the database is written at most once an hour.
      updateAge: 60 * 60,
    },
    user: {
      additionalFields: {
        // input: false means a browser can never set these fields.
        role: { type: "string", required: false, defaultValue: "member", input: false },
        disabledAt: { type: "date", required: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Runs only after the password was right, so it tells nothing to someone guessing.
          before: async (session) => {
            const [user] = await getDb()
              .select({ disabledAt: schema.users.disabledAt })
              .from(schema.users)
              .where(eq(schema.users.id, session.userId));
            if (!user || user.disabledAt) {
              throw new APIError("FORBIDDEN", {
                code: ACCOUNT_DISABLED,
                message: "This account is disabled.",
              });
            }
          },
        },
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so a build does not need the secret. */
export function getAuth() {
  auth ??= createAuth();
  return auth;
}

export async function hashPassword(password: string): Promise<string> {
  const context = await getAuth().$context;
  return context.password.hash(password);
}
