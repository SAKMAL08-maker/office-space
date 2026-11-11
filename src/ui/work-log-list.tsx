import { LocalTime } from "./local-time";
import { formatDuration } from "./time-log-list";

export type WorkLogEntry = { id: string; title: string; startedAt: Date; endedAt: Date | null };

/** The periods spent working at each project's cubicle, newest first. */
export function WorkLogList({ entries }: { entries: WorkLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No work logged yet. Press Start working here at one of your cubicles.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="min-w-0 text-sm">
            <p className="text-base font-medium break-words">{entry.title}</p>
            <p>
              From: <LocalTime value={entry.startedAt} />
            </p>
            <p>To: {entry.endedAt ? <LocalTime value={entry.endedAt} /> : "Not yet"}</p>
          </div>
          <p className="font-medium">
            {entry.endedAt ? formatDuration(entry.startedAt, entry.endedAt) : "Working now"}
          </p>
        </li>
      ))}
    </ul>
  );
}
