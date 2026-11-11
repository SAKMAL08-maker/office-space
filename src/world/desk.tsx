import { colors } from "./colors";

export const DESK_TOP = 0.6;
const WIDTH = 2.4;
const DEPTH = 0.8;

/** A desk with panel legs, a keyboard, a mouse and a mug, centred on its own origin. */
export function Desk() {
  return (
    <group>
      <mesh position={[0, DESK_TOP - 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH, 0.05, DEPTH]} />
        <meshStandardMaterial color={colors.desk} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (WIDTH / 2 - 0.05), (DESK_TOP - 0.05) / 2, 0]}>
          <boxGeometry args={[0.05, DESK_TOP - 0.05, DEPTH - 0.1]} />
          <meshStandardMaterial color={colors.desk} />
        </mesh>
      ))}
      {/* A panel under the back edge hides the legs of whoever sits there from behind. */}
      <mesh position={[0, 0.35, -DEPTH / 2 + 0.05]}>
        <boxGeometry args={[WIDTH - 0.1, 0.4, 0.03]} />
        <meshStandardMaterial color={colors.desk} />
      </mesh>
      <mesh position={[0, DESK_TOP + 0.012, 0.2]}>
        <boxGeometry args={[0.5, 0.025, 0.16]} />
        <meshStandardMaterial color={colors.keyboard} />
      </mesh>
      <mesh position={[0.38, DESK_TOP + 0.015, 0.22]}>
        <boxGeometry args={[0.07, 0.03, 0.11]} />
        <meshStandardMaterial color={colors.keyboard} />
      </mesh>
      <mesh position={[-0.85, DESK_TOP + 0.06, 0.05]}>
        <cylinderGeometry args={[0.05, 0.045, 0.12, 12]} />
        <meshStandardMaterial color={colors.checkOut} />
      </mesh>
    </group>
  );
}
