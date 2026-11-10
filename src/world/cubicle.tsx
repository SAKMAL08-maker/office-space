import { colors } from "./colors";
import { type CubicleLayout, rectCentre } from "./layout";
import { clickable } from "./pointer";

/**
 * One project's cubicle: a desk against a low back panel, a monitor and a chair.
 * Clicking it walks the person to the chair. PR 5 adds its details panel and the "working" glow.
 */
export function Cubicle({ cubicle, onUse }: { cubicle: CubicleLayout; onUse: () => void }) {
  const desk = rectCentre(cubicle.desk);
  return (
    <group
      position={[desk.x, 0, desk.z]}
      onClick={(event) => {
        event.stopPropagation();
        onUse();
      }}
      {...clickable}
    >
      <mesh position={[0, 0.6, -0.45]}>
        <boxGeometry args={[2.8, 1.2, 0.08]} />
        <meshStandardMaterial color={colors.panel} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.4, 0.06, 0.8]} />
        <meshStandardMaterial color={colors.desk} />
      </mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]}>
          <boxGeometry args={[0.08, 0.7, 0.7]} />
          <meshStandardMaterial color={colors.desk} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, -0.2]}>
        <boxGeometry args={[0.7, 0.42, 0.05]} />
        <meshStandardMaterial color={colors.monitor} />
      </mesh>
      <mesh position={[0, 1.0, -0.17]}>
        <boxGeometry args={[0.62, 0.34, 0.01]} />
        <meshStandardMaterial color={colors.screen} />
      </mesh>
      {/* The chair stands on the seat cell, one cell in front of the desk. */}
      <group position={[0, 0, 1]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial color={colors.chair} />
        </mesh>
        <mesh position={[0, 0.75, 0.22]}>
          <boxGeometry args={[0.5, 0.55, 0.06]} />
          <meshStandardMaterial color={colors.chair} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.44]} />
          <meshStandardMaterial color={colors.monitor} />
        </mesh>
      </group>
    </group>
  );
}
