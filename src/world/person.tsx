import { colors } from "./colors";
import { HIP_HEIGHT, SHIN, THIGH } from "./pose";

const SHOULDER_HEIGHT = 1.1;
const ARM = 0.42;

function Leg({ name, x }: { name: string; x: number }) {
  return (
    <group name={`hip${name}`} position={[x, HIP_HEIGHT, 0]}>
      <mesh position={[0, -THIGH / 2, 0]}>
        <boxGeometry args={[0.14, THIGH, 0.15]} />
        <meshStandardMaterial color={colors.trousers} />
      </mesh>
      <group name={`knee${name}`} position={[0, -THIGH, 0]}>
        <mesh position={[0, -SHIN / 2, 0]}>
          <boxGeometry args={[0.12, SHIN, 0.13]} />
          <meshStandardMaterial color={colors.trousers} />
        </mesh>
        <mesh position={[0, -SHIN + 0.03, 0.04]}>
          <boxGeometry args={[0.13, 0.06, 0.22]} />
          <meshStandardMaterial color={colors.shoes} />
        </mesh>
      </group>
    </group>
  );
}

function Arm({ name, x, shirt }: { name: string; x: number; shirt: string }) {
  return (
    <group name={`shoulder${name}`} position={[x, SHOULDER_HEIGHT, 0]}>
      <mesh position={[0, -ARM / 2 + 0.04, 0]}>
        <capsuleGeometry args={[0.06, ARM - 0.12, 4, 8]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <mesh position={[0, -ARM, 0]}>
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
    </group>
  );
}

/**
 * A person built from simple shapes, facing +z. The joints carry names, so posePerson can bend
 * them for standing, walking and sitting.
 */
export function Person({ shirt, hair }: { shirt: string; hair: string }) {
  return (
    <group name="body">
      <Leg name="L" x={0.1} />
      <Leg name="R" x={-0.1} />
      {/* Body: a rounded shirt, flattened front to back. */}
      <mesh position={[0, 0.84, 0]} scale={[1, 1, 0.62]} castShadow>
        <capsuleGeometry args={[0.21, 0.3, 4, 12]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      <Arm name="L" x={0.28} shirt={shirt} />
      <Arm name="R" x={-0.28} shirt={shirt} />
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.1, 10]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.2, 18, 14]} />
        <meshStandardMaterial color={colors.skin} />
      </mesh>
      {/* Hair covers the top and back of the head, so the face shows which way it looks. */}
      <mesh position={[0, 1.45, -0.02]} rotation={[-0.35, 0, 0]}>
        <sphereGeometry args={[0.215, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      {[0.07, -0.07].map((x) => (
        <mesh key={x} position={[x, 1.44, 0.18]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshStandardMaterial color={colors.eyes} />
        </mesh>
      ))}
    </group>
  );
}
