import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { colors } from "./colors";
import { stepWalker, type WalkerRef } from "./walk";

/** The longest frame step, so a tab coming back from the background does not jump the character. */
const MAX_FRAME = 0.1;

/** The person's own character. It follows the walker's path and bobs while it walks. */
export function Worker({ walker }: { walker: WalkerRef }) {
  const body = useRef<Group>(null);

  useFrame((state, delta) => {
    const group = body.current;
    const current = walker.current;
    if (!group || !current) return;
    const onArrival = stepWalker(current, Math.min(delta, MAX_FRAME));
    const moving = current.path.length > 0;

    group.position.copy(current.position);
    group.position.y = moving ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.08 : 0;
    group.rotation.y = current.heading;
    onArrival?.();
  });

  return (
    <group ref={body}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 4, 12]} />
        <meshStandardMaterial color={colors.worker} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
      {/* A nose, so you can tell which way the character faces. */}
      <mesh position={[0, 1.25, 0.2]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
    </group>
  );
}
