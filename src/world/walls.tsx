import { colors, WALL_HEIGHT } from "./colors";
import { type Rect, rectCentre } from "./layout";

const SKIRTING = 0.14;
const CAP = 0.06;

/**
 * Every wall in the world, one cell thick: a painted body, a darker skirting strip along the
 * bottom and a cap along the top, so the rooms' outlines read clearly from above.
 */
export function Walls({ walls }: { walls: Rect[] }) {
  return (
    <group>
      {walls.map((wall) => {
        const centre = rectCentre(wall);
        return (
          <group key={`${wall.x},${wall.z},${wall.w},${wall.d}`} position={[centre.x, 0, centre.z]}>
            <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[wall.w, WALL_HEIGHT, wall.d]} />
              <meshStandardMaterial color={colors.wall} roughness={0.95} />
            </mesh>
            <mesh position={[0, SKIRTING / 2, 0]}>
              <boxGeometry args={[wall.w + 0.04, SKIRTING, wall.d + 0.04]} />
              <meshStandardMaterial color={colors.skirting} />
            </mesh>
            <mesh position={[0, WALL_HEIGHT + CAP / 2, 0]} receiveShadow>
              <boxGeometry args={[wall.w + 0.06, CAP, wall.d + 0.06]} />
              <meshStandardMaterial color={colors.wallCap} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
