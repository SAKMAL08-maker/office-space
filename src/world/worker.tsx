import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { personColors } from "./colors";
import type { Cell } from "./layout";
import { Person } from "./person";
import { posePerson } from "./pose";
import { stepWalker, type WalkerRef } from "./walk";

/** The longest frame step, so a tab coming back from the background does not jump the character. */
const MAX_FRAME = 0.1;
const STEPS_PER_SECOND = 10;

/**
 * The person's own character. It follows the walker's path, swinging its arms and legs, and sits
 * down, facing the desk, while it stands on the seat of the cubicle where the person is working.
 */
export function Worker({
  walker,
  personId,
  seat,
}: {
  walker: WalkerRef;
  personId: string;
  seat: Cell | null;
}) {
  const body = useRef<Group>(null);
  const { shirt, hair } = personColors(personId);

  useFrame((state, delta) => {
    const group = body.current;
    const current = walker.current;
    if (!group || !current) return;
    const onArrival = stepWalker(current, Math.min(delta, MAX_FRAME));
    const moving = current.path.length > 0;
    const sitting =
      !moving && seat !== null && current.position.x === seat.x && current.position.z === seat.z;
    const phase = state.clock.elapsedTime * STEPS_PER_SECOND;
    group.position.copy(current.position);
    group.position.y = moving ? Math.abs(Math.sin(phase)) * 0.04 : 0;
    // A sitting character faces its desk, which is towards -z from the chair.
    group.rotation.y = sitting ? Math.PI : current.heading;
    posePerson(group, sitting ? "sit" : "stand", moving ? phase : null);
    onArrival?.();
  });

  return (
    <group ref={body}>
      <Person shirt={shirt} hair={hair} />
    </group>
  );
}
