import { colors } from "./colors";
import { Desk } from "./desk";
import { Label, type SignPerson } from "./label";
import { type CubicleInfo, type CubicleLayout, rectCentre } from "./layout";
import { Monitor } from "./monitor";
import { OfficeChair } from "./office-chair";
import { clickable } from "./pointer";
import { WorkGlow } from "./work-glow";

const LABEL_LENGTH = 32;

const shorten = (text: string) =>
  text.length > LABEL_LENGTH ? `${text.slice(0, LABEL_LENGTH - 1)}…` : text;

/** Fabric walls behind and beside the desk. They stay in the desk's row, clear of the walkway. */
function Partitions() {
  return (
    <group>
      <mesh position={[0, 0.6, -0.47]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 1.2, 0.06]} />
        <meshStandardMaterial color={colors.partition} />
      </mesh>
      <mesh position={[0, 1.22, -0.47]}>
        <boxGeometry args={[2.94, 0.04, 0.1]} />
        <meshStandardMaterial color={colors.partitionTrim} />
      </mesh>
      {[-1.42, 1.42].map((x) => (
        <mesh key={x} position={[x, 0.5, -0.03]} castShadow>
          <boxGeometry args={[0.05, 1.0, 0.86]} />
          <meshStandardMaterial color={colors.partition} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * One project's cubicle: partitions, a desk, a monitor and a chair on the seat cell in front.
 * While its owner works there, the floor glows, the screen lights up and a label shows their name
 * and the project, with "away" if their tab has gone quiet. Their character, drawn by the world,
 * sits in the chair. Clicking it walks there and opens its details.
 */
export function Cubicle({
  cubicle,
  info,
  owner,
  ownerAway,
  onUse,
}: {
  cubicle: CubicleLayout;
  info: CubicleInfo | undefined;
  owner: SignPerson;
  ownerAway: boolean;
  onUse: () => void;
}) {
  const desk = rectCentre(cubicle.desk);
  const working = Boolean(info?.workingSince);
  return (
    <group
      position={[desk.x, 0, desk.z]}
      onClick={(event) => {
        event.stopPropagation();
        onUse();
      }}
      {...clickable}
    >
      {working && (
        <group position={[0, 0, 0.5]}>
          <WorkGlow width={3} depth={2} />
        </group>
      )}
      <Partitions />
      <Desk />
      <group position={[0, 0, -0.22]}>
        <Monitor lit={working} />
      </group>
      {/* The chair stands on the seat cell, one cell in front of the desk, facing it. */}
      <group position={[0, 0, 1]}>
        <OfficeChair />
      </group>
      {working && info && (
        <Label
          text={`${owner.name}${ownerAway ? " · away" : ""} · ${shorten(info.title)}`}
          position={[0, 2.1, 0.3]}
          tone="working"
          person={owner}
        />
      )}
    </group>
  );
}
