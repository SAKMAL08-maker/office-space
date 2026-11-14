import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  attendanceSessions,
  presence,
  profilePictures,
  projects,
  users,
  workSessions,
} from "@/db/schema";
import type { Cell } from "@/world/layout";
import type { LivePerson } from "@/world/people";
import { loadFloor } from "./floor";
import type { CurrentUser } from "./session";

/** A person whose tab has said nothing for this long shows as away. They stay checked in. */
export const AWAY_AFTER_SECONDS = 120;

const SPOT_LIMIT = 1000;
const PEOPLE_LIMIT = 200;

export type PresencePerson = LivePerson;

const isWholeCell = (value: unknown): value is number =>
  Number.isInteger(value) && Math.abs(value as number) <= SPOT_LIMIT;

/**
 * Reads the body a tab sends: `{ spot: { x, z } }`, or `{ spot: null }` from a page with no 3D
 * office, which only says "still here". Anything else is refused, so a made-up body cannot
 * reach the database. Returns undefined for a refused body.
 */
export function parseSpot(body: unknown): Cell | null | undefined {
  if (typeof body !== "object" || body === null || !("spot" in body)) return undefined;
  const { spot } = body;
  if (spot === null) return null;
  if (typeof spot !== "object" || !("x" in spot) || !("z" in spot)) return undefined;
  const { x, z } = spot;
  return isWholeCell(x) && isWholeCell(z) ? { x, z } : undefined;
}

/** Says the person is still here, and where they stand, if their tab sent a spot. */
export async function recordPresence(userId: string, spot: Cell | null): Promise<void> {
  const seen = { lastSeenAt: sql`now()` };
  await getDb()
    .insert(presence)
    .values({ userId, x: spot?.x ?? null, z: spot?.z ?? null })
    .onConflictDoUpdate({
      target: presence.userId,
      set: spot ? { ...seen, x: spot.x, z: spot.z } : seen,
    });
}

/**
 * Everyone checked in, with where they stand, whether they are away, and what they are working on.
 * A spot from before their latest check-in is ignored, so yesterday's place is never shown.
 * Away is worked out with the database clock, so a wrong clock on someone's computer cannot change it.
 */
export async function listPresence(): Promise<PresencePerson[]> {
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      x: presence.x,
      z: presence.z,
      away: sql<boolean>`(${presence.lastSeenAt} is null or ${presence.lastSeenAt} < now() - make_interval(secs => ${AWAY_AFTER_SECONDS}))`,
      projectId: workSessions.projectId,
      title: projects.title,
      since: workSessions.startedAt,
      pictureId: profilePictures.id,
    })
    .from(attendanceSessions)
    .innerJoin(users, eq(users.id, attendanceSessions.userId))
    .leftJoin(
      presence,
      and(
        eq(presence.userId, attendanceSessions.userId),
        gte(presence.lastSeenAt, attendanceSessions.checkedInAt),
      ),
    )
    .leftJoin(
      workSessions,
      and(eq(workSessions.userId, attendanceSessions.userId), isNull(workSessions.endedAt)),
    )
    .leftJoin(projects, eq(projects.id, workSessions.projectId))
    .leftJoin(
      profilePictures,
      and(
        eq(profilePictures.userId, attendanceSessions.userId),
        eq(profilePictures.status, "ready"),
      ),
    )
    .where(isNull(attendanceSessions.checkedOutAt))
    .orderBy(asc(users.name), asc(users.id))
    .limit(PEOPLE_LIMIT);

  return rows.map(({ id, name, x, z, away, projectId, title, since, pictureId }) => ({
    id,
    name,
    pictureId,
    spot: x !== null && z !== null ? { x, z } : null,
    away,
    workingOn: projectId && title && since ? { projectId, title, since } : null,
  }));
}

export type PresenceReply = { people: PresencePerson[]; floorKey: string };

/**
 * One report from a tab: saves it, then answers with everyone's presence and the floor's key,
 * so the page knows when to fetch the floor again. The caller has already checked the gate.
 */
export async function reportPresence(
  viewer: CurrentUser,
  spot: Cell | null,
): Promise<PresenceReply> {
  await recordPresence(viewer.id, spot);
  const [people, floor] = await Promise.all([listPresence(), loadFloor(viewer.id)]);
  return { people, floorKey: floor.key };
}
