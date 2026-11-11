import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// users, sessions, accounts and verifications follow the shape Better Auth expects.

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [check("users_role_check", sql`${table.role} in ('admin', 'member')`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("accounts_provider_account_unique").on(table.providerId, table.accountId),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

// Links are stored only as a hash, so a database leak cannot be used to redeem one.

export const invites = pgTable(
  "invites",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    check("invites_role_check", sql`${table.role} in ('admin', 'member')`),
    index("invites_email_idx").on(table.email),
  ],
);

export const passwordResetLinks = pgTable(
  "password_reset_links",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index("password_reset_links_user_id_idx").on(table.userId)],
);

// A record stays open until its owner checks out. There is no automatic close.

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
  },
  (table) => [
    // The database itself refuses a second open record, even if two check-ins arrive at once.
    uniqueIndex("attendance_sessions_one_open_per_user")
      .on(table.userId)
      .where(sql`${table.checkedOutAt} is null`),
    index("attendance_sessions_user_checked_in_idx").on(table.userId, table.checkedInAt),
    check(
      "attendance_sessions_order_check",
      sql`${table.checkedOutAt} is null or ${table.checkedOutAt} >= ${table.checkedInAt}`,
    ),
  ],
);

// A task is a project offered to someone. It only becomes a project if they accept it.

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: ["pending", "accepted", "rejected", "cancelled"] })
      .notNull()
      .default("pending"),
    rejectReason: text("reject_reason"),
    createdAt: createdAt(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "tasks_status_check",
      sql`${table.status} in ('pending', 'accepted', 'rejected', 'cancelled')`,
    ),
    check("tasks_not_to_self_check", sql`${table.senderId} <> ${table.receiverId}`),
    index("tasks_receiver_status_idx").on(table.receiverId, table.status),
    index("tasks_sender_created_idx").on(table.senderId, table.createdAt),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    // Set when the project came from an accepted task. The task keeps the original wording.
    sourceTaskId: text("source_task_id")
      .unique()
      .references(() => tasks.id),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("projects_owner_id_idx").on(table.ownerId)],
);

// Only active projects have a cubicle. Finishing a project deletes this row and keeps the project.

export const cubicles = pgTable(
  "cubicles",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    projectId: text("project_id")
      .notNull()
      .unique()
      .references(() => projects.id),
    seat: integer("seat").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("cubicles_owner_seat_unique").on(table.ownerId, table.seat),
    check("cubicles_seat_check", sql`${table.seat} >= 1`),
  ],
);

// Time spent working at a project's cubicle. A period ends when its owner stops, starts
// somewhere else, checks out, or finishes the project.

export const workSessions = pgTable(
  "work_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    // The database itself refuses a second open period, even if two starts arrive at once.
    uniqueIndex("work_sessions_one_open_per_user")
      .on(table.userId)
      .where(sql`${table.endedAt} is null`),
    index("work_sessions_user_started_idx").on(table.userId, table.startedAt),
    index("work_sessions_project_idx").on(table.projectId),
    check(
      "work_sessions_order_check",
      sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startedAt}`,
    ),
  ],
);
