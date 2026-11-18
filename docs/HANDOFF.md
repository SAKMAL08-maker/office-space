# Handoff — 2026-11-18

## Where things stand

PRs 0 to 5c, the cubicle-row fix, PR 6a Attachments (#22), PR 6b Profile pictures (#24) and **PR 6c CSV export** (#26, merge `cbc016d`) are merged; the app is at https://office-space-tawny.vercel.app. CI on `main` passed for `cbc016d`, Vercel reported the deploy complete, `/api/health` returned `{"ok":true}`, and logged out, `/admin/time-log/csv` sends visitors to log in. 6c had no migration.

People can log in, check in and out, send and answer tasks, manage projects in a 3D office with presence, attach project files and set a profile picture (see `docs/PLAN.md`). New in 6c: Everyone's time log has a Download CSV button. `GET /admin/time-log/csv?tz=<zone>` calls `requireAdmin()`, reads every record oldest first (`listTimeLogForExport()` in `src/server/attendance.ts`) and builds the file in `src/server/time-export.ts`: Name, Email, Checked in, Checked out, Minutes, in the browser's time zone (UTC if unknown), every cell quoted, formula starts made safe with `'`, a UTF-8 mark first. Nothing is stored.

`requireCheckedIn()` guards every office action, page and API route. **Every later office action must call it too.** Account things (time log, profile, pictures, the CSV) need only `requireUser()` or `requireAdmin()`.

## In progress

- This wrap-up: branch `docs/wrap-up-csv` (handoff, session log, plan status), as its own small docs PR.
- Merged branch `feat/time-log-csv` was kept on GitHub, because deleting merged branches is still the owner's open decision.

## Next steps

1. Owner: on the live site, download the CSV and open it in Excel or Google Sheets.
2. PR 7 hardening: login rate limits, protection against traffic floods, phone layout, security review, and Playwright in the repo with the first committed browser test.
3. Still open from before: a live picture upload; the owner's live check of the 5c look, the gate swing, an office with 6 or more projects, and a real phone.

## Open decisions (owner)

- Confirm or change Claude's PR 6c choices in `docs/decisions.md` (the columns, the formula guard, admin without a check-in) and PR 6b choices (20 MB chosen file, 3 uploads at once, 10-minute cleanup, black or white initials, `users.image` unused).
- One-line reasons for `docs/decisions.md`: the four PR 6 choices; and from before: polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, PR 5c, the cubicle-row fix, PR 6a, PR 6b and PR 6c.
- Whether the bucket's Lifecycle is set to "Keep only the last version" (not confirmed).
- Whether to delete merged branches on GitHub; whether check-out asks for confirmation, admins can correct a logged time, and Everyone's time log (or the CSV) shows work periods.

## Verified vs. not

- Tested (6c): 181 Vitest tests in 17 files against a throwaway Postgres, none skipped (11 new), lint, format, typecheck, build, and CI on #26 and on `main`. Live: health, and logged-out CSV sent to log in.
- Rendered (local server, throwaway database): Everyone's time log at desktop and phone width; the real button downloaded `time-log-2026-11-17.csv` with Manila times, the formula guard and the UTF-8 mark.
- Not verified: the CSV opened in Excel or Google Sheets, an admin download on the live site, Safari. From 6b: a live picture upload, iPhone photos (HEIC), a slow phone. From 6a: a 25 MB file, files on Sent between two real accounts. From before: real phones and graphics cards, many people at once, two tabs of one person, invite and reset links live.

## Watch out for

- **Production migrations run from the PR branch:** `gh workflow run migrate.yml --ref <PR branch>`, before merging. Without `--ref` it uses `main` and still says "migrations applied successfully" while changing nothing.
- **`/merge-it` can only be typed by the owner**; Claude cannot start it. Its `--delete-branch` step is skipped until the owner decides on deleting merged branches.
- **Permission prompts:** `.claude/settings.local.json` allows `git *`, `npm *`, `gh pr *` and a few more by prefix, so run those as separate simple commands. Installing test tools in the temp folder asks the owner first.
- **Local browser tests:** `embedded-postgres` and Playwright in the session's temp folder (gone after the session), Postgres on port 54339, `channel: "msedge"`. Port 3000 may be the owner's own server; use 3001 for checks that skip the bucket (the bucket's CORS rule allows only 3000). Stopping a background `npx next start` leaves the node process holding the port, so stop it by port too. Wait for `networkidle` plus a moment before filling forms, or `/setup` refuses the token; on the 3D home page use `load`. `/setup` needs a `SETUP_TOKEN` of 24+ characters. Check-in is a 3D machine, so add test records straight into the throwaway database.
- **Backblaze:** `.env.local` holds only the four `B2_` settings; Claude never reads it. A real-bucket run once timed out reaching Backblaze; rerunning worked.
- Working copies use Windows line endings (`core.autocrlf`). `gh pr create` needs `--body-file`. Vercel reports deploys as commit statuses (context `Vercel`).
- Account tests empty every table: only on a database whose name ends in `_test`. 3D: walkers move inside `useFrame`; avoid HTML inside the canvas; three r187 needs `shadows="percentage"`.
- Never run `vercel env pull`. Secrets never go in the chat.
