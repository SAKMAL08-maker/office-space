import { colors } from "./colors";
import type { Cell } from "./layout";
import { MachineBody } from "./machine-body";

export function CheckOutMachine({ at, onUse }: { at: Cell; onUse: () => void }) {
  return <MachineBody at={at} accent={colors.checkOut} label="Check-out machine" onUse={onUse} />;
}
