import type { Object3D } from "three";

export type Pose = "stand" | "sit";

/** Where the hips sit when standing, and how far the body drops to sit on a chair. */
export const HIP_HEIGHT = 0.55;
export const THIGH = 0.27;
export const SHIN = 0.28;
const SIT_DROP = HIP_HEIGHT - SHIN - 0.02;
/** Sitting shifts the body forward, towards the desk. */
const SIT_FORWARD = 0.15;

const STRIDE = 0.6;
const ARM_SWING = 0.5;

/** The rotation that turns a limb hanging down to point straight ahead (+z, where the face is). */
const FORWARD = -Math.PI / 2;

function joint(root: Object3D, name: string): Object3D | undefined {
  return root.getObjectByName(name);
}

/**
 * Bends a character made by Person into a pose. Pass a walk phase while walking, or null when still.
 * It changes the 3D objects directly, so it can run every frame without React re-rendering.
 */
export function posePerson(root: Object3D, pose: Pose, walkPhase: number | null): void {
  const body = joint(root, "body");
  if (body) {
    body.position.y = pose === "sit" ? -SIT_DROP : 0;
    body.position.z = pose === "sit" ? SIT_FORWARD : 0;
  }
  const swing = walkPhase === null ? 0 : Math.sin(walkPhase);
  for (const [side, sign] of [
    ["L", 1],
    ["R", -1],
  ] as const) {
    const hip = joint(root, `hip${side}`);
    const knee = joint(root, `knee${side}`);
    const shoulder = joint(root, `shoulder${side}`);
    if (pose === "sit") {
      // Thighs forward on the seat, shins straight down, hands on the keyboard.
      if (hip) hip.rotation.x = FORWARD;
      if (knee) knee.rotation.x = -FORWARD;
      if (shoulder) shoulder.rotation.x = -1.15;
    } else {
      if (hip) hip.rotation.x = swing * STRIDE * sign;
      // The knee bends only one way, and only as the leg swings back.
      if (knee) knee.rotation.x = Math.max(0, swing * sign) * 0.6;
      if (shoulder) shoulder.rotation.x = -swing * ARM_SWING * sign;
    }
  }
}
