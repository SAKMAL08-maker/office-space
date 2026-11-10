"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { CameraRig } from "./camera-rig";
import { colors } from "./colors";
import { Floor } from "./floor";
import { type Cell, layoutWorld, type OfficeInput } from "./layout";
import { Lobby } from "./lobby";
import { Marker } from "./marker";
import { buildGrid, findPath, isOpen, nearestOpenCell } from "./path";
import { createWalker, type MachineKind, type MachineRequest, type Walker } from "./walk";
import { Walls } from "./walls";
import { Worker } from "./worker";

export type WorldProps = {
  /** Null before check-in: the server sends no floor until then. */
  offices: OfficeInput[] | null;
  viewerId: string;
  /** A machine the page's buttons asked for. The character walks there, then uses it. */
  machineRequest: MachineRequest | null;
  onUseMachine: (kind: MachineKind) => void;
};

/** The whole office in 3D: lobby, gate, floor and offices, with the person's own character. */
export default function World({ offices, viewerId, machineRequest, onUseMachine }: WorldProps) {
  const layout = useMemo(() => layoutWorld(offices), [offices]);
  const grid = useMemo(() => buildGrid(layout), [layout]);
  // One walker for the life of the page. The scene moves it every frame, outside React's renders.
  const walker = useRef<Walker>(null);
  if (walker.current === null) walker.current = createWalker(layout.start);

  function goTo(goal: Cell | null, onArrive?: () => void) {
    const current = walker.current;
    if (!current || !goal) return;
    const from = nearestOpenCell(grid, current.position);
    const path = from && findPath(grid, from, goal);
    if (!path) return;
    current.path = path;
    current.goal = path.length > 0 ? goal : null;
    current.onArrive = onArrive ?? null;
  }

  const walkToMachine = (kind: MachineKind) =>
    goTo(layout.machines[kind].spot, () => onUseMachine(kind));

  const onMachineRequest = useEffectEvent(walkToMachine);
  useEffect(() => {
    if (machineRequest) onMachineRequest(machineRequest.kind);
  }, [machineRequest]);

  // When the floor opens or closes, a walk planned on the old layout is dropped,
  // and a character left standing somewhere that has gone returns to the lobby.
  useEffect(() => {
    const current = walker.current;
    if (!current) return;
    current.path = [];
    current.goal = null;
    current.onArrive = null;
    const here = { x: Math.round(current.position.x), z: Math.round(current.position.z) };
    if (!isOpen(grid, here)) current.position.set(layout.start.x, 0, layout.start.z);
  }, [grid, layout]);

  const pick = (point: { x: number; z: number }) => goTo(nearestOpenCell(grid, point));

  return (
    <Canvas camera={{ position: [layout.start.x, 15, layout.start.z + 8], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[colors.sky]} />
      <hemisphereLight args={["#ffffff", "#8a8f99", 1.6]} />
      <directionalLight position={[8, 16, 6]} intensity={1.4} />
      <Lobby layout={layout} onPick={pick} onMachine={walkToMachine} />
      <Floor layout={layout} viewerId={viewerId} onPick={pick} onGoTo={(cell) => goTo(cell)} />
      <Walls walls={layout.walls} />
      <Marker walker={walker} />
      <Worker walker={walker} />
      <CameraRig walker={walker} offices={layout.offices} />
    </Canvas>
  );
}
