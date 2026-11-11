import { colors } from "./colors";

export type MachineIconKind = "tick" | "arrow";

/** One white bar of the icon: its centre, length and angle. */
type Bar = [x: number, y: number, length: number, angle: number];

/** A tick for check-in, an arrow pointing out for check-out. Drawn on the screen's plane. */
const BARS: Record<MachineIconKind, Bar[]> = {
  tick: [
    [-0.07, -0.03, 0.12, -Math.PI / 4],
    [0.05, 0.02, 0.22, Math.PI / 4],
  ],
  arrow: [
    [-0.02, 0, 0.22, 0],
    [0.06, 0.045, 0.11, -Math.PI / 4],
    [0.06, -0.045, 0.11, Math.PI / 4],
  ],
};

/** A simple icon built from bars, so each machine says what it does without words. */
export function MachineIcon({ kind }: { kind: MachineIconKind }) {
  return (
    <group>
      {BARS[kind].map(([x, y, length, angle], index) => (
        <mesh key={index} position={[x, y, 0]} rotation-z={angle}>
          <boxGeometry args={[length, 0.035, 0.01]} />
          <meshBasicMaterial color={colors.iconInk} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
