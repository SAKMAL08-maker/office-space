import { useLayoutEffect, useRef } from "react";
import type { Group } from "three";
import { personColors } from "./colors";
import { Person } from "./person";
import { posePerson } from "./pose";

/** Someone else sitting at their desk, facing -z. Drawn on their cubicle's chair while they work. */
export function SeatedPerson({ personId }: { personId: string }) {
  const root = useRef<Group>(null);
  const { shirt, hair } = personColors(personId);

  useLayoutEffect(() => {
    if (root.current) posePerson(root.current, "sit", null);
  }, []);

  return (
    <group ref={root} rotation={[0, Math.PI, 0]}>
      <Person shirt={shirt} hair={hair} />
    </group>
  );
}
