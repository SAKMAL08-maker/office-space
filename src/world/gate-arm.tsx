import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { colors } from "./colors";

/** How far up the arm swings when open: nearly upright. */
const OPEN_ANGLE = Math.PI * 0.45;
const SWING_SPEED = 3;
const STRIPES = 6;

/**
 * A striped barrier arm hinged at its left end. It lies across the gate while shut and swings
 * up when the person checks in. A page that loads already checked in shows it up, not swinging.
 */
export function GateArm({ length, open }: { length: number; open: boolean }) {
  const hinge = useRef<Group>(null);
  const target = open ? OPEN_ANGLE : 0;
  // Only the first angle is passed to the scene. After that the frame loop turns it, since a
  // changed prop would snap the arm straight to its end.
  const [startAngle] = useState(target);

  useFrame((_, delta) => {
    const arm = hinge.current;
    if (!arm) return;
    const blend = 1 - Math.exp(-SWING_SPEED * Math.min(delta, 0.1));
    arm.rotation.z += (target - arm.rotation.z) * blend;
  });

  const stripe = length / STRIPES;
  return (
    <group ref={hinge} rotation-z={startAngle}>
      {Array.from({ length: STRIPES }, (_, index) => (
        <mesh key={index} position={[stripe * (index + 0.5), 0, 0]} castShadow>
          <boxGeometry args={[stripe, 0.12, 0.12]} />
          <meshStandardMaterial color={index % 2 === 0 ? colors.gateShut : colors.gateArmStripe} />
        </mesh>
      ))}
      {/* A short counterweight behind the hinge. */}
      <mesh position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.2, 0.18, 0.18]} />
        <meshStandardMaterial color={colors.gatePost} />
      </mesh>
    </group>
  );
}
