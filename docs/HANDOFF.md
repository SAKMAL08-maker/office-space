# Handoff — 2026-11-10

## Where things stand

PRs 0 to 3 are merged and live at https://office-space-tawny.vercel.app: Foundation (#1), Accounts (#3), Attendance (#6, plus the check-out machine, #7) and Work items (#9, merge `e2fa411`). All three migrations are applied to Neon through the Migrate production workflow.

People can log in, check in and out, and read their time log. Once checked in, they can send tasks (Sent tasks), accept or reject them (Inbox, with a count on the home page), and create, edit, finish and reopen projects (My projects). Admins also have Everyone's time log and People. Until PR 4 adds the 3D lobby, buttons on the home page stand in for the machines.

**How tasks work (owner's correction):** a task is a project offered to someone. It becomes their project, with one cubicle, only if they accept it. Tasks never sit inside projects. At most 10 can be waiting from one sender to one receiver.

`requireCheckedIn()` guards check-out and every Projects, Inbox and Sent page and action. **Every later office action must call it too.** Merges to `main` deploy automatically. CI runs lint, format, typecheck, migrations, tests and build against a real Postgres.

## In progress

Only this wrap-up docs PR. Nothing is half-built.

## Next steps

1. Owner tries PR 3 live with two people: check in, send a task, accept it, and see the project in My projects. Also try both machines and My time log, which is not confirmed live either.
2. Start PR 4 (3D world): lobby, machines, floor, offices, click-to-walk. See `docs/PLAN.md`. Cubicles have a `seat` number per office for the scene to use.
3. For any later migration, show the owner the SQL, get a yes, then run `gh workflow run migrate.yml --ref <branch>` before merging.
4. Add Playwright to the repo when the first committed browser test is written. It is not installed yet.

## Open decisions (owner)

- Whether to delete the 9 merged branches (all fully in `main`). Claude explained it is safe with `git branch -d`; the owner has not said yes yet.
- At PR 6: whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether the check-out machine should ask for confirmation, and whether admins can correct a logged time. Neither is built.

## Verified vs. not

- Tested: 76 Vitest tests in 7 files, locally on a throwaway Postgres 18 and in CI. Two-person headless browser walk-throughs on a local production build at 1280px and 390px wide, covering accounts, both machines, time logs, and all of PR 3 (gate, limit of 10, cancel, accept, reject, edit, finish, reopen).
- Tested live: all migration runs succeeded. After the PR 3 deploy, `/api/health` returned 200 and the new pages loaded.
- Not verified: using any feature while logged in on the live site. A direct query of the live tables, because Claude does not hold the database address. Invite and reset links live. Preview deployments reaching a database.

## Watch out for

- Local browser tests: start the server with `node node_modules/next/dist/bin/next start`, not `npx`, which leaves Node holding the port. This PC has no Postgres, so use a throwaway `embedded-postgres` outside the repo. Playwright works with `channel: "msedge"`, with no browser download.
- Name migrations with `npx drizzle-kit generate --name=<topic>`, or they get a random name.
- Forms empty themselves after their action, even on a refusal. Work forms send the typed values back with the error. A dropdown needs a changing `key` to show a new default.
- Row locks for seats and the task limit use `no key update`, so unrelated inserts that refer to that person are not held up.
- With `cacheComponents` on, anything reading cookies, headers, params or the database must sit inside `<Suspense>`. Read the request before touching `getAuth()`, so builds work without secrets.
- This Next.js keeps visited pages alive but hidden. Login and logout use a full page load. In tests, a redirect's destination is in the error's `digest`.
- `vercel link` writes a token to `.env.local` and breaks `.gitignore`; if relinked, delete that file and run `git restore .gitignore`. Never run `vercel env pull`. Vercel setting changes need a redeploy and the owner's yes.
- Secrets go in a separate PowerShell window, never through `!`. The account tests empty every table, so they only run on a database whose name ends in `_test`.
- Attendance never closes by itself. The login limit is per server instance until PR 7. Vercel's free plan excludes commercial use.
