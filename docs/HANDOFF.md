# Handoff — 2026-11-11

## Where things stand

PRs 0 to 4 are merged and live at https://office-space-tawny.vercel.app: Foundation (#1), Accounts (#3), Attendance (#6, plus the check-out machine, #7), Work items (#9), the PR 3 wrap-up docs (#10) and the 3D world (#11, merge `7b3d4c7`). All three migrations are applied to Neon through the Migrate production workflow. PR 4 had no migration. After its deploy, `/api/health` and the home page returned 200.

People can log in, check in and out, and read their time log. Once checked in, they can send tasks (Sent tasks), accept or reject them (Inbox, with a count on the home page), and create, edit, finish and reopen projects (My projects). Admins also have Everyone's time log and People.

The home page is a 3D office: a lobby with the two machines and a gate, then a floor of offices (one per person, name plate over the door) with one cubicle per active project, placed by `seat`. You click the floor to walk, and clicking a machine walks you there and uses it. The floor data comes from `getFloor()` in `src/server/floor.ts`, which calls `requireCheckedIn()` itself. Browsers without 3D get the old buttons. You see only your own character.

**How tasks work (owner's correction):** a task is a project offered to someone. It becomes their project, with one cubicle, only if they accept it. Tasks never sit inside projects. At most 10 can be waiting from one sender to one receiver.

`requireCheckedIn()` guards check-out and every Projects, Inbox and Sent page and action. **Every later office action must call it too.** Merges to `main` deploy automatically. CI runs lint, format, typecheck, migrations, tests and build against a real Postgres.

## In progress

Nothing. This wrap-up docs PR is the only open one. Nothing is half-built.

## Next steps

1. Owner tries the live site with two people: log in, walk to the check-in machine, see both offices and name plates, send a task, accept it, see the cubicle appear, walk into an office, then walk to the check-out machine. Also check My time log. None of this is confirmed live yet, and phones and real graphics cards are untested.
2. PR 5 (Cubicles live): details panel, start working, the occupied glow, presence of other people, and the "who's working" list. Cubicles in `src/world/cubicle.tsx` are ready for the glow and a click handler. Owner's direction after PR 4: what works comes first, but visual improvements are welcome when they fit. In each plan, say what the 3D will look like and which visual improvements are included.
3. For any later migration, show the owner the SQL, get a yes, then run `gh workflow run migrate.yml --ref <branch>` before merging.
4. Add Playwright to the repo when the first committed browser test is written. It is not installed yet.

## Open decisions (owner)

- Whether to delete the 11 merged branches (all fully in `main`). Claude explained it is safe with `git branch -d`; the owner has not said yes yet.
- At PR 6: whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether the check-out machine should ask for confirmation, and whether admins can correct a logged time. Neither is built.

## Verified vs. not

- Tested: 92 Vitest tests in 9 files, locally on a throwaway Postgres. Two-person headless browser walk-throughs on a local production build at 1280px and 390px wide, covering accounts, both machines, time logs, and all of PR 3 (gate, limit of 10, cancel, accept, reject, edit, finish, reopen).
- PR 4 tested locally before merging: layout, route finder, walking and the floor gate in Vitest. A headless Edge walk-through on a local production build (software 3D) at 1280px and 390px: lobby, no office names in the page before check-in, walking to each machine checks in and out, the floor opening, cubicles, walking into an office, a link away and back, the "still not checked out" question, and the plain-button fallback with 3D switched off. Screenshots were checked by eye. Not verified: real phones and touch, real graphics cards, or many offices at once.
- Tested live: all migration runs succeeded. After the PR 3 and PR 4 deploys, `/api/health` returned 200 and the pages loaded.
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
- 3D: headless Edge draws the scene only with `--use-angle=swiftshader --enable-unsafe-swiftshader`. Signs in the scene are pictures, not page text, so a browser test cannot find their words; check the menu text or the page data instead. Avoid HTML laid over the canvas (drei `Html`): it crashed when leaving the page.
- 3D: the React lint rules forbid changing state or props, so the walker lives in a ref and is moved inside `useFrame`. Walking never re-renders React.
- 3D: the menu sits over the top of the scene, so clicks there never reach the floor. On a phone it covers about a quarter of the screen.
