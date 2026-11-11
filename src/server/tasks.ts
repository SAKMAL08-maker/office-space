import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { projects, tasks, users } from "@/db/schema";
import { insertProjectWithCubicle } from "./projects";
import { lockUser } from "./users";
import { MAX_REJECT_REASON_LENGTH, type Result, workDetailsProblem } from "./validation";

export const MAX_WAITING_TASKS = 10;

const TASK_LIST_LIMIT = 200;
const NOT_WAITING = "This task is no longer waiting for an answer.";

const isWaiting = eq(tasks.status, "pending");

export async function sendTask(
  senderId: string,
  input: { receiverId: string; title: string; description: string },
): Promise<Result> {
  const title = input.title.trim();
  const description = input.description.trim();
  const { receiverId } = input;
  const problem = workDetailsProblem(title, description);
  if (problem) return { ok: false, error: problem };
  if (!receiverId) return { ok: false, error: "Choose who to send this to." };
  if (receiverId === senderId) {
    return { ok: false, error: "Create a project instead of sending a task to yourself." };
  }

  return getDb().transaction(async (tx): Promise<Result> => {
    // Without this lock, two sends at once could both see 9 waiting and make 11.
    await lockUser(tx, senderId);
    const [receiver] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, receiverId));
    if (!receiver) return { ok: false, error: "That person could not be found." };

    const [{ waiting }] = await tx
      .select({ waiting: count() })
      .from(tasks)
      .where(and(eq(tasks.senderId, senderId), eq(tasks.receiverId, receiverId), isWaiting));
    if (waiting >= MAX_WAITING_TASKS) {
      return {
        ok: false,
        error: `This person already has ${MAX_WAITING_TASKS} tasks from you waiting for an answer.`,
      };
    }

    await tx.insert(tasks).values({ id: randomUUID(), senderId, receiverId, title, description });
    return { ok: true };
  });
}

/**
 * The status change and the new project are saved together. Only one request can move a task
 * out of waiting, so a double click or a second tab cannot create a second project.
 */
export function acceptTask(receiverId: string, taskId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    const [task] = await tx
      .update(tasks)
      .set({ status: "accepted", decidedAt: sql`now()` })
      .where(and(eq(tasks.id, taskId), eq(tasks.receiverId, receiverId), isWaiting))
      .returning({ title: tasks.title, description: tasks.description });
    if (!task) return { ok: false, error: NOT_WAITING };

    await insertProjectWithCubicle(tx, { ownerId: receiverId, sourceTaskId: taskId, ...task });
    return { ok: true };
  });
}

export async function rejectTask(
  receiverId: string,
  taskId: string,
  reason: string,
): Promise<Result> {
  const rejectReason = reason.trim();
  if (rejectReason.length > MAX_REJECT_REASON_LENGTH) {
    return {
      ok: false,
      error: `Use at most ${MAX_REJECT_REASON_LENGTH} characters for the reason.`,
    };
  }

  const rejected = await getDb()
    .update(tasks)
    .set({ status: "rejected", rejectReason: rejectReason || null, decidedAt: sql`now()` })
    .where(and(eq(tasks.id, taskId), eq(tasks.receiverId, receiverId), isWaiting))
    .returning({ id: tasks.id });
  if (rejected.length === 0) return { ok: false, error: NOT_WAITING };
  return { ok: true };
}

export async function cancelTask(senderId: string, taskId: string): Promise<Result> {
  const cancelled = await getDb()
    .update(tasks)
    .set({ status: "cancelled", decidedAt: sql`now()` })
    .where(and(eq(tasks.id, taskId), eq(tasks.senderId, senderId), isWaiting))
    .returning({ id: tasks.id });
  if (cancelled.length === 0) return { ok: false, error: NOT_WAITING };
  return { ok: true };
}

export async function countInbox(receiverId: string): Promise<number> {
  const [{ waiting }] = await getDb()
    .select({ waiting: count() })
    .from(tasks)
    .where(and(eq(tasks.receiverId, receiverId), isWaiting));
  return waiting;
}

export function listInbox(receiverId: string) {
  return getDb()
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      createdAt: tasks.createdAt,
      sentBy: users.name,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.senderId))
    .where(and(eq(tasks.receiverId, receiverId), isWaiting))
    .orderBy(asc(tasks.createdAt))
    .limit(TASK_LIST_LIMIT);
}

export function listSent(senderId: string) {
  return getDb()
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      rejectReason: tasks.rejectReason,
      createdAt: tasks.createdAt,
      sentTo: users.name,
      // Set once the task is accepted: the sender can then share files on the project.
      projectId: projects.id,
      projectFinishedAt: projects.finishedAt,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.receiverId))
    .leftJoin(projects, eq(projects.sourceTaskId, tasks.id))
    .where(eq(tasks.senderId, senderId))
    .orderBy(desc(tasks.createdAt))
    .limit(TASK_LIST_LIMIT);
}
