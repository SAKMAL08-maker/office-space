import { describe, expect, it } from "vitest";
import {
  type Cell,
  columnsFor,
  contains,
  cubicleRowsFor,
  layoutWorld,
  type OfficeInput,
  type Rect,
} from "@/world/layout";
import { buildGrid, findPath, isOpen, nearestOpenCell } from "@/world/path";
import { createWalker, stepWalker, WALK_SPEED } from "@/world/walk";

const office = (name: string, seats: number[] = []): OfficeInput => ({
  ownerId: `id-${name}`,
  name,
  seats,
});

const inside = (outer: Rect, inner: Rect) =>
  contains(outer, inner) && contains(outer, { x: inner.x + inner.w - 1, z: inner.z + inner.d - 1 });

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

describe("layoutWorld", () => {
  it("shows only the lobby, with the gate shut, before check-in", () => {
    const world = layoutWorld(null);
    expect(world.floor).toBeNull();
    expect(world.offices).toEqual([]);
    expect(world.gateOpen).toBe(false);

    const grid = buildGrid(world);
    expect(isOpen(grid, world.start)).toBe(true);
    expect(isOpen(grid, { x: 0, z: 0 })).toBe(false);
    expect(isOpen(grid, { x: 0, z: -2 })).toBe(false);
  });

  it("keeps the lobby and machines in the same place when the floor appears", () => {
    const before = layoutWorld(null);
    const after = layoutWorld([office("Ada"), office("Mo")]);
    expect(after.lobby).toEqual(before.lobby);
    expect(after.machines).toEqual(before.machines);
    expect(after.start).toEqual(before.start);
    expect(after.gateOpen).toBe(true);
  });

  it("chooses up to four columns of offices", () => {
    expect([0, 1, 2, 4, 5, 9, 10, 30].map(columnsFor)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("gives every office its own room, without overlaps", () => {
    const world = layoutWorld(["A", "B", "C", "D", "E", "F", "G"].map((name) => office(name)));
    expect(world.offices.map((room) => room.name)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    for (const [i, a] of world.offices.entries()) {
      expect(inside(world.floor!, a.outer)).toBe(true);
      for (const b of world.offices.slice(i + 1)) expect(overlaps(a.outer, b.outer)).toBe(false);
    }
  });

  it("places one cubicle per seat, adding rows as seats grow", () => {
    expect(cubicleRowsFor([])).toBe(1);
    expect(cubicleRowsFor([1, 2, 3])).toBe(1);
    expect(cubicleRowsFor([1, 7])).toBe(3);

    const [room] = layoutWorld([office("Ada", [1, 2, 4])]).offices;
    expect(room.cubicles.map((cubicle) => cubicle.seat)).toEqual([1, 2, 4]);
    for (const [i, a] of room.cubicles.entries()) {
      expect(inside(room.interior, a.desk)).toBe(true);
      expect(contains(room.interior, a.spot)).toBe(true);
      for (const b of room.cubicles.slice(i + 1)) expect(overlaps(a.desk, b.desk)).toBe(false);
    }
    // Seat 4 starts the second row, so the room is deeper than an empty one.
    const [empty] = layoutWorld([office("Mo")]).offices;
    expect(room.outer.d).toBeGreaterThan(empty.outer.d);
  });

  it("lets the person walk from the lobby to every door, cubicle and machine", () => {
    const world = layoutWorld([
      office("Ada", [1, 2, 3, 4, 5]),
      office("Bo"),
      office("Cy", [2]),
      office("Di", [9]),
      office("Ed", [1]),
    ]);
    const grid = buildGrid(world);
    const goals: Cell[] = [
      world.machines.checkIn.spot,
      world.machines.checkOut.spot,
      ...world.offices.flatMap((room) => [room.doorStep, ...room.cubicles.map((c) => c.spot)]),
    ];
    for (const goal of goals) expect(findPath(grid, world.start, goal)).not.toBeNull();
  });

  it("keeps every cubicle reachable when full rows of desks stand in front of it", () => {
    // Four full rows: before the side walkways, the front row shut off the three behind it.
    const seats = Array.from({ length: 12 }, (_, i) => i + 1);
    const world = layoutWorld([office("Ada", seats), office("Bo", [1, 2, 3, 4, 5, 6])]);
    const grid = buildGrid(world);
    for (const room of world.offices) {
      for (const { seat, spot } of room.cubicles) {
        expect(findPath(grid, world.start, spot), `${room.name} seat ${seat}`).not.toBeNull();
      }
    }
  });
});

describe("plants", () => {
  const worlds = {
    "before check-in": layoutWorld(null),
    "no offices": layoutWorld([]),
    "an empty office": layoutWorld([office("Ada")]),
    "one cubicle": layoutWorld([office("Ada", [1])]),
    "many offices and cubicles": layoutWorld([
      office("Ada", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      office("Bo"),
      office("Cy", [3]),
      office("Di", [7]),
      office("Ed", [1, 5, 9]),
    ]),
  };

  for (const [name, world] of Object.entries(worlds)) {
    it(`stays out of the way and leaves every spot reachable: ${name}`, () => {
      const grid = buildGrid(world);
      const cell = (at: Cell): Rect => ({ ...at, w: 1, d: 1 });
      const keepClear: Rect[] = [
        world.gate,
        cell(world.start),
        ...Object.values(world.machines).flatMap(({ at, spot }) => [cell(at), cell(spot)]),
        ...world.offices.flatMap((room) => [
          room.door,
          cell(room.doorStep),
          ...room.cubicles.flatMap(({ desk, spot }) => [desk, cell(spot)]),
        ]),
      ];
      const rooms = [world.lobby, ...world.offices.map((room) => room.interior)];

      expect(world.plants.length).toBeGreaterThan(0);
      for (const plant of world.plants) {
        for (const clear of keepClear) expect(contains(clear, plant)).toBe(false);
        expect(rooms.some((room) => contains(room, plant))).toBe(true);
        expect(isOpen(grid, plant)).toBe(false);
      }

      const goals = [
        world.machines.checkIn.spot,
        world.machines.checkOut.spot,
        ...world.offices.flatMap((room) => [room.doorStep, ...room.cubicles.map((c) => c.spot)]),
      ];
      for (const goal of goals) expect(findPath(grid, world.start, goal)).not.toBeNull();
    });
  }

  it("gives every office two, and keeps the lobby's when the floor appears", () => {
    const world = worlds["many offices and cubicles"];
    expect(world.plants).toHaveLength(worlds["before check-in"].plants.length + 2 * 5);
    expect(world.plants).toEqual(expect.arrayContaining(worlds["before check-in"].plants));
  });
});

describe("findPath", () => {
  const grid = buildGrid(layoutWorld([office("Ada", [1])]));

  it("returns no steps when already there, and null for a blocked goal", () => {
    expect(findPath(grid, { x: 0, z: 8 }, { x: 0, z: 8 })).toEqual([]);
    expect(findPath(grid, { x: 0, z: 8 }, { x: 0, z: -40 })).toBeNull();
    expect(findPath(grid, { x: 0, z: 8 }, { x: -6, z: 1 })).toBeNull();
  });

  it("walks a straight line in the open, ending at the goal", () => {
    const path = findPath(grid, { x: 0, z: 8 }, { x: 4, z: 8 });
    expect(path).toEqual([
      { x: 1, z: 8 },
      { x: 2, z: 8 },
      { x: 3, z: 8 },
      { x: 4, z: 8 },
    ]);
  });

  it("goes through the gate, takes steps of one cell, and never touches a wall", () => {
    const path = findPath(grid, { x: -8, z: 5 }, { x: 8, z: -2 })!;
    expect(path.at(-1)).toEqual({ x: 8, z: -2 });
    expect(path.some((cell) => cell.z === 0 && Math.abs(cell.x) <= 1)).toBe(true);
    let previous = { x: -8, z: 5 };
    for (const cell of path) {
      expect(isOpen(grid, cell)).toBe(true);
      expect(Math.max(Math.abs(cell.x - previous.x), Math.abs(cell.z - previous.z))).toBe(1);
      // A diagonal step needs both side cells open, so it never cuts a wall's corner.
      expect(isOpen(grid, { x: cell.x, z: previous.z })).toBe(true);
      expect(isOpen(grid, { x: previous.x, z: cell.z })).toBe(true);
      previous = cell;
    }
  });

  it("cannot reach the floor while the gate is shut", () => {
    const shut = buildGrid(layoutWorld(null));
    expect(findPath(shut, { x: 0, z: 8 }, { x: 0, z: 1 })).not.toBeNull();
    expect(findPath(shut, { x: 0, z: 8 }, { x: 0, z: -1 })).toBeNull();
  });
});

describe("stepWalker", () => {
  it("moves at walking speed along the path and hands over the arrival once", () => {
    const walker = createWalker({ x: 0, z: 0 });
    const onArrive = () => {};
    walker.goal = { x: 2, z: 0 };
    walker.path = [
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ];
    walker.onArrive = onArrive;

    expect(stepWalker(walker, 0.25 / WALK_SPEED)).toBeNull();
    expect(walker.position.x).toBeCloseTo(0.25);
    expect(stepWalker(walker, 1.5 / WALK_SPEED)).toBeNull();
    expect(walker.position.x).toBeCloseTo(1.75);
    expect(walker.path).toHaveLength(1);
    expect(stepWalker(walker, 1 / WALK_SPEED)).toBe(onArrive);
    expect(walker.position.toArray()).toEqual([2, 0, 0]);
    expect(walker.goal).toBeNull();
    expect(stepWalker(walker, 1)).toBeNull();
  });

  it("does nothing with no path and nothing waiting", () => {
    const walker = createWalker({ x: 3, z: 4 });
    expect(stepWalker(walker, 1)).toBeNull();
    expect(walker.position.toArray()).toEqual([3, 0, 4]);
  });
});

describe("nearestOpenCell", () => {
  const grid = buildGrid(layoutWorld(null));

  it("rounds a click to its cell, or the nearest open one beside a wall", () => {
    expect(nearestOpenCell(grid, { x: 2.3, z: 4.6 })).toEqual({ x: 2, z: 5 });
    expect(nearestOpenCell(grid, { x: 10.8, z: 5 })).toEqual({ x: 10, z: 5 });
    expect(nearestOpenCell(grid, { x: 40, z: 40 })).toBeNull();
  });
});
