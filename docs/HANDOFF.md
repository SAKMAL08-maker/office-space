# Handoff — 2026-11-11

## Where things stand

PRs 0 to 4 are merged and live at https://office-space-tawny.vercel.app: Foundation (#1), Accounts (#3), Attendance (#6, plus the check-out machine, #7), Work items (#9), the PR 3 wrap-up docs (#10), the 3D world (#11) and the PR 4 wrap-up docs (#12). The first three migrations are applied to Neon through the Migrate production workflow.

People can log in, check in and out, and read their time log. Once checked in, they can send tasks (Sent tasks), accept or reject them (Inbox, with a count on the home page), and create, edit, finish and reopen projects (My projects). Admins also have Everyone's time log and People.

The home page is a 3D office: a lobby with the two machines and a gate, then a floor of offices (one per person, name plate over the door) with one cubicle per active project, placed by `seat`. You click the floor to walk, and clicking a machine walks you there and uses it. The floor data comes from `getFloor()` in `src/server/floor.ts`, which calls `requireCheckedIn()` itself. Browsers without 3D get the old buttons. You see only your own character.

**How tasks work (owner's correction):** a task is a project offered to someone. It becomes their project, with one cubicle, only if they accept it. Tasks never sit inside projects. At most 10 can be waiting from one sender to one receiver.

`requireCheckedIn()` guards check-out and every Projects, Inbox and Sent page and action. **Every later office action must call it too.** Merges to `main` deploy automatically. CI runs lint, format, typecheck, migrations, tests and build against a real Postgres.

## In progress

PR 5a (Working), branch `feat/cubicles-working`, open for review. The owner split PR 5 into 5a and 5b.

- Clicking a cubicle walks there and opens a details panel (`src/app/cubicle-panel.tsx`): title, description, owner, sender, who is working. The owner gets Start working here / Stop working. My projects has the same buttons.
- New `work_sessions` table (`src/server/work.ts`). At most one open period per person, enforced by the database. Switching, Stop, check-out and Finish end it. Start and check-out lock the person, and Start and Finish lock the cubicle, so they cannot overlap.
- Occupied cubicle: floor glow, lit monitor, the person sitting, a "Name · Project" label, and the door plate reads "Name · working".
- New character (`person.tsx`, posed by `pose.ts`: walking legs and arms, sitting), desk, office chair, monitor and partitions, each its own component.
- My time log has a Work periods section.
- **Migration `20261111002001_work_sessions.sql` must be applied before merging**, through the Migrate production workflow, after the owner has read the SQL. The new code reads the table on the home page.

## Next steps

1. Owner reads the migration SQL, says yes, then `gh workflow run migrate.yml --ref feat/cubicles-working`, then merge PR 5a.
2. Owner tries the live site with two people: check in, start working in a cubicle, see the glow from the other account (after a reload, until 5b), check out, read My time log. Phones and real graphics cards are untested.
3. PR 5b (Presence): other people's characters, `/api/presence` every 10 seconds from visible tabs, away after 2 minutes, the "who's working" list. A working person's character should sit in their chair; in 5a `SeatedPerson` already draws them there from the work data.
4. Visual polish, as its own small PR after PR 5b: softer lighting and shadows, floor patterns, plants, nicer machines and gate. Not yet in `docs/PLAN.md`'s build order; add it there once the owner agrees where it goes.
5. Add Playwright to the repo when the first committed browser test is written. It is not installed yet.

## Open decisions (owner)

- Whether to delete the merged branches (all fully in `main`). Claude explained it is safe with `git branch -d`; the owner has not said yes yet.
- At PR 6: whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether the check-out machine should ask for confirmation, and whether admins can correct a logged time. Neither is built.
- Whether admins' Everyone's time log should also show work periods. Not built.

## Verified vs. not

- PR 5a tested locally: 104 Vitest tests in 11 files on a throwaway Postgres, including start/stop rules, owner-only and checked-in-only starts, two starts at once, check-out racing a start, finishing, and the floor data. A two-person headless Edge walk-through on a local production build (software 3D): setup, invite, check-in, task accepted, Start working from My projects, the other person's glow, label, seated character and door plate, starting and stopping from the panel, reloading while working (starts seated), the look-only panel for someone else's cubicle, check-out ending the period, and My time log. At 1280px and 390px. Screenshots checked by eye. No page errors.
- Earlier: two-person walk-throughs of PRs 2 to 4 at both widths. After the PR 3 and PR 4 deploys, `/api/health` returned 200 and the pages loaded.
- Not verified: anything while logged in on the live site, real phones and touch, real graphics cards, many offices at once, invite and reset links live, preview deployments reaching a database.

## Watch out for

- Local browser tests: start the server with `node node_modules/next/dist/bin/next start`, not `npx`, which leaves Node holding the port. This PC has no Postgres, so use a throwaway `embedded-postgres` outside the repo. Playwright works with `channel: "msedge"`, with no browser download. Pick fields with `visible=true`: hidden kept-alive pages leave duplicate forms.
- Name migrations with `npx drizzle-kit generate --name=<topic>`, or they get a random name.
- Forms empty themselves after their action, even on a refusal. Work forms send the typed values back with the error. A dropdown needs a changing `key` to show a new default.
- Row locks for seats, the task limit and work periods use `no key update`, so unrelated inserts that refer to that person are not held up.
- With `cacheComponents` on, anything reading cookies, headers, params or the database must sit inside `<Suspense>`. Read the request before touching `getAuth()`, so builds work without secrets.
- This Next.js keeps visited pages alive but hidden. Login and logout use a full page load. In tests, a redirect's destination is in the error's `digest`.
- `vercel link` writes a token to `.env.local` and breaks `.gitignore`; if relinked, delete that file and run `git restore .gitignore`. Never run `vercel env pull`. Vercel setting changes need a redeploy and the owner's yes.
- Secrets go in a separate PowerShell window, never through `!`. The account tests empty every table, so they only run on a database whose name ends in `_test`.
- Attendance never closes by itself. The login limit is per server instance until PR 7. Vercel's free plan excludes commercial use.
- 3D: headless Edge draws the scene only with `--use-angle=swiftshader --enable-unsafe-swiftshader`. Signs in the scene are pictures, not page text, so a browser test cannot find their words; check the menu text or the page data instead. Avoid HTML laid over the canvas (drei `Html`): it crashed when leaving the page. The cubicle panel is ordinary page HTML beside the canvas.
- 3D: the React lint rules forbid changing state or props, so the walker lives in a ref and is moved inside `useFrame`. Walking never re-renders React. Poses are set the same way, by `posePerson` on named joints.
- 3D: the layout is keyed on names and seats only, so a refresh that only changes who is working does not drop a walk under way.
- 3D: the menu sits over the top of the scene, so clicks there never reach the floor. On a phone it covers about a quarter of the screen.
