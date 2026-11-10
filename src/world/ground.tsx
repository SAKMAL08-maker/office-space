import type { ThreeEvent } from "@react-three/fiber";
import { type Rect, rectCentre } from "./layout";

/** A flat, clickable patch of floor covering a block of cells. */
export function Ground({
  rect,
  color,
  height = 0,
  onPick,
}: {
  rect: Rect;
  color: string;
  height?: number;
  onPick: (point: { x: number; z: number }) => void;
}) {
  const centre = rectCentre(rect);
  return (
    <mesh
      position={[centre.x, height, centre.z]}
      rotation-x={-Math.PI / 2}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onPick({ x: event.point.x, z: event.point.z });
      }}
    >
      <planeGeometry args={[rect.w, rect.d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
