import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { cubicles, projects, tasks, users, workSessions } from "@/db/schema";
import type { CubicleInfo, OfficeInfo } from "@/world/layout";
import { requireCheckedIn } from "./session";

const OFFICE_LIMIT = 200;

export type FloorOffice = OfficeInfo;

const senders = alias(users, "senders");

/**
 * Everyone's office and its cubicles, with each project's details and who is working there,
 * for the 3D floor. It checks the gate itself, so the floor never reaches anyone who is not
 * checked in, whichever page asks for it.
 */
export async function getFloor(): Promise<{ viewerId: string; offices: FloorOffice[] }> {
  const viewer = await requireCheckedIn();
  const db = getDb();
  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(asc(users.name), asc(users.id))
    .limit(OFFICE_LIMIT);
  const taken = await db
    .select({
      ownerId: cubicles.ownerId,
      seat: cubicles.seat,
      projectId: projects.id,
      title: projects.title,
      description: projects.description,
      sentBy: senders.name,
      workingSince: workSessions.startedAt,
    })
    .from(cubicles)
    .innerJoin(projects, eq(projects.id, cubicles.projectId))
    .leftJoin(tasks, eq(tasks.id, projects.sourceTaskId))
    .leftJoin(senders, eq(senders.id, tasks.senderId))
    .leftJoin(
      workSessions,
      and(eq(workSessions.projectId, projects.id), isNull(workSessions.endedAt)),
    )
    .orderBy(asc(cubicles.seat));

  const cubiclesByOwner = new Map<string, CubicleInfo[]>();
  for (const { ownerId, ...cubicle } of taken) {
    const list = cubiclesByOwner.get(ownerId) ?? [];
    list.push(cubicle);
    cubiclesByOwner.set(ownerId, list);
  }
  return {
    viewerId: viewer.id,
    offices: people.map(({ id, name }) => ({
      ownerId: id,
      name,
      cubicles: cubiclesByOwner.get(id) ?? [],
    })),
  };
}
