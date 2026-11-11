import type { Cell, OfficeInfo, WorldLayout } from "./layout";

/** Someone checked in, as presence reports them. */
export type LivePerson = {
  id: string;
  name: string;
  /** Where they last stood, or null if their tab has not sent a spot since they checked in. */
  spot: Cell | null;
  away: boolean;
  workingOn: { projectId: string; title: string; since: Date } | null;
};

/** Someone else, placed in this viewer's layout. */
export type PlacedPerson = {
  id: string;
  name: string;
  away: boolean;
  /** The cell their character walks to. */
  target: Cell;
  /** The chair of the cubicle where they are working, if they are, where they sit down. */
  seat: Cell | null;
};

/**
 * The floor with other people's work replaced by the latest presence, so a glow appears or goes out
 * within seconds. The viewer's own office keeps the floor's data: their own starts and stops refresh
 * the floor at once, and presence may still be a few seconds behind them.
 */
export function withLiveWork(
  offices: OfficeInfo[],
  people: LivePerson[] | null,
  viewerId: string,
): OfficeInfo[] {
  if (!people) return offices;
  const working = new Map(
    people.flatMap(({ workingOn }) => (workingOn ? [[workingOn.projectId, workingOn.since]] : [])),
  );
  return offices.map((office) =>
    office.ownerId === viewerId
      ? office
      : {
          ...office,
          cubicles: office.cubicles.map((cubicle) => ({
            ...cubicle,
            workingSince: working.get(cubicle.projectId) ?? null,
          })),
        },
  );
}

/**
 * Where to draw everyone but the viewer. A person goes to the spot their tab sent; without one,
 * to the chair they work in, else just inside their office door, else the lobby.
 */
export function placePeople(
  layout: WorldLayout,
  offices: OfficeInfo[],
  people: LivePerson[],
  viewerId: string,
): PlacedPerson[] {
  return people
    .filter((person) => person.id !== viewerId)
    .map(({ id, name, away, spot, workingOn }) => {
      const room = layout.offices.find((office) => office.ownerId === id);
      const seatNumber = offices
        .find((office) => office.ownerId === id)
        ?.cubicles.find((cubicle) => cubicle.projectId === workingOn?.projectId)?.seat;
      const seat = room?.cubicles.find((cubicle) => cubicle.seat === seatNumber)?.spot ?? null;
      return { id, name, away, seat, target: spot ?? seat ?? room?.doorStep ?? layout.start };
    });
}
