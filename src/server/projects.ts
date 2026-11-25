import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { cubicles, projects, tasks, users, workSessions } from "@/db/schema";
import { lockUser } from "./users";
import { type Result, workDetailsProblem } from "./validation";
import { endProjectWork } from "./work";

/** Active projects one person may have at once. Each one is a cubicle on the floor. */
export const MAX_ACTIVE_PROJECTS = 30;
const PROJECT_LIST_LIMIT = 200;
const NOT_ACTIVE = "This project is not active any more.";
export const TOO_MANY_PROJECTS = `You can have at most ${MAX_ACTIVE_PROJECTS} active projects. Finish one first.`;

type ProjectInput = { title: string; description: string };

/**
 * The owner's lowest free seat, or null when they already have the most active projects.
 * The lock stops two projects taking the same seat, or both slipping past the limit, and is
 * held until the caller's transaction ends.
 */
async function freeSeat(tx: Tx, ownerId: string): Promise<number | null> {
  await lockUser(tx, ownerId);
  const taken = await tx
    .select({ seat: cubicles.seat })
    .from(cubicles)
    .where(eq(cubicles.ownerId, ownerId))
    .orderBy(asc(cubicles.seat));
  if (taken.length >= MAX_ACTIVE_PROJECTS) return null;

  let seat = 1;
  for (const cubicle of taken) {
    if (cubicle.seat !== seat) break;
    seat += 1;
  }
  return seat;
}

/**
 * Writes a project and its cubicle inside the caller's transaction, so one cannot exist alone.
 * False, with nothing written, when the owner already has the most active projects.
 */
export async function insertProjectWithCubicle(
  tx: Tx,
  input: ProjectInput & { ownerId: string; sourceTaskId?: string },
): Promise<boolean> {
  const seat = await freeSeat(tx, input.ownerId);
  if (seat === null) return false;
  const id = randomUUID();
  await tx.insert(projects).values({ id, ...input });
  await tx
    .insert(cubicles)
    .values({ id: randomUUID(), ownerId: input.ownerId, projectId: id, seat });
  return true;
}

export async function createProject(ownerId: string, input: ProjectInput): Promise<Result> {
  const title = input.title.trim();
  const description = input.description.trim();
  const problem = workDetailsProblem(title, description);
  if (problem) return { ok: false, error: problem };

  const added = await getDb().transaction((tx) =>
    insertProjectWithCubicle(tx, { ownerId, title, description }),
  );
  return added ? { ok: true } : { ok: false, error: TOO_MANY_PROJECTS };
}

const isOwnedBy = (ownerId: string, projectId: string) =>
  and(eq(projects.id, projectId), eq(projects.ownerId, ownerId));

export async function updateProject(
  ownerId: string,
  projectId: string,
  input: ProjectInput,
): Promise<Result> {
  const title = input.title.trim();
  const description = input.description.trim();
  const problem = workDetailsProblem(title, description);
  if (problem) return { ok: false, error: problem };

  const updated = await getDb()
    .update(projects)
    .set({ title, description })
    .where(and(isOwnedBy(ownerId, projectId), isNull(projects.finishedAt)))
    .returning({ id: projects.id });
  if (updated.length === 0) return { ok: false, error: NOT_ACTIVE };
  return { ok: true };
}

export function finishProject(ownerId: string, projectId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    const finished = await tx
      .update(projects)
      .set({ finishedAt: sql`now()` })
      .where(and(isOwnedBy(ownerId, projectId), isNull(projects.finishedAt)))
      .returning({ id: projects.id });
    if (finished.length === 0) return { ok: false, error: NOT_ACTIVE };

    // The cubicle goes first: its lock makes a start of work that is under way finish before this
    // ends the period, so no period is left open on a finished project.
    await tx.delete(cubicles).where(eq(cubicles.projectId, projectId));
    await endProjectWork(tx, projectId);
    return { ok: true };
  });
}

export function reopenProject(ownerId: string, projectId: string): Promise<Result> {
  return getDb().transaction(async (tx): Promise<Result> => {
    // The seat comes first, so a refused reopen changes nothing.
    const seat = await freeSeat(tx, ownerId);
    if (seat === null) return { ok: false, error: TOO_MANY_PROJECTS };
    const reopened = await tx
      .update(projects)
      .set({ finishedAt: null })
      .where(and(isOwnedBy(ownerId, projectId), isNotNull(projects.finishedAt)))
      .returning({ id: projects.id });
    if (reopened.length === 0) return { ok: false, error: "This project is already active." };

    await tx.insert(cubicles).values({ id: randomUUID(), ownerId, projectId, seat });
    return { ok: true };
  });
}

/** Active projects first, so the limit can only ever hide old finished ones. */
export function listProjects(ownerId: string) {
  return getDb()
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      finishedAt: projects.finishedAt,
      seat: cubicles.seat,
      sentBy: users.name,
      workingSince: workSessions.startedAt,
    })
    .from(projects)
    .leftJoin(cubicles, eq(cubicles.projectId, projects.id))
    .leftJoin(
      workSessions,
      and(eq(workSessions.projectId, projects.id), isNull(workSessions.endedAt)),
    )
    .leftJoin(tasks, eq(tasks.id, projects.sourceTaskId))
    .leftJoin(users, eq(users.id, tasks.senderId))
    .where(eq(projects.ownerId, ownerId))
    .orderBy(sql`${projects.finishedAt} is not null`, desc(projects.createdAt))
    .limit(PROJECT_LIST_LIMIT);
}
