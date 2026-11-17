"use client";

import { useSyncExternalStore } from "react";
import { quietButtonClass } from "./form-parts";

const noChanges = () => () => {};

/**
 * A plain link rather than `Link`, so the page never prefetches the file. It carries the browser's
 * time zone, which the server cannot know, so the times in the file match what the admin sees.
 */
export function DownloadTimeLog() {
  const timeZone = useSyncExternalStore(
    noChanges,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );
  const href = timeZone
    ? `/admin/time-log/csv?tz=${encodeURIComponent(timeZone)}`
    : "/admin/time-log/csv";
  return (
    <a href={href} download className={quietButtonClass}>
      Download CSV
    </a>
  );
}
