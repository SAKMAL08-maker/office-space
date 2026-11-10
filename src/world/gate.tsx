import { colors, WALL_HEIGHT } from "./colors";
import { type Rect, rectCentre } from "./layout";
import { Label } from "./label";

/** The way from the lobby onto the floor. It stays shut, with a red bar, until the person checks in. */
export function Gate({ gate, open }: { gate: Rect; open: boolean }) {
  const centre = rectCentre(gate);
  const postX = gate.w / 2 + 0.1;
  return (
    <group position={[centre.x, 0, centre.z]}>
      {[-postX, postX].map((x) => (
        <mesh key={x} position={[x, WALL_HEIGHT * 0.75, 0]}>
          <boxGeometry args={[0.2, WALL_HEIGHT * 1.5, 1.05]} />
          <meshStandardMaterial color={colors.gatePost} />
        </mesh>
      ))}
      {!open && (
        <>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[gate.w, 0.15, 0.15]} />
            <meshStandardMaterial color={colors.gateShut} />
          </mesh>
          <Label text="Check in to enter" position={[0, 1.9, 0]} />
        </>
      )}
    </group>
  );
}
