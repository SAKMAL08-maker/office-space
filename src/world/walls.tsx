import { colors, WALL_HEIGHT } from "./colors";
import { type Rect, rectCentre } from "./layout";

/** Every wall in the world, as plain boxes one cell thick. */
export function Walls({ walls }: { walls: Rect[] }) {
  return (
    <group>
      {walls.map((wall) => {
        const centre = rectCentre(wall);
        return (
          <mesh
            key={`${wall.x},${wall.z},${wall.w},${wall.d}`}
            position={[centre.x, WALL_HEIGHT / 2, centre.z]}
          >
            <boxGeometry args={[wall.w, WALL_HEIGHT, wall.d]} />
            <meshStandardMaterial color={colors.wall} />
          </mesh>
        );
      })}
    </group>
  );
}
