import { CheckInMachine } from "./check-in-machine";
import { CheckOutMachine } from "./check-out-machine";
import { colors } from "./colors";
import { Gate } from "./gate";
import { Ground } from "./ground";
import type { WorldLayout } from "./layout";
import type { MachineKind } from "./walk";

/** The lobby: where everyone arrives, with the two machines either side of the gate. */
export function Lobby({
  layout,
  onPick,
  onMachine,
}: {
  layout: WorldLayout;
  onPick: (point: { x: number; z: number }) => void;
  onMachine: (kind: MachineKind) => void;
}) {
  return (
    <group>
      <Ground rect={layout.lobby} color={colors.lobbyFloor} onPick={onPick} />
      <Ground rect={layout.gate} color={colors.lobbyFloor} onPick={onPick} />
      <CheckInMachine at={layout.machines.checkIn.at} onUse={() => onMachine("checkIn")} />
      <CheckOutMachine at={layout.machines.checkOut.at} onUse={() => onMachine("checkOut")} />
      <Gate gate={layout.gate} open={layout.gateOpen} />
    </group>
  );
}
