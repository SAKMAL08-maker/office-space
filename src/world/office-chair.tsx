import { colors } from "./colors";

/** Seat height matches where a sitting Person rests. */
const SEAT_TOP = 0.25;
const SPOKES = [0, 1, 2, 3, 4].map((i) => (i * Math.PI * 2) / 5);

/** An office chair on a five-leg base, facing -z, towards its desk. */
export function OfficeChair() {
  return (
    <group>
      <mesh position={[0, SEAT_TOP - 0.03, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.48]} />
        <meshStandardMaterial color={colors.chair} />
      </mesh>
      <mesh position={[0, 0.6, 0.27]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.46, 0.55, 0.06]} />
        <meshStandardMaterial color={colors.chair} />
      </mesh>
      <mesh position={[0, 0.33, 0.27]}>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
        <meshStandardMaterial color={colors.monitor} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
        <meshStandardMaterial color={colors.monitor} />
      </mesh>
      {SPOKES.map((angle) => (
        <group key={angle} rotation={[0, angle, 0]}>
          <mesh position={[0, 0.05, 0.14]}>
            <boxGeometry args={[0.04, 0.03, 0.28]} />
            <meshStandardMaterial color={colors.monitor} />
          </mesh>
          <mesh position={[0, 0.025, 0.27]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color={colors.shoes} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
