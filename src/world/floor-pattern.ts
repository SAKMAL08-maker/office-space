import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/** Stone tiles for the lobby, wooden planks for the corridors, woven carpet for offices. */
export type Pattern = "tiles" | "planks" | "carpet";

/** Every pattern covers this many metres before it repeats. Tiles and planks line up with cells. */
export const PATTERN_METRES = 2;
const SIZE = 256;
const PX = SIZE / PATTERN_METRES;

/**
 * The same numbers every time, so the floor never changes between loads.
 * Returns values from 0 up to (not including) 1.
 */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** A grey level around white. The floor's own colour tints it, so one picture serves every colour. */
const shade = (level: number) => {
  const value = Math.round(255 * Math.min(1, level));
  return `rgb(${value},${value},${value})`;
};

function drawTiles(context: CanvasRenderingContext2D) {
  const random = seeded(7);
  for (let row = 0; row < PATTERN_METRES; row++) {
    for (let column = 0; column < PATTERN_METRES; column++) {
      context.fillStyle = shade(0.93 + random() * 0.07);
      context.fillRect(column * PX, row * PX, PX, PX);
      // Faint flecks, like stone.
      for (let fleck = 0; fleck < 60; fleck++) {
        context.fillStyle = shade(0.82 + random() * 0.12);
        context.fillRect(column * PX + random() * PX, row * PX + random() * PX, 2, 2);
      }
    }
  }
  // Grout along the cell edges, half on each side of the seam, so it meets across repeats.
  context.fillStyle = shade(0.7);
  for (let line = 0; line <= PATTERN_METRES; line++) {
    context.fillRect(line * PX - 1.5, 0, 3, SIZE);
    context.fillRect(0, line * PX - 1.5, SIZE, 3);
  }
}

function drawPlanks(context: CanvasRenderingContext2D) {
  const random = seeded(11);
  const rows = 8;
  const height = SIZE / rows;
  for (let row = 0; row < rows; row++) {
    // One board per row, two metres long, running on across the repeat. Each row's joint sits
    // at a different place, as boards do.
    const joint = (row % 2) * (SIZE / 2) + (row % 4 >= 2 ? SIZE / 4 : 0);
    context.fillStyle = shade(0.88 + random() * 0.12);
    context.fillRect(0, row * height, SIZE, height);
    // Grain: a few long, faint streaks.
    for (let streak = 0; streak < 5; streak++) {
      context.fillStyle = shade(0.8 + random() * 0.1);
      context.fillRect(random() * SIZE, row * height + 3 + random() * (height - 6), 40, 1);
    }
    context.fillStyle = shade(0.68);
    context.fillRect(0, row * height, SIZE, 2);
    context.fillRect(joint, row * height, 2, height);
  }
}

function drawCarpet(context: CanvasRenderingContext2D) {
  const random = seeded(23);
  context.fillStyle = shade(0.95);
  context.fillRect(0, 0, SIZE, SIZE);
  // A fine weave of crossing threads, then a scatter of darker tufts.
  for (let line = 0; line < SIZE; line += 4) {
    context.fillStyle = shade(0.9);
    context.fillRect(0, line, SIZE, 1);
    context.fillRect(line + 2, 0, 1, SIZE);
  }
  for (let tuft = 0; tuft < 900; tuft++) {
    context.fillStyle = shade(0.82 + random() * 0.12);
    context.fillRect(random() * SIZE, random() * SIZE, 2, 2);
  }
}

const DRAW = { tiles: drawTiles, planks: drawPlanks, carpet: drawCarpet };
const drawn = new Map<Pattern, HTMLCanvasElement>();

/** Draws a pattern once per page, in grey. Every floor that uses it shares the picture. */
function canvasFor(pattern: Pattern) {
  let canvas = drawn.get(pattern);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    DRAW[pattern](canvas.getContext("2d")!);
    drawn.set(pattern, canvas);
  }
  return canvas;
}

/**
 * A repeating texture for a patch of floor, `width` by `depth` metres, whose lower-left corner
 * (towards -x, +z) sits at (left, front) in the scene. Lining it up with the scene, not the patch,
 * means tiles and planks run on unbroken from one patch to the next.
 */
export function floorTexture(
  pattern: Pattern,
  { left, front, width, depth }: { left: number; front: number; width: number; depth: number },
): Texture {
  const texture = new CanvasTexture(canvasFor(pattern));
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  texture.repeat.set(width / PATTERN_METRES, depth / PATTERN_METRES);
  // The picture's v runs towards -z once the plane lies flat.
  texture.offset.set(left / PATTERN_METRES, -front / PATTERN_METRES);
  return texture;
}
