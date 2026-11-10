import { type Cell, contains, type Rect, type WorldLayout } from "./layout";

/** Which cells a character can stand on. */
export type Grid = { bounds: Rect; open: Uint8Array };

function forEachCell(rect: Rect, visit: (cell: Cell) => void) {
  for (let z = rect.z; z < rect.z + rect.d; z++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) visit({ x, z });
  }
}

const indexOf = ({ bounds }: Grid, { x, z }: Cell) => (z - bounds.z) * bounds.w + (x - bounds.x);

export const isOpen = (grid: Grid, cell: Cell) =>
  contains(grid.bounds, cell) && grid.open[indexOf(grid, cell)] === 1;

/** Open where people can walk: the lobby, the open gate and the floor, minus walls, desks and machines. */
export function buildGrid(layout: WorldLayout): Grid {
  const grid = { bounds: layout.bounds, open: new Uint8Array(layout.bounds.w * layout.bounds.d) };
  const set = (rect: Rect, value: number) =>
    forEachCell(rect, (cell) => {
      if (contains(grid.bounds, cell)) grid.open[indexOf(grid, cell)] = value;
    });

  set(layout.lobby, 1);
  if (layout.floor) set(layout.floor, 1);
  if (layout.gateOpen) set(layout.gate, 1);
  for (const wall of layout.walls) set(wall, 0);
  for (const office of layout.offices) {
    set(office.door, 1);
    for (const cubicle of office.cubicles) set(cubicle.desk, 0);
  }
  for (const { at } of Object.values(layout.machines)) set({ ...at, w: 1, d: 1 }, 0);
  return grid;
}

const STEPS = [
  { x: 1, z: 0, cost: 1 },
  { x: -1, z: 0, cost: 1 },
  { x: 0, z: 1, cost: 1 },
  { x: 0, z: -1, cost: 1 },
  { x: 1, z: 1, cost: Math.SQRT2 },
  { x: 1, z: -1, cost: Math.SQRT2 },
  { x: -1, z: 1, cost: Math.SQRT2 },
  { x: -1, z: -1, cost: Math.SQRT2 },
];

/** Straight-line-ish distance on a grid that allows diagonal steps. It never overestimates. */
function estimate(a: Cell, b: Cell) {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

type Entry = { cell: number; score: number };

/** A small min-heap of cells. Each entry keeps the score it was queued with. */
class Queue {
  private items: Entry[] = [];

  get size() {
    return this.items.length;
  }

  push(cell: number, score: number) {
    const { items } = this;
    items.push({ cell, score });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].score <= items[i].score) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): number {
    const { items } = this;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left].score < items[smallest].score) smallest = left;
        if (right < items.length && items[right].score < items[smallest].score) smallest = right;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i], items[smallest]];
        i = smallest;
      }
    }
    return top.cell;
  }
}

/**
 * The shortest walk from one cell to another, as the cells after the start, ending at the goal.
 * Diagonal steps never cut a wall's corner. Returns null when the goal cannot be reached.
 */
export function findPath(grid: Grid, from: Cell, to: Cell): Cell[] | null {
  if (!isOpen(grid, from) || !isOpen(grid, to)) return null;
  if (from.x === to.x && from.z === to.z) return [];

  const { bounds } = grid;
  const size = bounds.w * bounds.d;
  const cost = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const done = new Uint8Array(size);
  const cellAt = (index: number) => ({
    x: bounds.x + (index % bounds.w),
    z: bounds.z + Math.floor(index / bounds.w),
  });

  const start = indexOf(grid, from);
  const goal = indexOf(grid, to);
  cost[start] = 0;
  const queue = new Queue();
  queue.push(start, estimate(from, to));

  while (queue.size > 0) {
    const current = queue.pop();
    if (current === goal) break;
    if (done[current]) continue;
    done[current] = 1;

    const here = cellAt(current);
    for (const step of STEPS) {
      const next = { x: here.x + step.x, z: here.z + step.z };
      if (!isOpen(grid, next)) continue;
      const diagonal = step.x !== 0 && step.z !== 0;
      if (
        diagonal &&
        (!isOpen(grid, { x: next.x, z: here.z }) || !isOpen(grid, { x: here.x, z: next.z }))
      ) {
        continue;
      }
      const nextIndex = indexOf(grid, next);
      const nextCost = cost[current] + step.cost;
      if (nextCost >= cost[nextIndex]) continue;
      cost[nextIndex] = nextCost;
      cameFrom[nextIndex] = current;
      // An older, worse copy may stay in the queue; it is skipped once the cell is done.
      queue.push(nextIndex, nextCost + estimate(next, to));
    }
  }

  if (cameFrom[goal] === -1) return null;
  const path: Cell[] = [];
  for (let at = goal; at !== start; at = cameFrom[at]) path.push(cellAt(at));
  return path.reverse();
}

/** The open cell nearest to a point, for clicks that land on a wall or between cells. */
export function nearestOpenCell(grid: Grid, point: { x: number; z: number }): Cell | null {
  const centre = { x: Math.round(point.x), z: Math.round(point.z) };
  if (isOpen(grid, centre)) return centre;
  let best: Cell | null = null;
  let bestDistance = Infinity;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cell = { x: centre.x + dx, z: centre.z + dz };
      const distance = (cell.x - point.x) ** 2 + (cell.z - point.z) ** 2;
      if (isOpen(grid, cell) && distance < bestDistance) {
        best = cell;
        bestDistance = distance;
      }
    }
  }
  return best;
}
