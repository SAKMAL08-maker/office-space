import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { cubicles, users } from "@/db/schema";
import { requireCheckedIn } from "./session";

const OFFICE_LIMIT = 200;

export type FloorOffice = { ownerId: string; name: string; seats: number[] };

/**
 * Everyone's office and the seats of its cubicles, for the 3D floor.
 * It checks the gate itself, so the floor never reaches anyone who is not checked in,
 * whichever page asks for it.
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
    .select({ ownerId: cubicles.ownerId, seat: cubicles.seat })
    .from(cubicles)
    .orderBy(asc(cubicles.seat));

  const seatsByOwner = new Map<string, number[]>();
  for (const { ownerId, seat } of taken) {
    const seats = seatsByOwner.get(ownerId) ?? [];
    seats.push(seat);
    seatsByOwner.set(ownerId, seats);
  }
  return {
    viewerId: viewer.id,
    offices: people.map(({ id, name }) => ({
      ownerId: id,
      name,
      seats: seatsByOwner.get(id) ?? [],
    })),
  };
}
