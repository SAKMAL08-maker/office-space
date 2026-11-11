"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PresenceReply } from "@/server/presence";
import type { Cell } from "@/world/layout";
import type { LivePerson } from "@/world/people";

/** How often an open, visible tab reports in. Away is two minutes of silence, set on the server. */
export const PRESENCE_INTERVAL_MS = 10_000;

/** The reply after JSON, where dates arrive as text. */
type SentReply = Omit<PresenceReply, "people"> & {
  people: (Omit<LivePerson, "workingOn"> & {
    workingOn: (Omit<NonNullable<LivePerson["workingOn"]>, "since"> & { since: string }) | null;
  })[];
};

const readPeople = (reply: SentReply): LivePerson[] =>
  reply.people.map((person) => ({
    ...person,
    workingOn: person.workingOn && {
      ...person.workingOn,
      since: new Date(person.workingOn.since),
    },
  }));

/**
 * Reports "still here" every few seconds while the tab is visible, and returns everyone checked in.
 * A hidden tab sends nothing, which is what lets someone show as away. When the floor's key changes,
 * the page fetches the floor again. If the person has been checked out, from another tab for
 * example, the page refreshes and falls back to the lobby.
 *
 * Pass floorKey null on pages without the floor; they only say "still here".
 */
export function usePresence({
  enabled,
  floorKey,
  readSpot,
}: {
  enabled: boolean;
  floorKey: string | null;
  readSpot: () => Cell | null;
}): LivePerson[] | null {
  const router = useRouter();
  const [people, setPeople] = useState<LivePerson[] | null>(null);
  const busy = useRef(false);
  const refreshedFor = useRef<string | null>(null);

  const report = useEffectEvent(async () => {
    if (busy.current || document.visibilityState !== "visible") return;
    busy.current = true;
    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spot: readSpot() }),
        // The gate answers someone checked out with a redirect. Following it would only fetch a page.
        redirect: "manual",
        cache: "no-store",
      });
      if (response.type === "opaqueredirect") {
        router.refresh();
        return;
      }
      if (!response.ok) return;
      const reply = (await response.json()) as SentReply;
      setPeople(readPeople(reply));
      if (
        floorKey !== null &&
        reply.floorKey !== floorKey &&
        refreshedFor.current !== reply.floorKey
      ) {
        // Once per new key, so a slow refresh is not asked for again every few seconds.
        refreshedFor.current = reply.floorKey;
        router.refresh();
      }
    } catch {
      // A dropped connection: keep the last answer and try again on the next beat.
    } finally {
      busy.current = false;
    }
  });

  useEffect(() => {
    if (!enabled) return;
    // The first beat goes out straight away, the rest every few seconds.
    const first = setTimeout(() => void report(), 0);
    const timer = setInterval(() => void report(), PRESENCE_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void report();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);

  return enabled ? people : null;
}

/** For the office pages without the floor: keeps the person from showing as away while they read. */
export function StillHere() {
  usePresence({ enabled: true, floorKey: null, readSpot: () => null });
  return null;
}
