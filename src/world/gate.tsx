import { colors, WALL_HEIGHT } from "./colors";
import { GateArm } from "./gate-arm";
import { type Rect, rectCentre } from "./layout";
import { Label } from "./label";

const POST_HEIGHT = WALL_HEIGHT * 1.5;
const ARM_HEIGHT = 0.85;

/**
 * The way from the lobby onto the floor: two capped posts, glass wings that lead people in from
 * the lobby, and a barrier arm that lies across until the person checks in, then swings up.
 * A lamp on the right post shows red while shut and green once open.
 */
export function Gate({ gate, open }: { gate: Rect; open: boolean }) {
  const centre = rectCentre(gate);
  const postX = gate.w / 2 + 0.1;
  const lamp = open ? colors.lampOpen : colors.lampShut;
  return (
    <group position={[centre.x, 0, centre.z]}>
      {[-postX, postX].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, POST_HEIGHT / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, POST_HEIGHT, 1.05]} />
            <meshStandardMaterial color={colors.gatePost} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, POST_HEIGHT + 0.04, 0]} castShadow>
            <boxGeometry args={[0.28, 0.08, 1.12]} />
            <meshStandardMaterial color={colors.machineTrim} />
          </mesh>
          {/* A glass wing on the lobby side, in line with the post, clear of anyone walking by. */}
          <mesh position={[0, 0.55, 0.9]}>
            <boxGeometry args={[0.04, 0.9, 0.8]} />
            <meshStandardMaterial
              color={colors.glass}
              transparent
              opacity={0.35}
              roughness={0.1}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[postX, POST_HEIGHT + 0.16, 0.3]}>
        <sphereGeometry args={[0.09, 14, 10]} />
        <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={1.2} />
      </mesh>
      <group position={[-gate.w / 2, ARM_HEIGHT, 0]}>
        <GateArm length={gate.w} open={open} />
      </group>
      {!open && <Label text="Check in to enter" position={[0, 1.9, 0]} />}
    </group>
  );
}
