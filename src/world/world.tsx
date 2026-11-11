"use client";

import { Canvas } from "@react-three/fiber";
import { type Ref, useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef } from "react";
import { CameraRig } from "./camera-rig";
import { colors } from "./colors";
import { Floor } from "./floor";
import { type Cell, layoutWorld, type OfficeInfo, toOfficeInput, type WorldLayout } from "./layout";
import { Lights } from "./lights";
import { Lobby } from "./lobby";
import { Marker } from "./marker";
import { OtherPerson } from "./other-person";
import { buildGrid, findPath, isOpen, nearestOpenCell } from "./path";
import { type LivePerson, placePeople } from "./people";
import { Plant } from "./plant";
import { createWalker, type MachineKind, type MachineRequest, type Walker } from "./walk";
import { Walls } from "./walls";
import { Worker } from "./worker";

/** Lets the page ask where the viewer is, for presence, without the scene re-rendering every frame. */
export type SpotReader = { read: () => Cell };

export type WorldProps = {
  /** Null before check-in: the server sends no floor until then. */
  offices: OfficeInfo[] | null;
  viewerId: string;
  /** Everyone checked in, from presence. Null until the first answer arrives. */
  people: LivePerson[] | null;
  spotRef: Ref<SpotReader>;
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
  people,
  spotRef,
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

  // Where the viewer is heading, or standing, so other people see them walk to the same place.
  useImperativeHandle(spotRef, () => ({
    read() {
      const { goal, position } = walker.current!;
      return goal ?? { x: Math.round(position.x), z: Math.round(position.z) };
    },
  }));

  // Other people only appear once the floor is open, since their spots are on it.
  const others = layout.floor ? placePeople(layout, offices ?? [], people ?? [], viewerId) : [];
  const awayIds = new Set(people?.filter((person) => person.away).map((person) => person.id));

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
    <Canvas
      camera={{ position: [layout.start.x, 15, layout.start.z + 8], fov: 45 }}
      dpr={[1, 2]}
      shadows="percentage"
    >
      <color attach="background" args={[colors.sky]} />
      <Lights bounds={layout.bounds} />
      <Lobby layout={layout} onPick={pick} onMachine={walkToMachine} />
      {layout.plants.map((plant, index) => (
        <Plant key={`${plant.x},${plant.z}`} at={plant} variant={index} />
      ))}
      <Floor
        layout={layout}
        offices={offices ?? []}
        viewerId={viewerId}
        awayIds={awayIds}
        onPick={pick}
        onGoTo={(cell) => goTo(cell)}
        onSelectCubicle={onSelectCubicle}
      />
      <Walls walls={layout.walls} />
      <Marker walker={walker} />
      <Worker walker={walker} personId={viewerId} seat={seat} />
      {others.map((person) => (
        <OtherPerson key={person.id} person={person} grid={grid} />
      ))}
      <CameraRig walker={walker} offices={layout.offices} />
    </Canvas>
  );
}
