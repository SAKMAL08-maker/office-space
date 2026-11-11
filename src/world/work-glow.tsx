import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type MeshBasicMaterial } from "three";
import { colors } from "./colors";

/** A softly pulsing patch of light on the floor, so an occupied cubicle stands out from far away. */
export function WorkGlow({ width, depth }: { width: number; depth: number }) {
  const material = useRef<MeshBasicMaterial>(null);

  useFrame((state) => {
    if (material.current) {
      material.current.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial
        ref={material}
        color={colors.working}
        transparent
        opacity={0.35}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
