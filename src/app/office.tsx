"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useRef, useState, useSyncExternalStore } from "react";
import type { Floor } from "@/server/floor";
import { quietButtonClass } from "@/ui/form-parts";
import type { OfficeInfo } from "@/world/layout";
import { withLiveWork } from "@/world/people";
import type { MachineKind, MachineRequest } from "@/world/walk";
import type { SpotReader } from "@/world/world";
import { CubiclePanel } from "./cubicle-panel";
import { Machines, useMachines } from "./machines";
import { PeopleList } from "./people-list";
import { usePresence } from "./presence";

function SceneMessage({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-full items-center justify-center text-sm text-zinc-300">{children}</p>
  );
}

// The scene only runs in the browser, so it is left out of the server's first render.
const World = dynamic(() => import("@/world/world"), {
  ssr: false,
  loading: () => <SceneMessage>Loading the office…</SceneMessage>,
});

function browserCanDraw3D(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

let can3D: boolean | undefined;
const noChanges = () => () => {};

/** True or false in the browser, null on the server, where there is no way to tell. */
function useCan3D(): boolean | null {
  return useSyncExternalStore(
    noChanges,
    () => (can3D ??= browserCanDraw3D()),
    () => null,
  );
}

type OfficeProps = {
  viewerId: string;
  checkedIn: boolean;
  floor: Floor | null;
  greeting: ReactNode;
  menu: ReactNode;
};

/** The home page: the 3D office with a menu over it, or plain buttons where 3D cannot run. */
export function Office(props: OfficeProps) {
  const can3D = useCan3D();
  if (can3D === false) return <PlainOffice {...props} />;
  // Until the browser has been checked, the scene's frame shows with a loading message.
  return <OfficeScene {...props} ready={can3D === true} />;
}

/** Without 3D: the machines as buttons, and once checked in, the list of who is in. */
function PlainOffice({ viewerId, checkedIn, floor, greeting, menu }: OfficeProps) {
  // There is no place to send, so this only says "still here".
  const people = usePresence({
    enabled: floor !== null,
    floorKey: floor?.key ?? null,
    readSpot: () => null,
  });
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Office Space</h1>
      {greeting}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This browser cannot show the 3D office, so here are the machines as buttons.
      </p>
      <Machines checkedIn={checkedIn} />
      <div className="flex flex-wrap justify-center gap-2">{menu}</div>
      {floor && (
        <div className="w-full max-w-md rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <PeopleList people={people} viewerId={viewerId} />
        </div>
      )}
    </div>
  );
}

/** The selected cubicle's latest details, looked up again on every refresh, or null if it has gone. */
function findCubicle(offices: OfficeInfo[] | null, projectId: string | null) {
  for (const office of offices ?? []) {
    const cubicle = office.cubicles.find((c) => c.projectId === projectId);
    if (cubicle) return { cubicle, office };
  }
  return null;
}

function OfficeScene({
  viewerId,
  checkedIn,
  floor,
  greeting,
  menu,
  ready,
}: OfficeProps & { ready: boolean }) {
  const { checkIn, checkOut, pending, messages } = useMachines(checkedIn);
  const [machineRequest, setMachineRequest] = useState<MachineRequest | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const spot = useRef<SpotReader>(null);
  const people = usePresence({
    enabled: floor !== null,
    floorKey: floor?.key ?? null,
    readSpot: () => spot.current?.read() ?? null,
  });
  // Other people's glows follow presence, so they change within seconds instead of on a reload.
  const offices = floor && withLiveWork(floor.offices, people, viewerId);
  const selected = findCubicle(offices, selectedId);

  const goToMachine = (kind: MachineKind) =>
    setMachineRequest((previous) => ({ kind, id: (previous?.id ?? 0) + 1 }));
  const pressMachine = (kind: MachineKind) => (kind === "checkIn" ? checkIn() : checkOut());

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#20242c]">
      {/* Touches on the scene are for walking: the browser must not scroll or zoom the page with them. */}
      <div className="absolute inset-0 touch-none">
        {ready && (
          <World
            offices={offices}
            viewerId={viewerId}
            people={people}
            spotRef={spot}
            machineRequest={machineRequest}
            onUseMachine={pressMachine}
            onSelectCubicle={setSelectedId}
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
        {/* It never grows past the screen: an open menu scrolls inside itself instead. */}
        <div className="pointer-events-auto mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-3xl flex-col gap-2 overflow-y-auto rounded-xl border border-zinc-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <h1 className="text-base font-semibold tracking-tight">Office Space</h1>
              <div className="hidden sm:block">{greeting}</div>
            </div>
            {/* On a phone, everything but the two machines waits behind this button. */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="office-menu"
              className={`${quietButtonClass} sm:hidden`}
            >
              {menuOpen ? "Close menu" : "Menu"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goToMachine("checkIn")}
              disabled={pending}
              className={`${quietButtonClass} flex-1 sm:flex-none`}
            >
              <span className="sm:hidden">Check-in machine</span>
              <span className="hidden sm:inline">Go to check-in machine</span>
            </button>
            <button
              type="button"
              onClick={() => goToMachine("checkOut")}
              disabled={pending || !checkedIn}
              className={`${quietButtonClass} flex-1 sm:flex-none`}
            >
              <span className="sm:hidden">Check-out machine</span>
              <span className="hidden sm:inline">Go to check-out machine</span>
            </button>
            {/* On wide screens this wrapper steps aside, so its buttons sit in the row above. */}
            <div
              id="office-menu"
              className={`${menuOpen ? "flex" : "hidden"} w-full flex-col gap-2 sm:contents`}
            >
              <div className="text-sm sm:hidden">{greeting}</div>
              <div className="flex flex-wrap gap-2 sm:contents">
                {floor && (
                  <button
                    type="button"
                    onClick={() => setShowPeople((shown) => !shown)}
                    aria-expanded={showPeople}
                    className={quietButtonClass}
                  >
                    {/* Not "People", which is the admin's page of accounts in the same menu. */}
                    {showPeople
                      ? "Hide who's in"
                      : `Who's in${people ? ` (${people.length})` : ""}`}
                  </button>
                )}
                {menu}
              </div>
            </div>
          </div>
          {floor && showPeople && (
            <div className={menuOpen ? "" : "hidden sm:block"}>
              <PeopleList people={people} viewerId={viewerId} />
            </div>
          )}
          {pending && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Using the machine…</p>
          )}
          {messages}
        </div>
      </div>
      {selected ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3">
          <CubiclePanel
            key={selected.cubicle.projectId}
            cubicle={selected.cubicle}
            ownerName={selected.office.name}
            mine={selected.office.ownerId === viewerId}
            onClose={() => setSelectedId(null)}
          />
        </div>
      ) : (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
          <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-center text-xs text-white">
            <span className="pointer-coarse:hidden">
              Click the floor to walk there. Click a machine, a door or a desk to go to it.
            </span>
            <span className="hidden pointer-coarse:inline">
              Tap the floor to walk there. Tap a machine, a door or a desk to go to it.
            </span>
          </span>
        </p>
      )}
    </div>
  );
}
