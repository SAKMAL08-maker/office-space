import { LocalTime } from "./local-time";

export type TimeLogEntry = {
  id: string;
  checkedInAt: Date;
  checkedOutAt: Date | null;
  name?: string;
};

/** Whole minutes, because the log is read by people rather than used for sums. */
export function formatDuration(from: Date, to: Date): string {
  const minutes = Math.floor((to.getTime() - from.getTime()) / 60_000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function TimeLogList({ entries }: { entries: TimeLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Nothing logged yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <div className="min-w-0 text-sm">
            {entry.name && <p className="text-base font-medium break-words">{entry.name}</p>}
            <p>
              In: <LocalTime value={entry.checkedInAt} />
            </p>
            <p>Out: {entry.checkedOutAt ? <LocalTime value={entry.checkedOutAt} /> : "Not yet"}</p>
          </div>
          <p className="font-medium">
            {entry.checkedOutAt
              ? formatDuration(entry.checkedInAt, entry.checkedOutAt)
              : "Checked in"}
          </p>
        </li>
      ))}
    </ul>
  );
}
