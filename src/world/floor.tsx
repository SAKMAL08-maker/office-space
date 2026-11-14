import { colors } from "./colors";
import { Ground } from "./ground";
import type { Cell, OfficeInfo, WorldLayout } from "./layout";
import { OfficeRoom } from "./office-room";

/** The office floor behind the gate. It only exists once the person has checked in. */
export function Floor({
  layout,
  offices,
  viewerId,
  awayIds,
  pictureIds,
  onPick,
  onGoTo,
  onSelectCubicle,
}: {
  layout: WorldLayout;
  offices: OfficeInfo[];
  viewerId: string;
  /** People checked in whose tabs have gone quiet. */
  awayIds: ReadonlySet<string>;
  /** Each checked-in person's picture, for the signs over their cubicles. */
  pictureIds: ReadonlyMap<string, string | null>;
  onPick: (point: { x: number; z: number }) => void;
  onGoTo: (cell: Cell) => void;
  onSelectCubicle: (projectId: string) => void;
}) {
  if (!layout.floor) return null;
  const byOwner = new Map(offices.map((info) => [info.ownerId, info]));
  return (
    <group>
      <Ground rect={layout.floor} color={colors.officeFloor} pattern="planks" onPick={onPick} />
      {layout.offices.map((office) => (
        <OfficeRoom
          key={office.ownerId}
          office={office}
          info={byOwner.get(office.ownerId)}
          viewerId={viewerId}
          ownerAway={awayIds.has(office.ownerId)}
          ownerPictureId={pictureIds.get(office.ownerId) ?? null}
          onPick={onPick}
          onGoTo={onGoTo}
          onSelectCubicle={onSelectCubicle}
        />
      ))}
    </group>
  );
}
