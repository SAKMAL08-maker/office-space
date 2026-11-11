import { createHash } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { cubicles, projects, tasks, users, workSessions } from "@/db/schema";
import type { CubicleInfo, OfficeInfo } from "@/world/layout";
import { requireCheckedIn } from "./session";

const OFFICE_LIMIT = 200;

export type FloorOffice = OfficeInfo;

export type Floor = {
  viewerId: string;
  offices: FloorOffice[];
  /** Changes whenever an office, a cubicle or a project's wording changes, but not who is working. */
  key: string;
};

const senders = alias(users, "senders");

/**
 * A short fingerprint of the floor. Who is working is left out, because presence sends that
 * every few seconds anyway. Any other change means the page should fetch the floor again.
 */
export function floorKey(offices: FloorOffice[]): string {
  const shape = offices.map(({ cubicles, ...office }) => ({
    ...office,
    cubicles: cubicles.map((cubicle) => ({ ...cubicle, workingSince: null })),
  }));
  return createHash("sha256").update(JSON.stringify(shape)).digest("base64url").slice(0, 22);
}

/** The floor for someone already known to be checked in. Use getFloor everywhere else. */
export async function loadFloor(viewerId: string): Promise<Floor> {
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
  const offices = people.map(({ id, name }) => ({
    ownerId: id,
    name,
    cubicles: cubiclesByOwner.get(id) ?? [],
  }));
  return { viewerId, offices, key: floorKey(offices) };
}

/**
 * Everyone's office and its cubicles, with each project's details and who is working there,
 * for the 3D floor. It checks the gate itself, so the floor never reaches anyone who is not
 * checked in, whichever page asks for it.
 */
export async function getFloor(): Promise<Floor> {
  const viewer = await requireCheckedIn();
  return loadFloor(viewer.id);
}
