# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5c and the cubicle-row fix are merged; the app is at https://office-space-tawny.vercel.app. This session fixed the cubicle-row bug (#19, merge `022a53a`, CI green); the PR 5c wrap-up docs (#18) merged with it. No migration. Vercel reported the deploy of `022a53a` complete, then `/api/health` returned `{"ok":true}` and login returned 200.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then named offices with one cubicle per active project. Owners start and stop working in their cubicle, which glows. Presence shows other people walking, sitting and away, plus a "Who's in" list. The 5c look: warm light and soft shadows (`src/world/lights.tsx`), floor patterns drawn in code (`floor-pattern.ts`), a gate arm that swings up on check-in, and potted plants on the cells in `layout.plants`.

**Office layout (fixed this session):** offices are 13 cells wide. `ROOM_WIDTH` is worked out from `SIDE_AISLE` in `src/world/layout.ts`, giving a one-cell walkway down each side of the three-desk rows, so a full row never blocks the rows behind it. Desks keep their size and the door stays centred.

`requireCheckedIn()` guards every office action and page, and `/api/presence`. **Every later office action must call it too.**

## In progress

- Nothing in code. This wrap-up is its own small docs PR.

## Next steps

1. Owner checks the live site: the new look, the gate swinging on check-in, an office with 6 or more projects (every desk reachable), and how it runs on a real phone.
2. Then PR 6 Backblaze (files).
3. For any migration: show the owner the SQL, get a yes, the owner runs `! gh workflow run migrate.yml --ref <branch>`, Claude checks the run, then merges.
4. Add Playwright to the repo with the first committed browser test.

## Open decisions (owner)

- The owner's one-line reasons, for `docs/decisions.md`: polish before PR 6; floors that refresh by themselves; the faded grey away look.
- The owner's reflection lines for PR 5a, PR 5c and the cubicle-row fix in `docs/ai-logs/SESSION-LOG.md`.
- Whether to delete merged branches on GitHub (including `fix/cubicle-row-walkway`). Not approved yet.
- At PR 6: whether preview deployments get their own Neon database. Until then, keep `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether check-out asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- Tested: 125 Vitest tests in 13 files (CI on #19 and `main`, with Postgres; locally the 91 database tests skip), plus lint, format, typecheck and build. The new walkway tests fail with the old layout and pass with the fix.
- Rendered with throwaway data (headless Edge, software graphics): a 12-cubicle office at 1280px and 390px, and a walk from a back-row chair past a full row of desks; earlier, 5c's lobby, gate swing and phones, and 5b's two-person presence walk-through.
- Live: deploy status, health and login after the merge; earlier migration runs.
- Not verified: anything while logged in on the live site, real phones and graphics cards (shadows are the main cost), many offices or people at once, a real 2-minute wait, two tabs of the same person, invite and reset links live.

## Watch out for

- **Permission prompts:** the owner can't keep switching windows to approve commands. `.claude/settings.local.json` allows `git *`, `npm *`, `gh pr *` and a few more by prefix, so run those as separate simple commands (no prompt). Wrapping them in a bigger script makes it prompt. Batch into one command only what no rule covers (start server, run browser script, stop server). Don't copy big folders.
- Local browser tests: throwaway `embedded-postgres` outside the repo on port 54339, `node node_modules/next/dist/bin/next start -p 3100` (via `Start-Process`, stopped in `finally`), Playwright from an earlier install imported by absolute path, `channel: "msedge"` with `--use-angle=swiftshader --enable-unsafe-swiftshader`, and `visible=true` selectors (hidden pages leave duplicate forms). `/setup` only opens with a `SETUP_TOKEN` of 24 or more characters. A character working at a seat starts in its chair, which is the easy way to put the camera inside an office.
- `gh api -q` filters with spaces break in Windows PowerShell; pipe to `ConvertFrom-Json` instead. Vercel reports deploys as commit statuses (context `Vercel`), not GitHub deployments.
- three r187 removed `PCFSoftShadowMap`, so the canvas uses `shadows="percentage"`. React-three-fiber logs a harmless `THREE.Clock` notice.
- Don't rewrite UTF-8 files with PowerShell `Get-Content`/`Set-Content`. `gh pr create` needs `--body-file`.
- Account tests empty every table: only run them on a database whose name ends in `_test`.
- 3D: walkers and the gate arm move inside `useFrame`; a changed prop would snap them. Avoid HTML inside the canvas.
- `vercel link` writes a token to `.env.local`; never run `vercel env pull`. Secrets never go in the chat.
