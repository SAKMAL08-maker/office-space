import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { type OfficeLayout, contains } from "./layout";
import type { WalkerRef } from "./walk";

/** Where the camera sits relative to the point it watches: above and towards the viewer. */
const OFFSET = new Vector3(0, 15, 11);
/** It watches a little ahead of the character, so the character sits below the menu. */
const LOOK_AHEAD = new Vector3(0, 0, -3);
/**
 * Inside an office on a phone, the cubicle panel covers the bottom of the screen and the menu is
 * one short block, so the camera looks less far ahead and the character stays nearer the middle.
 * In the lobby the full look-ahead stays, to keep the gate and the offices in view.
 */
const PHONE_ROOM_LOOK_AHEAD = new Vector3(0, 0, -1);
/** Below this width the page shows its phone menu (Tailwind's `sm`). */
const PHONE_WIDTH = 640;
/**
 * Narrow screens see less across, so the camera rises to show more: on a phone held upright,
 * enough to keep both lobby machines in view. Wide screens keep the normal distance.
 */
const zoomForShape = (width: number, height: number) =>
  Math.min(2.2, Math.max(1, (0.95 * height) / width));
/** Inside an office the camera comes closer, to show the cubicles. */
const ROOM_ZOOM = 0.75;
const FOLLOW_SPEED = 4;

const goal = new Vector3();
const look = new Vector3();

/** A fixed-angle camera that glides after the character. */
export function CameraRig({ walker, offices }: { walker: WalkerRef; offices: OfficeLayout[] }) {
  useFrame((state, delta) => {
    const position = walker.current?.position;
    if (!position) return;
    const cell = { x: Math.round(position.x), z: Math.round(position.z) };
    const inRoom = offices.some((office) => contains(office.interior, cell));
    const zoom = (inRoom ? ROOM_ZOOM : 1) * zoomForShape(state.size.width, state.size.height);

    const ahead = inRoom && state.size.width < PHONE_WIDTH ? PHONE_ROOM_LOOK_AHEAD : LOOK_AHEAD;
    goal.copy(OFFSET).multiplyScalar(zoom).add(position).add(ahead);
    const blend = 1 - Math.exp(-FOLLOW_SPEED * Math.min(delta, 0.1));
    state.camera.position.lerp(goal, blend);
    // Looking at the camera's own ground point keeps the angle fixed while it moves.
    look.set(state.camera.position.x, 0, state.camera.position.z - OFFSET.z * zoom);
    state.camera.lookAt(look);
  });
  return null;
}
