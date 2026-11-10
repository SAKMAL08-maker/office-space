import { colors } from "./colors";
import { Ground } from "./ground";
import type { Cell, WorldLayout } from "./layout";
import { OfficeRoom } from "./office-room";

/** The office floor behind the gate. It only exists once the person has checked in. */
export function Floor({
  layout,
  viewerId,
  onPick,
  onGoTo,
}: {
  layout: WorldLayout;
  viewerId: string;
  onPick: (point: { x: number; z: number }) => void;
  onGoTo: (cell: Cell) => void;
}) {
  if (!layout.floor) return null;
  return (
    <group>
      <Ground rect={layout.floor} color={colors.officeFloor} onPick={onPick} />
      {layout.offices.map((office) => (
        <OfficeRoom
          key={office.ownerId}
          office={office}
          mine={office.ownerId === viewerId}
          onPick={onPick}
          onGoTo={onGoTo}
        />
      ))}
    </group>
  );
}
