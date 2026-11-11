# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5a are merged and live at https://office-space-tawny.vercel.app. This session merged the PR 4 wrap-up docs (#12) and PR 5a Working (#13, merge `858bc00`). All four migrations are applied to Neon through the Migrate production workflow, including `20261111002001_work_sessions.sql`. After the deploy, `/api/health` returned `{"ok":true}` and the home and login pages returned 200.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then a floor of named offices with one cubicle per active project. Clicking a cubicle walks there and opens its details panel (`src/app/cubicle-panel.tsx`). The owner can start or stop working there, or from My projects. A work period (`src/server/work.ts`) ends on Stop, starting elsewhere, check-out or Finish. An occupied cubicle glows, its monitor lights up, the person sits in the chair, a "Name · Project" label floats above it and the door plate reads "Name · working". My time log shows check-ins and work periods.

**Tasks:** a task is a project offered to someone. It becomes their project, with one cubicle, only if they accept it. At most 10 can be waiting from one sender to one receiver.

`requireCheckedIn()` guards check-out, start/stop work and every Projects, Inbox and Sent page and action. **Every later office action must call it too.**

## In progress

Only this wrap-up docs PR. Nothing is half-built.

## Next steps

1. Owner tries PR 5a live with two people: check in, start working, see the glow from the other account (after a reload), check out, read My time log.
2. PR 5b (Presence): other people's characters, `/api/presence` every 10 seconds from visible tabs, away after 2 minutes, the "who's working" list for browsers without 3D. `SeatedPerson` already draws a working person in their chair from the work data.
3. Visual polish as its own small PR after 5b: lighting and shadows, floor patterns, plants, nicer machines and gate. Add it to `docs/PLAN.md` once the owner agrees where it goes.
4. For any later migration: show the owner the SQL, get a yes, run `gh workflow run migrate.yml --ref <branch>`, then merge.
5. Add Playwright to the repo with the first committed browser test.

## Open decisions (owner)

- Whether to delete the merged branches (`git branch -d`, safe; not yet approved).
- At PR 6: whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether the check-out machine asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- Tested: 104 Vitest tests in 11 files on a throwaway Postgres. Two-person headless Edge walk-through of PR 5a on a local production build at 1280px and 390px, screenshots checked by eye. Migration run and deploy checks above.
- Not verified: any feature while logged in on the live site, real phones and touch, real graphics cards, many offices at once, invite and reset links live.

## Watch out for

- Local browser tests: `node node_modules/next/dist/bin/next start` (not `npx`), a throwaway `embedded-postgres` outside the repo, Playwright with `channel: "msedge"` and `--use-angle=swiftshader --enable-unsafe-swiftshader`. Use `visible=true` selectors: hidden kept-alive pages leave duplicate forms. Signs in the scene are pictures, so check page text instead.
- `gh pr create` from Windows PowerShell mangles quotes in `--body`; use `--body-file`.
- Name migrations with `npx drizzle-kit generate --name=<topic>`. The account tests empty every table, so they only run on a database whose name ends in `_test`.
- With `cacheComponents` on, anything reading cookies, headers or the database sits inside `<Suspense>`. This Next.js keeps visited pages alive but hidden.
- Row locks use `no key update`. Start work and check-out lock the person; start and Finish lock the cubicle.
- 3D: the walker and poses change inside `useFrame` (lint forbids changing props). The layout is keyed on names and seats, so a refresh does not drop a walk. Avoid HTML inside the canvas (drei `Html` crashed); the panel is page HTML beside it.
- `vercel link` writes a token to `.env.local`; never run `vercel env pull`. Secrets go in a separate PowerShell window, never the chat.
