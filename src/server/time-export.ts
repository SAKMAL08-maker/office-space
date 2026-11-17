/**
 * Builds the time log CSV on the spot. Nothing is stored: the admin's download is the only copy.
 * Pure functions, so the tests can check the exact text without a server.
 */

export type ExportRow = {
  name: string;
  email: string;
  checkedInAt: Date;
  checkedOutAt: Date | null;
};

/** Excel reads the file as UTF-8 only when it starts with this mark, so accented names survive. */
const BOM = "﻿";

/** A cell starting with one of these could run as a formula when the file is opened. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** The browser's time zone if it is a real one, otherwise UTC. */
export function exportTimeZone(requested: string | null): string {
  if (!requested) return "UTC";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: requested }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Every cell is quoted, inner quotes doubled, and a formula start is turned into plain text. */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** "2026-11-17 09:05", a form spreadsheets read as a date and time. */
export function formatExportTime(value: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/** Whole minutes, the same rounding as the time log page. */
function minutesBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 60_000);
}

export function buildTimeLogCsv(rows: ExportRow[], timeZone: string): string {
  const header = [
    "Name",
    "Email",
    `Checked in (${timeZone})`,
    `Checked out (${timeZone})`,
    "Minutes",
  ];
  const lines = rows.map((row) => [
    row.name,
    row.email,
    formatExportTime(row.checkedInAt, timeZone),
    row.checkedOutAt ? formatExportTime(row.checkedOutAt, timeZone) : "",
    row.checkedOutAt ? String(minutesBetween(row.checkedInAt, row.checkedOutAt)) : "",
  ]);
  return (
    BOM + [header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}

/** "time-log-2026-11-17.csv", dated in the admin's own time zone. */
export function exportFileName(now: Date, timeZone: string): string {
  return `time-log-${formatExportTime(now, timeZone).slice(0, 10)}.csv`;
}
