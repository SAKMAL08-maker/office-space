import { colors } from "./colors";
import type { Cell } from "./layout";

/** Leaf clumps around the stem: sideways offset, height and size. */
const CLUMPS: [number, number, number, number][] = [
  [0, 0.95, 0, 0.3],
  [0.17, 0.78, 0.06, 0.24],
  [-0.15, 0.8, -0.08, 0.24],
  [0.02, 0.72, -0.18, 0.22],
  [-0.06, 0.7, 0.17, 0.2],
];

/**
 * A potted plant filling one cell: a terracotta pot with a rim, soil, a short stem and low-poly
 * leaf clumps. `variant` turns and resizes it a little, so a row of them does not look stamped.
 */
export function Plant({ at, variant }: { at: Cell; variant: number }) {
  const turn = (variant * 1.3) % (Math.PI * 2);
  const size = 0.9 + (variant % 3) * 0.08;
  return (
    <group position={[at.x, 0, at.z]} rotation-y={turn} scale={size}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.44, 16]} />
        <meshStandardMaterial color={colors.pot} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.27, 0.07, 16]} />
        <meshStandardMaterial color={colors.potRim} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.01, 16]} />
        <meshStandardMaterial color={colors.soil} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.3, 6]} />
        <meshStandardMaterial color={colors.leafDark} />
      </mesh>
      {CLUMPS.map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? colors.leaf : colors.leafDark}
            flatShading
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
