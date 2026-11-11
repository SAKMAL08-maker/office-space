/**
 * Where everything in the world sits, on a grid of one-metre cells.
 * A cell's numbers are also its centre in the 3D scene, so cell { x: 2, z: -3 } is drawn at (2, 0, -3).
 * The camera looks from +z, so the lobby is nearest the viewer and the floor stretches away behind it.
 * The gate sits at z = 0 and the lobby never moves, so a character keeps its place when the floor appears.
 */

export type Cell = { x: number; z: number };
/** A block of cells from (x, z) to (x + w - 1, z + d - 1). */
export type Rect = { x: number; z: number; w: number; d: number };

export type OfficeInput = { ownerId: string; name: string; seats: number[] };

/** What a cubicle shows: its project, and since when its owner has been working there, if they are. */
export type CubicleInfo = {
  seat: number;
  projectId: string;
  title: string;
  description: string;
  sentBy: string | null;
  workingSince: Date | null;
};

/** One office as the server sends it: its owner and the cubicles of their active projects. */
export type OfficeInfo = { ownerId: string; name: string; cubicles: CubicleInfo[] };

export const toOfficeInput = ({ ownerId, name, cubicles }: OfficeInfo): OfficeInput => ({
  ownerId,
  name,
  seats: cubicles.map((cubicle) => cubicle.seat),
});

export type CubicleLayout = { seat: number; desk: Rect; spot: Cell };

export type OfficeLayout = {
  ownerId: string;
  name: string;
  outer: Rect;
  interior: Rect;
  door: Rect;
  /** The first cell inside the door, where a walk into the office ends. */
  doorStep: Cell;
  cubicles: CubicleLayout[];
};

export type Machine = { at: Cell; spot: Cell };

export type WorldLayout = {
  bounds: Rect;
  lobby: Rect;
  gate: Rect;
  gateOpen: boolean;
  machines: { checkIn: Machine; checkOut: Machine };
  start: Cell;
  /** Null until the person checks in, because the server does not send it before then. */
  floor: Rect | null;
  offices: OfficeLayout[];
  walls: Rect[];
  /** Potted plants. Each fills its cell, so nobody walks through one. */
  plants: Cell[];
};

const LOBBY_HALF = 11;
const LOBBY_DEPTH = 10;
const CORRIDOR = 3;
const AISLE = 2;
/** A one-cell walkway down each side of the desks, so a full row never shuts off the row behind. */
const SIDE_AISLE = 1;
const CUBICLE = 3;
const CUBICLES_PER_ROW = 3;
/** A row of desks, a walkway each side and the two side walls. It stays odd, so the door is centred. */
const ROOM_WIDTH = CUBICLES_PER_ROW * CUBICLE + 2 * SIDE_AISLE + 2;
const MAX_COLUMNS = 4;
const DOOR_WIDTH = 3;

const GATE: Rect = { x: -1, z: 0, w: DOOR_WIDTH, d: 1 };
const LOBBY: Rect = { x: -LOBBY_HALF + 1, z: 1, w: LOBBY_HALF * 2 - 1, d: LOBBY_DEPTH };

const MACHINES = {
  checkIn: { at: { x: -6, z: 1 }, spot: { x: -6, z: 2 } },
  checkOut: { at: { x: 6, z: 1 }, spot: { x: 6, z: 2 } },
};
const START: Cell = { x: 0, z: 8 };
/** The lobby's four corners, and one beside each machine on its outer side. */
const LOBBY_PLANTS: Cell[] = [
  { x: LOBBY.x, z: LOBBY.z },
  { x: LOBBY.x + LOBBY.w - 1, z: LOBBY.z },
  { x: LOBBY.x, z: LOBBY.z + LOBBY.d - 1 },
  { x: LOBBY.x + LOBBY.w - 1, z: LOBBY.z + LOBBY.d - 1 },
  { x: MACHINES.checkIn.at.x - 1, z: MACHINES.checkIn.at.z },
  { x: MACHINES.checkOut.at.x + 1, z: MACHINES.checkOut.at.z },
];

export const columnsFor = (count: number) =>
  count === 0 ? 0 : Math.min(MAX_COLUMNS, Math.ceil(Math.sqrt(count)));

/** Rows of cubicles an office needs, from its highest seat number, since seats can have gaps. */
export const cubicleRowsFor = (seats: number[]) =>
  Math.max(1, Math.ceil(Math.max(0, ...seats) / CUBICLES_PER_ROW));

/** A wall row with a gap in it, as up to two pieces. */
function wallWithGap(x: number, z: number, w: number, gap: Rect): Rect[] {
  const left = { x, z, w: gap.x - x, d: 1 };
  const right = { x: gap.x + gap.w, z, w: x + w - (gap.x + gap.w), d: 1 };
  return [left, right].filter((piece) => piece.w > 0);
}

function placeOffice(office: OfficeInput, x: number, front: number): OfficeLayout {
  const depth = AISLE + cubicleRowsFor(office.seats) * CUBICLE + 2;
  const outer = { x, z: front - depth + 1, w: ROOM_WIDTH, d: depth };
  const interior = { x: x + 1, z: outer.z + 1, w: ROOM_WIDTH - 2, d: depth - 2 };
  const door = { x: x + (ROOM_WIDTH - DOOR_WIDTH) / 2, z: front, w: DOOR_WIDTH, d: 1 };
  const cubicles = office.seats.map((seat) => {
    const column = (seat - 1) % CUBICLES_PER_ROW;
    const row = Math.floor((seat - 1) / CUBICLES_PER_ROW);
    const deskX = interior.x + SIDE_AISLE + column * CUBICLE;
    const deskZ = interior.z + row * CUBICLE;
    return {
      seat,
      desk: { x: deskX, z: deskZ, w: CUBICLE, d: 1 },
      spot: { x: deskX + 1, z: deskZ + 1 },
    };
  });
  return {
    ownerId: office.ownerId,
    name: office.name,
    outer,
    interior,
    door,
    doorStep: { x: x + (ROOM_WIDTH - 1) / 2, z: front - 1 },
    cubicles,
  };
}

/**
 * The two front corners inside an office. Cubicles fill rows from the back, so the aisle by the
 * door always has these free, and the aisle's second row keeps every cubicle reachable.
 */
function officePlants({ interior }: OfficeLayout): Cell[] {
  const z = interior.z + interior.d - 1;
  return [
    { x: interior.x, z },
    { x: interior.x + interior.w - 1, z },
  ];
}

function officeWalls({ outer, door }: OfficeLayout): Rect[] {
  const front = outer.z + outer.d - 1;
  return [
    { x: outer.x, z: outer.z, w: outer.w, d: 1 },
    { x: outer.x, z: outer.z + 1, w: 1, d: outer.d - 2 },
    { x: outer.x + outer.w - 1, z: outer.z + 1, w: 1, d: outer.d - 2 },
    ...wallWithGap(outer.x, front, outer.w, door),
  ];
}

/**
 * Lays out the whole world. Offices fill a grid in the order given, with corridors around each one
 * and its door facing the lobby. Pass null for offices when the person is not checked in.
 */
export function layoutWorld(offices: OfficeInput[] | null): WorldLayout {
  const lobbyWalls: Rect[] = [
    { x: -LOBBY_HALF, z: 1, w: 1, d: LOBBY_DEPTH },
    { x: LOBBY_HALF, z: 1, w: 1, d: LOBBY_DEPTH },
    { x: -LOBBY_HALF, z: LOBBY_DEPTH + 1, w: LOBBY_HALF * 2 + 1, d: 1 },
  ];
  const lobbyOnly = (): WorldLayout => ({
    bounds: { x: -LOBBY_HALF, z: 0, w: LOBBY_HALF * 2 + 1, d: LOBBY_DEPTH + 2 },
    lobby: LOBBY,
    gate: GATE,
    gateOpen: false,
    machines: MACHINES,
    start: START,
    floor: null,
    offices: [],
    // The gate is not a wall: it is drawn by itself, and stays shut because it is never opened.
    walls: [...lobbyWalls, ...wallWithGap(-LOBBY_HALF, 0, LOBBY_HALF * 2 + 1, GATE)],
    plants: LOBBY_PLANTS,
  });
  if (!offices) return lobbyOnly();

  const columns = Math.max(1, columnsFor(offices.length));
  const block = columns * ROOM_WIDTH + (columns + 1) * CORRIDOR;
  const outerWidth = Math.max(block + 2, LOBBY_HALF * 2 + 1);
  const half = (outerWidth - 1) / 2;
  const padding = (outerWidth - 2 - block) / 2;
  const columnX = (column: number) =>
    -half + 1 + padding + CORRIDOR + column * (ROOM_WIDTH + CORRIDOR);

  const placed: OfficeLayout[] = [];
  let front = -1 - CORRIDOR;
  let top = front + 1;
  for (let start = 0; start < offices.length; start += columns) {
    const row = offices
      .slice(start, start + columns)
      .map((office, column) => placeOffice(office, columnX(column), front));
    placed.push(...row);
    top = Math.min(...row.map((office) => office.outer.z));
    front = top - 1 - CORRIDOR;
  }
  // A two-cell walkway behind the last row.
  const topWall = top - 3;

  const floor = { x: -half + 1, z: topWall + 1, w: outerWidth - 2, d: -1 - topWall };
  return {
    bounds: { x: -half, z: topWall, w: outerWidth, d: LOBBY_DEPTH + 2 - topWall },
    lobby: LOBBY,
    gate: GATE,
    gateOpen: true,
    machines: MACHINES,
    start: START,
    floor,
    offices: placed,
    walls: [
      ...lobbyWalls,
      ...wallWithGap(-half, 0, outerWidth, GATE),
      { x: -half, z: topWall, w: outerWidth, d: 1 },
      { x: -half, z: topWall + 1, w: 1, d: -1 - topWall },
      { x: half, z: topWall + 1, w: 1, d: -1 - topWall },
      ...placed.flatMap(officeWalls),
    ],
    plants: [...LOBBY_PLANTS, ...placed.flatMap(officePlants)],
  };
}

/** The point at the centre of a block, for drawing it. */
export const rectCentre = ({ x, z, w, d }: Rect) => ({ x: x + (w - 1) / 2, z: z + (d - 1) / 2 });

export const contains = (rect: Rect, { x, z }: Cell) =>
  x >= rect.x && x < rect.x + rect.w && z >= rect.z && z < rect.z + rect.d;
