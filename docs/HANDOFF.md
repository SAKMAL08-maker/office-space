# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5a are merged and live at https://office-space-tawny.vercel.app. This session merged the PR 4 wrap-up docs (#12) and PR 5a Working (#13, merge `858bc00`). All four migrations are applied to Neon through the Migrate production workflow, including `20261111002001_work_sessions.sql`. After the deploy, `/api/health` returned `{"ok":true}` and the home and login pages returned 200.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then a floor of named offices with one cubicle per active project. Clicking a cubicle walks there and opens its details panel (`src/app/cubicle-panel.tsx`). The owner can start or stop working there, or from My projects. A work period (`src/server/work.ts`) ends on Stop, starting elsewhere, check-out or Finish. An occupied cubicle glows, its monitor lights up, the person sits in the chair, a "Name · Project" label floats above it and the door plate reads "Name · working". My time log shows check-ins and work periods.

**Tasks:** a task is a project offered to someone. It becomes their project, with one cubicle, only if they accept it. At most 10 can be waiting from one sender to one receiver.

`requireCheckedIn()` guards check-out, start/stop work and every Projects, Inbox and Sent page and action. **Every later office action must call it too.**

## In progress

- PR #14 (PR 5a wrap-up docs) is open. Merge it before PR 5b; branch `feat/presence` already contains it.
- **PR 5b Presence**, branch `feat/presence`, open for review:
  - New `presence` table (one row per person: last cell, last seen). `/api/presence` (`src/app/api/presence/route.ts`, logic in `src/server/presence.ts`) calls `requireCheckedIn()` first, validates the body, saves the spot and answers with everyone checked in, who is away and what they work on, plus a floor key.
  - Visible tabs report every 10 seconds (`src/app/presence.ts`). The home page sends the viewer's cell, or where they are walking to. Projects, Inbox and Sent send "still here" with no cell, so reading them does not make someone away.
  - Away = no report for 2 minutes, worked out by the database clock. It never checks anyone out. A spot from before the latest check-in is ignored.
  - Other people (`src/world/other-person.tsx`) walk to each new spot, sit in their chair while working, and turn faded grey with "Name · away" when away. The cubicle label then reads "Name · away · Project". `SeatedPerson` is gone.
  - Other people's glows follow presence within 10 seconds. When the floor key changes (a cubicle appears or goes, a project is renamed, someone joins), the page refreshes the floor once.
  - "Who's in" list (`src/app/people-list.tsx`): a button over the 3D scene, and always shown on the screen for browsers without 3D.
  - **Migration `20261111013614_presence.sql` must be applied before merging**, through the Migrate production workflow, after the owner has read the SQL.

## Next steps

1. Owner reads the presence SQL and says yes. Then `gh workflow run migrate.yml --ref feat/presence`, merge #14, then merge PR 5b.
2. Owner tries it live with two people on two devices: both check in, one starts working, and the other sees them walk, sit and glow without a reload. Hide one tab for 2 minutes and they show as away.
3. Visual polish as its own small PR after 5b: lighting and shadows, floor patterns, plants, nicer machines and gate. Add it to `docs/PLAN.md` once the owner agrees where it goes.
4. For any later migration: show the owner the SQL, get a yes, run `gh workflow run migrate.yml --ref <branch>`, then merge.
5. Add Playwright to the repo with the first committed browser test.

## Open decisions (owner)

- Whether to delete the merged branches (`git branch -d`, safe; not yet approved).
- At PR 6: whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether the check-out machine asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- PR 5b tested locally: 118 Vitest tests in 13 files on a throwaway Postgres (gate, bad bodies, saving spots, away at 2 minutes, checked-out people left out, old spots ignored, floor key, placing people, live glows). A two-person headless Edge walk-through on a local production build: Mo starts working and Zoe, without reloading, sees his new cubicle, its glow and label, and him walking in through the gate; Mo's tab goes quiet (last report aged in the database rather than waiting 2 minutes) and Zoe sees him faded and "away", still checked in; the list without 3D (WebGL switched off) at 390px; a checked-out person's report is redirected. Screenshots at 1280px and 390px checked by eye.
- Earlier: 5a tested the same way. Migration run and deploy checks above.
- Not verified: any feature while logged in on the live site, real phones and touch, real graphics cards, many offices or people at once, a real 2-minute wait, two tabs of the same person, invite and reset links live.

## Watch out for

- Local browser tests: `node node_modules/next/dist/bin/next start` (not `npx`), a throwaway `embedded-postgres` outside the repo, Playwright with `channel: "msedge"` and `--use-angle=swiftshader --enable-unsafe-swiftshader`. Use `visible=true` selectors: hidden kept-alive pages leave duplicate forms. Signs in the scene are pictures, so check page text instead.
- `gh pr create` from Windows PowerShell mangles quotes in `--body`; use `--body-file`.
- Name migrations with `npx drizzle-kit generate --name=<topic>`. The account tests empty every table, so they only run on a database whose name ends in `_test`.
- With `cacheComponents` on, anything reading cookies, headers or the database sits inside `<Suspense>`. This Next.js keeps visited pages alive but hidden.
- Row locks use `no key update`. Start work and check-out lock the person; start and Finish lock the cubicle.
- Presence: `/api/presence` answers someone checked out with a redirect, so the page fetches it with `redirect: "manual"` and refreshes. The viewer's own office keeps the floor's work data, because presence can be up to 10 seconds behind their own Start working.
- 3D: the walker and poses change inside `useFrame` (lint forbids changing props). The layout is keyed on names and seats, so a refresh does not drop a walk. Avoid HTML inside the canvas (drei `Html` crashed); the panel is page HTML beside it.
- `vercel link` writes a token to `.env.local`; never run `vercel env pull`. Secrets go in a separate PowerShell window, never the chat.
