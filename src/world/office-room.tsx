import { colors, WALL_HEIGHT } from "./colors";
import { Cubicle } from "./cubicle";
import { Ground } from "./ground";
import { type Cell, type OfficeLayout, rectCentre } from "./layout";
import { Label } from "./label";
import { clickable } from "./pointer";

/** One person's office: carpet, a name plate over the door, and a cubicle per active project. */
export function OfficeRoom({
  office,
  mine,
  onPick,
  onGoTo,
}: {
  office: OfficeLayout;
  mine: boolean;
  onPick: (point: { x: number; z: number }) => void;
  onGoTo: (cell: Cell) => void;
}) {
  const door = rectCentre(office.door);
  return (
    <group>
      {/* Raised a little above the floor, so the two never flicker into each other. */}
      <Ground
        rect={office.interior}
        color={mine ? colors.ownCarpet : colors.carpet}
        height={0.01}
        onPick={onPick}
      />
      <Ground rect={office.door} color={colors.officeFloor} height={0.01} onPick={onPick} />
      {/* The lintel over the door carries the name plate, and clicking it walks inside. */}
      <mesh
        position={[door.x, WALL_HEIGHT + 0.1, door.z]}
        onClick={(event) => {
          event.stopPropagation();
          onGoTo(office.doorStep);
        }}
        {...clickable}
      >
        <boxGeometry args={[office.door.w + 0.4, 0.2, 1]} />
        <meshStandardMaterial color={mine ? colors.checkIn : colors.panel} />
      </mesh>
      <Label
        text={mine ? `${office.name} (you)` : office.name}
        position={[door.x, WALL_HEIGHT + 0.7, door.z]}
        strong={mine}
      />
      {office.cubicles.map((cubicle) => (
        <Cubicle key={cubicle.seat} cubicle={cubicle} onUse={() => onGoTo(cubicle.spot)} />
      ))}
    </group>
  );
}
