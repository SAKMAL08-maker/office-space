import type { Cell } from "./layout";
import { Label } from "./label";
import { colors } from "./colors";
import { clickable } from "./pointer";

/** The cabinet both machines share: a body, a coloured screen and a label. */
export function MachineBody({
  at,
  accent,
  label,
  onUse,
}: {
  at: Cell;
  accent: string;
  label: string;
  onUse: () => void;
}) {
  return (
    <group
      position={[at.x, 0, at.z]}
      onClick={(event) => {
        event.stopPropagation();
        onUse();
      }}
      {...clickable}
    >
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.9, 1.6, 0.7]} />
        <meshStandardMaterial color={colors.machineBody} />
      </mesh>
      {/* The screen faces the lobby, towards +z. */}
      <mesh position={[0, 1.15, 0.36]}>
        <boxGeometry args={[0.6, 0.45, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.55, 0.36]}>
        <boxGeometry args={[0.4, 0.12, 0.04]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <Label text={label} position={[0, 2.1, 0]} />
    </group>
  );
}
