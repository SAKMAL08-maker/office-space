import type { RefObject } from "react";
import { Vector3 } from "three";
import type { Cell } from "./layout";

export type MachineKind = "checkIn" | "checkOut";

/** A machine the page asks the character to walk to. The id changes on every request. */
export type MachineRequest = { kind: MachineKind; id: number };

/**
 * The person's own character: where it is, where it is going, the cells still to walk,
 * and what to do on arrival. The scene changes it every frame, so it lives in a ref, outside React state.
 */
export type Walker = {
  position: Vector3;
  heading: number;
  goal: Cell | null;
  path: Cell[];
  onArrive: (() => void) | null;
};

export type WalkerRef = RefObject<Walker | null>;

export const WALK_SPEED = 4;

export const createWalker = (start: Cell): Walker => ({
  position: new Vector3(start.x, 0, start.z),
  heading: Math.PI,
  goal: null,
  path: [],
  onArrive: null,
});

/**
 * Moves the walker along its path by one frame's worth of distance.
 * On the frame it arrives, it hands back what was waiting for the arrival, exactly once.
 */
export function stepWalker(walker: Walker, seconds: number): (() => void) | null {
  let budget = WALK_SPEED * seconds;
  while (budget > 0 && walker.path.length > 0) {
    const [next] = walker.path;
    const dx = next.x - walker.position.x;
    const dz = next.z - walker.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0) walker.heading = Math.atan2(dx, dz);
    if (distance <= budget) {
      walker.position.set(next.x, 0, next.z);
      walker.path.shift();
      budget -= distance;
    } else {
      walker.position.x += (dx / distance) * budget;
      walker.position.z += (dz / distance) * budget;
      budget = 0;
    }
  }
  if (walker.path.length > 0) return null;
  walker.goal = null;
  const action = walker.onArrive;
  walker.onArrive = null;
  return action;
}
