import { colors, WALL_HEIGHT } from "./colors";
import { Cubicle } from "./cubicle";
import { Ground } from "./ground";
import { type Cell, type OfficeInfo, type OfficeLayout, rectCentre } from "./layout";
import { Label } from "./label";
import { clickable } from "./pointer";

/**
 * One person's office: carpet, a name plate over the door, and a cubicle per active project.
 * The name plate says "working", in the working colour, while its owner is working inside.
 */
export function OfficeRoom({
  office,
  info,
  viewerId,
  ownerAway,
  ownerPictureId,
  onPick,
  onGoTo,
  onSelectCubicle,
}: {
  office: OfficeLayout;
  info: OfficeInfo | undefined;
  viewerId: string;
  ownerAway: boolean;
  ownerPictureId: string | null;
  onPick: (point: { x: number; z: number }) => void;
  onGoTo: (cell: Cell) => void;
  onSelectCubicle: (projectId: string) => void;
}) {
  const mine = office.ownerId === viewerId;
  const door = rectCentre(office.door);
  const working = info?.cubicles.some((cubicle) => cubicle.workingSince) ?? false;
  return (
    <group>
      {/* Raised a little above the floor, so the two never flicker into each other. */}
      <Ground
        rect={office.interior}
        color={mine ? colors.ownCarpet : colors.carpet}
        pattern="carpet"
        height={0.01}
        onPick={onPick}
      />
      <Ground
        rect={office.door}
        color={colors.officeFloor}
        pattern="planks"
        height={0.01}
        onPick={onPick}
      />
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
      {/* One plate, so a separate badge cannot overlap the name when seen from far away. */}
      <Label
        text={`${office.name}${mine ? " (you)" : ""}${working ? " · working" : ""}`}
        position={[door.x, WALL_HEIGHT + 0.7, door.z]}
        tone={working ? "working" : mine ? "own" : "plain"}
      />
      {office.cubicles.map((cubicle) => {
        const details = info?.cubicles.find((c) => c.seat === cubicle.seat);
        return (
          <Cubicle
            key={cubicle.seat}
            cubicle={cubicle}
            info={details}
            owner={{ id: office.ownerId, name: office.name, pictureId: ownerPictureId }}
            ownerAway={ownerAway}
            onUse={() => {
              onGoTo(cubicle.spot);
              if (details) onSelectCubicle(details.projectId);
            }}
          />
        );
      })}
    </group>
  );
}
