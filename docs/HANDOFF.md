# Handoff — 2026-11-10

## Where things stand

PR 0 (Foundation, #1), PR 1 (Accounts, #3) and PR 2 (Attendance, #6, merge `9c614e4`, plus the check-out machine, #7, merge `aee536e`) are merged and live at https://office-space-tawny.vercel.app. Both migrations are applied to Neon through the Migrate production workflow.

People can log in, check in and out, and read their time log at `/time-log`. Admins see everyone's at `/admin/time-log` and manage people at `/admin/people`. Log out only appears after checking out. Until PR 4 adds the 3D lobby, two buttons on the home page stand in for the check-in and check-out machines.

`requireCheckedIn()` guards check-out and every Projects, Inbox and Sent page and action. **Every later office action must call it too.**

**How tasks work (owner's correction):** a task is a project offered to someone. It is called a task until the receiver accepts it, and then it becomes their project with one cubicle. Tasks never sit inside projects.

Merges to `main` deploy automatically. CI runs lint, format, typecheck, migrations, tests and build against a real Postgres.

## In progress

PR 3 (Work items) is built on `feat/work-items` and open for review. Its migration, `20261109193530_work_items.sql`, is not on production yet. The merged branches `feat/attendance` and `feat/check-out-machine` still exist, because deleting a branch needs the owner's say-so.

## Next steps

1. Owner reads the PR 3 SQL and says yes, then run `gh workflow run migrate.yml --ref feat/work-items`. This must happen before merging, or the new pages will fail.
2. Owner says "merge it", then tries the live site with two people: check in, send a task, accept it, and see the project in My projects.
3. Owner also tries the check-in and check-out machines live and opens My time log. This has not been confirmed yet.
4. Start PR 4 (3D world). See `docs/PLAN.md`.
5. For any later migration, show the owner the SQL, get a yes, then run `gh workflow run migrate.yml --ref <branch>` before merging.
6. Add Playwright to the repo when the first committed browser test is written. It is not installed yet.

## Open decisions (owner)

- At PR 6: whether preview deployments get their own Neon database. The owner chose to keep previews logged out until then, so leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether the check-out machine should ask for confirmation. It does not today, so a misclick checks someone out.
- Whether admins should be able to correct a logged time, for forgotten check-outs. Not built.

## Verified vs. not

- Tested: 76 Vitest tests in 7 files on a throwaway local Postgres 18, and on Postgres 17 in CI. Headless browser walk-through of accounts, both machines, the check-out prompt and both time logs on a local production build, at 1280px and 390px wide.
- Tested for PR 3: a two-person headless browser walk-through on a local production build, covering the check-in gate, sending up to the limit of 10, cancel, accept, reject with a reason, edit, finish and reopen, at 1280px and 390px wide.
- Tested live: the migration workflow succeeded for both migrations. `/setup` locked after first use. `/api/health` returned 200 after the last deploy, public sign-up returned 404, and a made-up login returned 401.
- Not verified: anything in PR 3 on the live site. Checking in and out on the live site. A direct query of the live tables, because Claude does not hold the database address. Invite and reset links on the live site. Preview deployments reaching a database.

## Watch out for

- Attendance never closes by itself (owner's decision), so a forgotten check-out keeps counting until the person checks out.
- Local browser tests: start the server with `node node_modules/next/dist/bin/next start`. Stopping an `npx next start` task leaves Node holding the port, so a later run silently tests the old build. This PC has no Postgres, so use a throwaway `embedded-postgres` outside the repo.
- A form empties itself after its action finishes, even when the server refuses. Work forms send the typed values back with the error so nothing is lost. A dropdown ignores a changed default, so it needs a changing `key`.
- Locking a person's row for seats or the task limit uses `no key update`. A plain `update` lock would also hold up unrelated inserts that refer to that person.
- In tests, a Next.js redirect's destination is in the error's `digest`, not its message.
- `vercel link` writes a `VERCEL_OIDC_TOKEN` to `.env.local` and appends `.vercel` and `.env*` to `.gitignore`, which cancels the `!.env.example` exception. This folder is already linked. If it is relinked, delete that file and run `git restore .gitignore`.
- Vercel settings only reach deployments built after they are added, so redeploy after changing one. Do not run `vercel env pull`, because it copies real secrets to this PC. `vercel env ls` shows names only.
- Agreed limits on the Vercel login: reading status and logs is automatic; redeploys and setting changes need the owner's yes.
- Secrets go in a separate PowerShell window, never through `!`. In the owner's PowerShell, `node -e` with brackets and quotes failed, so use PowerShell-only commands there.
- With `cacheComponents` on, anything reading cookies, headers, params or the database must sit inside `<Suspense>`. Read the request before touching `getAuth()`, so builds work without secrets.
- This Next.js keeps a visited page alive but hidden after an in-app move. Login and logout use a full page load so that no password or private page stays in the browser.
- The account tests empty every table, so they only run when the database name ends in `_test`. `@types/node` must stay at 24 or higher for Vitest.
- The login limit (3 tries in 10 seconds per address) is kept per server instance and is shared by everyone behind one office connection. PR 7 replaces it and adds protection against floods of traffic, within what the free plan allows.
- The app is on Vercel's free plan, which excludes commercial use. If a company starts relying on it, it needs Pro.
