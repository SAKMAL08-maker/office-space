import { colors } from "./colors";
import type { Cell } from "./layout";
import { MachineBody } from "./machine-body";

export function CheckInMachine({ at, onUse }: { at: Cell; onUse: () => void }) {
  return <MachineBody at={at} accent={colors.checkIn} label="Check-in machine" onUse={onUse} />;
}
