"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { CameraRig } from "./camera-rig";
import { colors } from "./colors";
import { Floor } from "./floor";
import { type Cell, layoutWorld, type OfficeInfo, toOfficeInput, type WorldLayout } from "./layout";
import { Lobby } from "./lobby";
import { Marker } from "./marker";
import { buildGrid, findPath, isOpen, nearestOpenCell } from "./path";
import { createWalker, type MachineKind, type MachineRequest, type Walker } from "./walk";
import { Walls } from "./walls";
import { Worker } from "./worker";

export type WorldProps = {
  /** Null before check-in: the server sends no floor until then. */
  offices: OfficeInfo[] | null;
  viewerId: string;
  /** A machine the page's buttons asked for. The character walks there, then uses it. */
  machineRequest: MachineRequest | null;
  onUseMachine: (kind: MachineKind) => void;
  /** A cubicle was clicked: the page shows its details. */
  onSelectCubicle: (projectId: string) => void;
};

/** The seat of the cubicle where the viewer is working, if they are. */
function workingSeat(layout: WorldLayout, offices: OfficeInfo[] | null, viewerId: string) {
  const mine = offices?.find((office) => office.ownerId === viewerId);
  const seat = mine?.cubicles.find((cubicle) => cubicle.workingSince)?.seat;
  const room = layout.offices.find((office) => office.ownerId === viewerId);
  return room?.cubicles.find((cubicle) => cubicle.seat === seat)?.spot ?? null;
}

/** The whole office in 3D: lobby, gate, floor and offices, with the person's own character. */
export default function World({
  offices,
  viewerId,
  machineRequest,
  onUseMachine,
  onSelectCubicle,
}: WorldProps) {
  // The layout only depends on names and seats. Keying it on them means a refresh that only
  // changes who is working keeps the same layout, so a walk under way is not dropped.
  const shape = JSON.stringify(offices?.map(toOfficeInput) ?? null);
  const layout = useMemo(() => layoutWorld(JSON.parse(shape)), [shape]);
  const grid = useMemo(() => buildGrid(layout), [layout]);
  const seat = workingSeat(layout, offices, viewerId);
  // One walker for the life of the page. The scene moves it every frame, outside React's renders.
  // Someone who reloads while working starts in their chair rather than in the lobby.
  const walker = useRef<Walker>(null);
  if (walker.current === null) walker.current = createWalker(seat ?? layout.start);

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

  // When the floor opens, closes or changes shape, a walk planned on the old layout is dropped,
  // and a character left standing somewhere that has gone returns to the lobby.
  // It comes before the machine effect below, because effects run in order: a machine button
  // pressed while the scene was still loading then starts its walk after this reset, not before.
  useEffect(() => {
    const current = walker.current;
    if (!current) return;
    current.path = [];
    current.goal = null;
    current.onArrive = null;
    const here = { x: Math.round(current.position.x), z: Math.round(current.position.z) };
    if (!isOpen(grid, here)) current.position.set(layout.start.x, 0, layout.start.z);
  }, [grid, layout]);

  const onMachineRequest = useEffectEvent(walkToMachine);
  useEffect(() => {
    if (machineRequest) onMachineRequest(machineRequest.kind);
  }, [machineRequest]);

  const pick = (point: { x: number; z: number }) => goTo(nearestOpenCell(grid, point));

  return (
    <Canvas camera={{ position: [layout.start.x, 15, layout.start.z + 8], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[colors.sky]} />
      <hemisphereLight args={["#ffffff", "#8a8f99", 1.6]} />
      <directionalLight position={[8, 16, 6]} intensity={1.4} />
      <Lobby layout={layout} onPick={pick} onMachine={walkToMachine} />
      <Floor
        layout={layout}
        offices={offices ?? []}
        viewerId={viewerId}
        onPick={pick}
        onGoTo={(cell) => goTo(cell)}
        onSelectCubicle={onSelectCubicle}
      />
      <Walls walls={layout.walls} />
      <Marker walker={walker} />
      <Worker walker={walker} personId={viewerId} seat={seat} />
      <CameraRig walker={walker} offices={layout.offices} />
    </Canvas>
  );
}
