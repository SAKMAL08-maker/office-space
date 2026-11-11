# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5b are merged and live at https://office-space-tawny.vercel.app. This session built and merged PR 5b Presence (#15, merge `62c9e1e`); PR 5a's docs (#14) came in with it. All five migrations are applied to Neon; the owner ran `20261111013614_presence.sql` through the Migrate production workflow (run 42948413280). After the deploy, `/api/health` returned `{"ok":true}`, home and login returned 200, and a logged-out `POST /api/presence` was redirected to `/login`.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then named offices with one cubicle per active project. The owner of a cubicle can start or stop working there; it glows and shows "Name · Project".

**Presence (new):** visible tabs report every 10 seconds (`src/app/presence.ts` → `/api/presence` → `src/server/presence.ts`, table `presence`). The home page sends the viewer's cell; Projects, Inbox and Sent send "still here" only. Other people (`src/world/other-person.tsx`) walk to their live spots, sit while working, and after 2 minutes of silence turn faded grey with "Name · away". Away never checks anyone out or ends work. When cubicles change, the floor refreshes itself. A "Who's in" list sits over the scene, and is always shown without 3D.

`requireCheckedIn()` guards every office action and page, and `/api/presence`. **Every later office action must call it too.**

## In progress

- **PR 5c Visual polish**, branch `feat/visual-polish`, open for review. No database change. It also carries the PR 5b wrap-up docs (#16), merged in so the two don't conflict.
  - Light (`src/world/lights.tsx`): a warm key light casting soft shadows over the whole world, fitted to `layout.bounds`, with a 1024 map under 640px wide and 2048 above; a cool fill; fog that starts at twice the camera's height. Labels ignore fog.
  - Floors (`src/world/floor-pattern.ts`): stone tiles in the lobby, planks in corridors and doorways, carpet in offices, drawn once in grey on a canvas and tinted by each floor's colour. Patterns line up with the scene, so they run on across patches.
  - Walls get skirting and a cap. Machines (`machine-body.tsx`, `machine-icon.tsx`) get a plinth, bezel, pulsing screen, tick or arrow icon and card slot. The gate (`gate.tsx`, `gate-arm.tsx`) has capped posts, glass wings, a red/green lamp, and an arm that swings up on check-in.
  - Plants (`plant.tsx`): `layout.plants` lists their cells (lobby corners, beside each machine, the two front corners of each office), and `buildGrid` blocks them.

## Next steps

1. Owner reviews PR 5c, then "merge it".
2. **Bug found while testing 5c (on `main` already):** an office with 6 or more projects has a full row of desks that walls off the row behind it, so those cubicles can't be walked to. Fix as its own small PR (for example, leave a walkway in each row) with a test that goes past 5 projects.
3. Owner tries it live with two people on two devices: both check in, one starts working, the other sees them walk, sit and glow without a reload. Hide one tab for 2 minutes and they show as away.
4. Then PR 6 Backblaze (files).
5. For any migration: show the owner the SQL, get a yes, the owner runs `! gh workflow run migrate.yml --ref <branch>` (Claude Code's safety check blocks Claude from starting it), Claude checks the run, then merges.
6. Add Playwright to the repo with the first committed browser test.

## Open decisions (owner)

- The owner's one-line reasons for floors that refresh by themselves and the faded grey away look (for `docs/decisions.md`).
- The owner's reflection line for PR 5a in `docs/ai-logs/SESSION-LOG.md`.
- Whether to delete the merged branches (`git branch -d`, safe; not yet approved).
- At PR 6: whether preview deployments get their own Neon database. Until then, keep `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether check-out asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- PR 5c tested locally: 124 Vitest tests (6 new plant tests: off every door, gate, machine, start and cubicle cell, and every spot still reachable, for 0, 1 and several offices of up to 5 projects); lint, format, typecheck and build. A headless Edge run on a local production build: lobby with the gate shut, the arm mid-swing and open after check-in, the floor with a working cubicle, and two phones at 390px. Screenshots checked by eye. No console warnings except react-three-fiber's existing `THREE.Clock` notice.
- PR 5c not verified: real graphics cards and phones (shadows are the main cost; the headless test draws in software), speed with many offices.
- Tested locally for 5b: 118 Vitest tests in 13 files on a throwaway Postgres; a two-person headless Edge walk-through on a production build (live list, floor refresh, walking, away while still working, no-3D list at 390px, checked-out report redirected). Screenshots at 1280px and 390px checked by eye.
- Live: migration run, deploy, and the logged-out checks above.
- Not verified: anything while logged in on the live site, real phones and touch, real graphics cards, many people at once, a real 2-minute wait, two tabs of the same person (the character would hop between them), invite and reset links live.

## Watch out for

- Local browser tests: `node node_modules/next/dist/bin/next start` (not `npx`), a throwaway `embedded-postgres` outside the repo, Playwright with `channel: "msedge"` and `--use-angle=swiftshader --enable-unsafe-swiftshader`. Use `visible=true` selectors: hidden kept-alive pages leave duplicate forms.
- Don't rewrite UTF-8 files with Windows PowerShell `Get-Content`/`Set-Content`: it garbles "·" and adds a BOM. Use the Write/Edit tools.
- `gh pr create` from PowerShell mangles quotes in `--body`; use `--body-file`.
- Name migrations with `npx drizzle-kit generate --name=<topic>`. Account tests empty every table, so they only run on a database whose name ends in `_test`.
- With `cacheComponents` on, anything reading cookies, headers or the database sits inside `<Suspense>`. Visited pages stay alive but hidden.
- Presence: the route answers someone checked out with a redirect, so the page fetches with `redirect: "manual"` and refreshes. The viewer's own office keeps the floor's work data. Each report runs about 5 queries (it loads the floor for its key); watch this with many people.
- 3D: walkers move inside `useFrame`. The layout is keyed on names and seats, so a refresh does not drop a walk. Avoid HTML inside the canvas.
- `vercel link` writes a token to `.env.local`; never run `vercel env pull`. Secrets go in a separate PowerShell window, never the chat.
