import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { colors } from "./colors";
import type { WalkerRef } from "./walk";

/** A ring on the ground where the character is heading, hidden when it stands still. */
export function Marker({ walker }: { walker: WalkerRef }) {
  const ring = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = ring.current;
    const goal = walker.current?.goal;
    if (!mesh) return;
    mesh.visible = Boolean(goal);
    if (goal) mesh.position.set(goal.x, 0.03, goal.z);
  });

  return (
    <mesh ref={ring} visible={false} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.3, 0.42, 24]} />
      <meshBasicMaterial color={colors.marker} />
    </mesh>
  );
}
