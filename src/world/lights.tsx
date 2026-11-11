import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { type DirectionalLight, Fog, Object3D } from "three";
import { colors } from "./colors";
import { type Rect, rectCentre } from "./layout";

/** Where the sun-like key light shines from, relative to the middle of the world. */
const KEY_FROM = [10, 18, 8] as const;
/** Screens narrower than this get a smaller shadow map: cheaper for phones. */
const PHONE_WIDTH = 640;

/**
 * The scene's light: a soft sky light, a warm key light that casts shadows, a cool fill from
 * the other side so nothing goes black, and a light fog that fades the far end of the floor.
 * The key light's shadow area is fitted to the whole world, so every room gets shadows.
 */
export function Lights({ bounds }: { bounds: Rect }) {
  const phone = useThree((state) => state.size.width < PHONE_WIDTH);
  const key = useRef<DirectionalLight>(null);
  const centre = rectCentre(bounds);
  const reach = Math.hypot(bounds.w, bounds.d) / 2 + 2;
  const mapSize = phone ? 1024 : 2048;

  // The light aims at this point. It has to be in the scene for its position to count.
  const target = useMemo(() => new Object3D(), []);

  // The shadow camera does not recompute its view by itself when its edges change.
  useLayoutEffect(() => {
    key.current?.shadow.camera.updateProjectionMatrix();
  }, [reach, mapSize]);

  // The fog starts further away when the camera rises (phones, or a big floor), so the
  // part of the office in view stays clear.
  useFrame(({ camera, scene }) => {
    if (!(scene.fog instanceof Fog)) return;
    scene.fog.near = camera.position.y * 2;
    scene.fog.far = camera.position.y * 5;
  });

  return (
    <>
      <fog attach="fog" args={[colors.sky, 30, 75]} />
      <hemisphereLight args={["#fff8ee", "#7c8290", 1.1]} />
      <primitive object={target} position={[centre.x, 0, centre.z]} />
      <directionalLight
        // A new map size needs a new shadow map, so the light is rebuilt when it changes.
        key={mapSize}
        ref={key}
        target={target}
        position={[centre.x + KEY_FROM[0], KEY_FROM[1], centre.z + KEY_FROM[2]]}
        color={colors.keyLight}
        intensity={2.1}
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={4}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={1}
        shadow-camera-far={Math.hypot(...KEY_FROM) + reach * 2}
      />
      <directionalLight position={[-10, 12, -6]} color={colors.fillLight} intensity={0.45} />
    </>
  );
}
