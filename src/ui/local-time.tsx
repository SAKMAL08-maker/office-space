"use client";

import { useSyncExternalStore } from "react";

const noChanges = () => () => {};

/** Times are stored in UTC and shown in the viewer's own time zone, which only the browser knows. */
export function LocalTime({ value }: { value: Date }) {
  const text = useSyncExternalStore(
    noChanges,
    () => value.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    () => "",
  );
  return <time dateTime={value.toISOString()}>{text}</time>;
}
