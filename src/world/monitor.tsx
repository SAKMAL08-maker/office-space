import { colors } from "./colors";
import { DESK_TOP } from "./desk";

/** A monitor on a stand. Its screen lights up while someone works at it. */
export function Monitor({ lit }: { lit: boolean }) {
  return (
    <group>
      <mesh position={[0, DESK_TOP + 0.01, 0]}>
        <cylinderGeometry args={[0.13, 0.14, 0.02, 16]} />
        <meshStandardMaterial color={colors.monitor} />
      </mesh>
      <mesh position={[0, DESK_TOP + 0.15, -0.02]}>
        <boxGeometry args={[0.05, 0.28, 0.03]} />
        <meshStandardMaterial color={colors.monitor} />
      </mesh>
      <mesh position={[0, DESK_TOP + 0.38, 0]}>
        <boxGeometry args={[0.78, 0.46, 0.04]} />
        <meshStandardMaterial color={colors.monitor} />
      </mesh>
      <mesh position={[0, DESK_TOP + 0.39, 0.021]}>
        <planeGeometry args={[0.7, 0.38]} />
        <meshStandardMaterial
          color={lit ? colors.screenLit : colors.screen}
          emissive={lit ? colors.screenLit : "#000000"}
          emissiveIntensity={lit ? 0.9 : 0}
        />
      </mesh>
    </group>
  );
}
