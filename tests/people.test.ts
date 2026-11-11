import { describe, expect, it } from "vitest";
import { type CubicleInfo, layoutWorld, type OfficeInfo, toOfficeInput } from "@/world/layout";
import { type LivePerson, placePeople, withLiveWork } from "@/world/people";

const cubicle = (
  seat: number,
  projectId: string,
  workingSince: Date | null = null,
): CubicleInfo => ({
  seat,
  projectId,
  title: projectId,
  description: "",
  sentBy: null,
  workingSince,
});

const offices: OfficeInfo[] = [
  { ownerId: "ada", name: "Ada", cubicles: [cubicle(1, "a1"), cubicle(2, "a2")] },
  { ownerId: "bo", name: "Bo", cubicles: [cubicle(1, "b1")] },
  { ownerId: "cy", name: "Cy", cubicles: [] },
];

const person = (id: string, extra: Partial<LivePerson> = {}): LivePerson => ({
  id,
  name: id,
  spot: null,
  away: false,
  workingOn: null,
  ...extra,
});

const since = new Date("2026-11-11T09:00:00Z");

describe("withLiveWork", () => {
  it("takes other people's work from presence, and keeps the viewer's own from the floor", () => {
    const floor = offices.map((office) =>
      office.ownerId === "ada"
        ? { ...office, cubicles: [cubicle(1, "a1", since), cubicle(2, "a2")] }
        : { ...office, cubicles: office.cubicles.map((c) => ({ ...c, workingSince: since })) },
    );
    // Presence is a few seconds behind Ada's own start, and says Bo has stopped.
    const live = withLiveWork(floor, [person("ada"), person("bo")], "ada");
    expect(live[0].cubicles.map((c) => c.workingSince)).toEqual([since, null]);
    expect(live[1].cubicles[0].workingSince).toBeNull();

    const started = withLiveWork(
      offices,
      [person("bo", { workingOn: { projectId: "b1", title: "b1", since } })],
      "ada",
    );
    expect(started[1].cubicles[0].workingSince).toEqual(since);
  });

  it("leaves the floor alone until presence has answered", () => {
    expect(withLiveWork(offices, null, "ada")).toBe(offices);
  });
});

describe("placePeople", () => {
  const layout = layoutWorld(offices.map(toOfficeInput));
  const room = (id: string) => layout.offices.find((office) => office.ownerId === id)!;

  it("leaves out the viewer, who is drawn by their own character", () => {
    expect(
      placePeople(layout, offices, [person("ada"), person("bo")], "ada").map((p) => p.id),
    ).toEqual(["bo"]);
  });

  it("sends people to their spot, else their working chair, else their door, else the lobby", () => {
    const working = { projectId: "a2", title: "a2", since };
    const placed = placePeople(
      layout,
      offices,
      [
        person("ada", { spot: { x: 3, z: 4 }, workingOn: working }),
        person("bo", { away: true }),
        person("cy"),
        person("newcomer"),
      ],
      "viewer",
    );
    const chair = room("ada").cubicles.find((c) => c.seat === 2)!.spot;
    expect(placed).toEqual([
      { id: "ada", name: "ada", away: false, target: { x: 3, z: 4 }, seat: chair },
      { id: "bo", name: "bo", away: true, target: room("bo").doorStep, seat: null },
      { id: "cy", name: "cy", away: false, target: room("cy").doorStep, seat: null },
      { id: "newcomer", name: "newcomer", away: false, target: layout.start, seat: null },
    ]);

    const noSpot = placePeople(layout, offices, [person("ada", { workingOn: working })], "viewer");
    expect(noSpot[0].target).toEqual(chair);
  });
});
