# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5c are merged; the app is at https://office-space-tawny.vercel.app. This session built and merged PR 5c Visual polish (#17, merge `39ae82d`, CI green on `main`); the PR 5b wrap-up docs (#16) came in with it. No migration. Right after the merge, `/api/health` returned `{"ok":true}` and home and login returned 200, but the new build's deploy was not yet confirmed.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then named offices with one cubicle per active project. Owners start and stop working in their cubicle, which glows. Presence shows other people walking, sitting and away, plus a "Who's in" list.

**The 3D look (5c):** warm light with soft shadows and a light fog (`src/world/lights.tsx`; a smaller shadow map under 640px wide); tile, plank and carpet floors drawn in code (`floor-pattern.ts`, one shared picture per pattern); walls with skirting and a cap; machines with a pulsing screen and icon; a gate arm that swings up on check-in, with a red/green lamp (`gate.tsx`, `gate-arm.tsx`); potted plants (`plant.tsx`) on the cells in `layout.plants`, which `buildGrid` blocks.

`requireCheckedIn()` guards every office action and page, and `/api/presence`. **Every later office action must call it too.**

## In progress

- **Cubicle-row fix**, branch `fix/cubicle-row-walkway`, open for review. It also carries this wrap-up (#18). No database change. Before, three 3-cell desks filled an office's 9-cell inside, so a full row walled off the rows behind it. Now each office is 13 cells wide (`ROOM_WIDTH` is worked out from `SIDE_AISLE` in `src/world/layout.ts`), with a one-cell walkway down each side of the desks. Desks keep their size and the door stays centred. Every office is 2 m wider, so the floor is too.

## Next steps

1. Owner reviews the cubicle-row fix, then "merge it" (it closes #18 as well).
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

- Cubicle-row fix, tested locally: a new test walks to every cubicle of a 12- and a 6-cubicle office, and the plant test now goes up to 12. Both fail with the old layout (walkway set to 0) and pass with the fix. Lint, format, typecheck and build pass; the 91 database tests skipped locally and run in CI.
- Cubicle-row fix, rendered with throwaway data (headless Edge, software graphics): a 12-cubicle office at 1280px and 390px, with walkways on both sides; a walk from the back-row chair (seat 1) to seat 4's chair, past a full row of desks. No browser errors and no sideways scroll on the phone. Not verified: real devices, and offices with many projects on the live site.
- Tested: 124 Vitest tests in 13 files on a throwaway Postgres, plus lint, format, typecheck and build; CI on #17 and on `main`.
- Rendered with throwaway data (headless Edge, software graphics): 5c's lobby, gate swing, floor with a working cubicle, and phones at 390px; 5b's two-person presence walk-through.
- Live: health, home and login after the merge; earlier migration runs.
- Not verified: anything while logged in on the live site, real phones and graphics cards (shadows are the main cost), many offices or people at once, a real 2-minute wait, two tabs of the same person, invite and reset links live.

## Watch out for

- Local browser tests: throwaway `embedded-postgres` outside the repo (port 54329 was busy this session; 54339 worked), `node node_modules/next/dist/bin/next start -p 3100`, Playwright with `channel: "msedge"` and `--use-angle=swiftshader --enable-unsafe-swiftshader`, `visible=true` selectors. Projects needs a check-in first. `/setup` only opens with a `SETUP_TOKEN` of at least 24 characters, so a short throwaway one shows "could not be found". To save the owner permission prompts, start the server, run the browser script and stop the server in one command.
- Presence keeps someone's last spot while they're on Projects, Inbox or Sent, so they can show at the check-in machine while working until their home tab reports again.
- three r187 removed `PCFSoftShadowMap`, so the canvas uses `shadows="percentage"`. React-three-fiber logs a harmless `THREE.Clock` notice.
- Don't rewrite UTF-8 files with PowerShell `Get-Content`/`Set-Content`. `gh pr create` needs `--body-file`.
- Account tests empty every table: only run them on a database whose name ends in `_test`.
- 3D: walkers and the gate arm move inside `useFrame`; a changed prop would snap them. Avoid HTML inside the canvas.
- `vercel link` writes a token to `.env.local`; never run `vercel env pull`. Secrets never go in the chat.
