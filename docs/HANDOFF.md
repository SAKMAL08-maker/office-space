# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5c are merged; the app is at https://office-space-tawny.vercel.app. This session built and merged PR 5c Visual polish (#17, merge `39ae82d`, CI green on `main`); the PR 5b wrap-up docs (#16) came in with it. No migration. Right after the merge, `/api/health` returned `{"ok":true}` and home and login returned 200, but the new build's deploy was not yet confirmed.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then named offices with one cubicle per active project. Owners start and stop working in their cubicle, which glows. Presence shows other people walking, sitting and away, plus a "Who's in" list.

**The 3D look (5c):** warm light with soft shadows and a light fog (`src/world/lights.tsx`; a smaller shadow map under 640px wide); tile, plank and carpet floors drawn in code (`floor-pattern.ts`, one shared picture per pattern); walls with skirting and a cap; machines with a pulsing screen and icon; a gate arm that swings up on check-in, with a red/green lamp (`gate.tsx`, `gate-arm.tsx`); potted plants (`plant.tsx`) on the cells in `layout.plants`, which `buildGrid` blocks.

`requireCheckedIn()` guards every office action and page, and `/api/presence`. **Every later office action must call it too.**

## In progress

- Nothing in code. This wrap-up is its own small docs PR.

## Next steps

1. **Fix the cubicle-row bug (on `main`):** in an office with 6 or more projects, a full row of three desks spans the whole room and walls off the row behind it, so those cubicles can't be walked to (`placeOffice` in `src/world/layout.ts`). Own small PR, with a test past 5 projects (the plant test in `tests/world.test.ts` stops at 5 because of this).
2. Owner checks the live site: the new look, the gate swinging on check-in, and how it runs on a real phone.
3. Then PR 6 Backblaze (files).
4. For any migration: show the owner the SQL, get a yes, the owner runs `! gh workflow run migrate.yml --ref <branch>`, Claude checks the run, then merges.
5. Add Playwright to the repo with the first committed browser test.

## Open decisions (owner)

- The owner's one-line reasons, for `docs/decisions.md`: polish before PR 6; floors that refresh by themselves; the faded grey away look.
- The owner's reflection lines for PR 5a and PR 5c in `docs/ai-logs/SESSION-LOG.md`.
- At PR 6: whether preview deployments get their own Neon database. Until then, keep `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether check-out asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- Tested: 124 Vitest tests in 13 files on a throwaway Postgres, plus lint, format, typecheck and build; CI on #17 and on `main`.
- Rendered with throwaway data (headless Edge, software graphics): 5c's lobby, gate swing, floor with a working cubicle, and phones at 390px; 5b's two-person presence walk-through.
- Live: health, home and login after the merge; earlier migration runs.
- Not verified: anything while logged in on the live site, real phones and graphics cards (shadows are the main cost), many offices or people at once, a real 2-minute wait, two tabs of the same person, invite and reset links live.

## Watch out for

- Local browser tests: throwaway `embedded-postgres` outside the repo (port 54329 was busy this session; 54339 worked), `node node_modules/next/dist/bin/next start -p 3100`, Playwright with `channel: "msedge"` and `--use-angle=swiftshader --enable-unsafe-swiftshader`, `visible=true` selectors. Projects needs a check-in first.
- Presence keeps someone's last spot while they're on Projects, Inbox or Sent, so they can show at the check-in machine while working until their home tab reports again.
- three r187 removed `PCFSoftShadowMap`, so the canvas uses `shadows="percentage"`. React-three-fiber logs a harmless `THREE.Clock` notice.
- Don't rewrite UTF-8 files with PowerShell `Get-Content`/`Set-Content`. `gh pr create` needs `--body-file`.
- Account tests empty every table: only run them on a database whose name ends in `_test`.
- 3D: walkers and the gate arm move inside `useFrame`; a changed prop would snap them. Avoid HTML inside the canvas.
- `vercel link` writes a token to `.env.local`; never run `vercel env pull`. Secrets never go in the chat.
