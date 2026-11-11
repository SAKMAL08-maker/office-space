import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { floorTexture, type Pattern } from "./floor-pattern";
import { type Rect, rectCentre } from "./layout";

/** A flat, clickable patch of floor covering a block of cells, with a pattern tinted its colour. */
export function Ground({
  rect,
  color,
  pattern,
  height = 0,
  onPick,
}: {
  rect: Rect;
  color: string;
  pattern: Pattern;
  height?: number;
  onPick: (point: { x: number; z: number }) => void;
}) {
  const centre = rectCentre(rect);
  const { x, z, w, d } = rect;
  // Cells are centred on whole numbers, so a block's edges sit half a cell out.
  const texture = useMemo(
    () => floorTexture(pattern, { left: x - 0.5, front: z + d - 0.5, width: w, depth: d }),
    [pattern, x, z, w, d],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh
      position={[centre.x, height, centre.z]}
      rotation-x={-Math.PI / 2}
      receiveShadow
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onPick({ x: event.point.x, z: event.point.z });
      }}
    >
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} map={texture} roughness={0.9} />
    </mesh>
  );
}
