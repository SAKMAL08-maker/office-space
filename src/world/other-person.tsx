import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import { type Group, Material, type Mesh } from "three";
import { colors, personColors } from "./colors";
import { Label } from "./label";
import { findPath, type Grid, nearestOpenCell } from "./path";
import type { PlacedPerson } from "./people";
import { Person } from "./person";
import { posePerson } from "./pose";
import { createWalker, stepWalker, type Walker } from "./walk";

const MAX_FRAME = 0.1;
const STEPS_PER_SECOND = 10;
const AWAY_OPACITY = 0.45;

/** Fades every part of the character, so someone away looks like a ghost of themselves. */
function fade(root: Group, away: boolean) {
  root.traverse((child) => {
    const material = (child as Mesh).material;
    if (!(material instanceof Material)) return;
    material.transparent = away;
    material.opacity = away ? AWAY_OPACITY : 1;
    material.needsUpdate = true;
  });
}

/**
 * Someone else who is checked in. Each new spot from presence becomes a walk there, so they move
 * rather than jump. They sit while on the chair of the cubicle where they work. Someone away is
 * grey and faded where they were last seen, with "away" on their label.
 */
export function OtherPerson({ person, grid }: { person: PlacedPerson; grid: Grid }) {
  const { id, name, pictureId, away, target, seat } = person;
  const { x, z } = target;
  const body = useRef<Group>(null);
  const figure = useRef<Group>(null);
  const label = useRef<Group>(null);
  // The first spot is where they appear. Later spots are walked to.
  const walker = useRef<Walker>(null);
  if (walker.current === null) walker.current = createWalker(target);
  const own = personColors(id);
  const shirt = away ? colors.awayShirt : own.shirt;
  const hair = away ? colors.awayHair : own.hair;

  useEffect(() => {
    const current = walker.current;
    if (!current) return;
    const goal = nearestOpenCell(grid, { x, z }) ?? { x, z };
    const from = nearestOpenCell(grid, current.position);
    const path = from && findPath(grid, from, goal);
    current.goal = null;
    current.onArrive = null;
    if (path) {
      current.path = path;
    } else {
      // Nowhere to walk from, or no way through: they simply appear there.
      current.path = [];
      current.position.set(goal.x, 0, goal.z);
    }
  }, [grid, x, z]);

  useLayoutEffect(() => {
    if (figure.current) fade(figure.current, away);
  }, [away]);

  useFrame((state, delta) => {
    const group = body.current;
    const current = walker.current;
    if (!group || !current) return;
    stepWalker(current, Math.min(delta, MAX_FRAME));
    const moving = current.path.length > 0;
    const sitting =
      !moving && seat !== null && current.position.x === seat.x && current.position.z === seat.z;
    const phase = state.clock.elapsedTime * STEPS_PER_SECOND;
    group.position.copy(current.position);
    group.position.y = moving ? Math.abs(Math.sin(phase)) * 0.04 : 0;
    group.rotation.y = sitting ? Math.PI : current.heading;
    posePerson(group, sitting ? "sit" : "stand", moving ? phase : null);
    // At their desk the cubicle's own label already names them, so theirs would only overlap it.
    if (label.current) label.current.visible = !sitting;
  });

  return (
    <group ref={body}>
      <group ref={figure}>
        <Person shirt={shirt} hair={hair} />
      </group>
      <group ref={label}>
        <Label
          text={away ? `${name} · away` : name}
          position={[0, 1.95, 0]}
          tone={away ? "away" : "plain"}
          person={{ id, name, pictureId }}
        />
      </group>
    </group>
  );
}
