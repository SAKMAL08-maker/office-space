# Handoff — 2026-11-11

## Where things stand

PRs 0 to 5c and the cubicle-row fix are merged; the app is at https://office-space-tawny.vercel.app. This session fixed the cubicle-row bug (#19, merge `022a53a`, CI green); the PR 5c wrap-up docs (#18) merged with it. No migration. Vercel reported the deploy of `022a53a` complete, then `/api/health` returned `{"ok":true}` and login returned 200.

People can log in, check in and out, send, accept and reject tasks, and manage projects. The home page is a 3D office: lobby, machines, gate, then named offices with one cubicle per active project. Owners start and stop working in their cubicle, which glows. Presence shows other people walking, sitting and away, plus a "Who's in" list. The 5c look: warm light and soft shadows (`src/world/lights.tsx`), floor patterns drawn in code (`floor-pattern.ts`), a gate arm that swings up on check-in, and potted plants on the cells in `layout.plants`.

**Office layout (fixed this session):** offices are 13 cells wide. `ROOM_WIDTH` is worked out from `SIDE_AISLE` in `src/world/layout.ts`, giving a one-cell walkway down each side of the three-desk rows, so a full row never blocks the rows behind it. Desks keep their size and the door stays centred.

`requireCheckedIn()` guards every office action and page, and `/api/presence`. **Every later office action must call it too.**

## In progress

- **PR 6a Attachments** (branch `feat/project-attachments`): project files in a private Backblaze bucket. The owner and the task's sender upload, see and download them on My projects and Sent. Uploads go from the browser straight to the bucket through a 5-minute link signed for the exact size and headers; the server then checks the size in the bucket before marking the file ready. Downloads go through `/api/attachments/<id>`, which checks the gate and access and redirects to a fresh 5-minute link that always downloads. One new migration, `20261111125957_attachments.sql` (one new table, nothing changed). PR 6 is split into 6a, 6b pictures and 6c CSV export (owner, 2026-11-11).

## Next steps

1. **Owner: Backblaze setup** — done 2026-11-11 (bucket, key, Vercel and `.env.local` settings, CORS rule). Kept for reference; keys never go in the chat:
   1. Create a **private** bucket. In its Lifecycle settings, choose "Keep only the last version", so removed files really go.
   2. Create an application key limited to that bucket, with read and write access.
   3. Type `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET` and `B2_ENDPOINT` (the bucket's S3 endpoint, with `https://` in front) into Vercel (Production) and into your own `.env.local`.
   4. Run `! node --env-file=.env.local scripts/set-bucket-cors.mjs https://office-space-tawny.vercel.app http://localhost:3000`. If Backblaze says AccessDenied, the key may not change bucket settings: make a temporary key that can, run it once with that, then delete the temporary key.
2. Real local test against the bucket — done, see Verified.
3. Owner reads the migration SQL; on a yes, the owner runs `! gh workflow run migrate.yml --ref feat/project-attachments`, Claude checks the run, then merges on "merge it". The migration must run **before** the merge: the new code reads the new table.
4. After the merge: one live upload and download.
5. Then 6b profile pictures, 6c CSV export. Later: Playwright in the repo with the first committed browser test.
6. Still open from before: the owner's live check of the 5c look, the gate swing, an office with 6 or more projects, and a real phone.

## Open decisions (owner)

- The owner's one-line reasons, for `docs/decisions.md`: polish before PR 6; floors that refresh by themselves; the faded grey away look.
- The owner's reflection lines for PR 5a, PR 5c and the cubicle-row fix in `docs/ai-logs/SESSION-LOG.md`.
- Whether to delete merged branches on GitHub (including `fix/cubicle-row-walkway`). Not approved yet.
- PR 6a defaults Claude proposed (in `docs/decisions.md`): sender can upload too, 20 files per project, 5-minute links, uploader or owner removes, no files on a waiting task. And the owner's one-line reasons for the four PR 6 choices.
- Preview deployments stay logged out (owner, 2026-11-11). Keep `BETTER_AUTH_SECRET` out of Vercel's Preview environment.
- Whether check-out asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- PR 6a, tested: 147 Vitest tests in 15 files, run locally against a throwaway Postgres (bucket replaced by a pretend one in the tests), plus lint, format, typecheck and build. Rendered with throwaway data and fake keys (headless Edge): My projects and Sent at 1280px and 390px; the download address answered 302 to a 5-minute link that forces download, 404 for an unknown file; the upload sent exactly the signed headers. The fake-key upload and size check reached real Backblaze and were refused (403), as expected. Then, against the owner's real bucket from a local server (throwaway database, 2026-11-11), 11 checks passed: upload through the app marked ready (3.4 s for a small file), stored as download-only bytes, download returns the same bytes under the original name, a plain unsigned link is refused (401), an expired link is refused (401), a bigger-than-signed upload and a web-page-type upload are refused (403), the bucket allows the live site's address and refuses others, and Remove deletes the record and the stored file. **The first run stuck on "Uploading…" for over 20 seconds right after the CORS rule was saved; two later runs worked in a few seconds. Cause not found.** Not verified: the live site, a 25 MB file, a slow connection.
- Before PR 6a: 125 Vitest tests in 13 files (CI on #19 and `main`, with Postgres; locally the 91 database tests skip), plus lint, format, typecheck and build. The new walkway tests fail with the old layout and pass with the fix.
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
