import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshStandardMaterial } from "three";
import type { Cell } from "./layout";
import { Label } from "./label";
import { colors } from "./colors";
import { MachineIcon, type MachineIconKind } from "./machine-icon";
import { clickable } from "./pointer";

const BASE = 0.1;
const BODY = 1.5;
/** The front face, towards the lobby (+z). */
const FRONT = 0.35;

/**
 * The cabinet both machines share: a plinth, a body with a cap, a screen in a bezel that gently
 * pulses so it looks switched on, an icon on the screen, a card slot with a lit strip, and a label.
 */
export function MachineBody({
  at,
  accent,
  icon,
  label,
  onUse,
}: {
  at: Cell;
  accent: string;
  icon: MachineIconKind;
  label: string;
  onUse: () => void;
}) {
  const screen = useRef<MeshStandardMaterial>(null);
  useFrame((state) => {
    if (screen.current) {
      screen.current.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 1.6) * 0.15;
    }
  });

  return (
    <group
      position={[at.x, 0, at.z]}
      onClick={(event) => {
        event.stopPropagation();
        onUse();
      }}
      {...clickable}
    >
      <mesh position={[0, BASE / 2, 0]} receiveShadow>
        <boxGeometry args={[1.0, BASE, 0.8]} />
        <meshStandardMaterial color={colors.machineTrim} />
      </mesh>
      <mesh position={[0, BASE + BODY / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, BODY, 0.7]} />
        <meshStandardMaterial color={colors.machineBody} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, BASE + BODY + 0.03, 0]} castShadow>
        <boxGeometry args={[0.96, 0.06, 0.76]} />
        <meshStandardMaterial color={colors.machineTrim} />
      </mesh>
      <group position={[0, 1.17, FRONT]}>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.7, 0.55, 0.02]} />
          <meshStandardMaterial color={colors.machineTrim} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[0.6, 0.45, 0.01]} />
          <meshStandardMaterial ref={screen} color={accent} emissive={accent} />
        </mesh>
        <group position={[0, 0, 0.035]}>
          <MachineIcon kind={icon} />
        </group>
      </group>
      {/* The card slot, with a strip of the machine's colour beneath it. */}
      <mesh position={[0, 0.7, FRONT + 0.015]}>
        <boxGeometry args={[0.32, 0.04, 0.03]} />
        <meshStandardMaterial color={colors.slot} />
      </mesh>
      <mesh position={[0, 0.63, FRONT + 0.01]}>
        <boxGeometry args={[0.32, 0.03, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
      </mesh>
      <Label text={label} position={[0, 2.1, 0]} />
    </group>
  );
}
