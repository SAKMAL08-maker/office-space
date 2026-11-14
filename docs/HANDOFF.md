# Handoff — 2026-11-12

## Where things stand

PRs 0 to 5c, the cubicle-row fix and **PR 6a Attachments** are merged; the app is at https://office-space-tawny.vercel.app. PR 6a is #22 (merge `bf68dec`, CI green). Its migration `20261111125957_attachments.sql` (one new table) ran on production first (run 43032822377, success). Vercel reported the deploy of `bf68dec` complete; `/api/health` returned `{"ok":true}`, and the owner uploaded and downloaded an image on the live site.

People can log in, check in and out, send and answer tasks, and manage projects in a 3D office with presence (see `docs/PLAN.md`). New in 6a: a project's owner and its task's sender can attach files (25 MB, 20 per project) on My projects and Sent. The browser uploads straight to the private Backblaze bucket through a 5-minute link signed for the exact size and download-only headers; the server checks the size before marking the file ready. Downloads go through `/api/attachments/<id>`, which checks the gate and access and redirects to a fresh 5-minute link. Code: `src/server/storage.ts` (only code that talks to Backblaze), `src/server/attachments.ts` (rules), `src/app/attachments/`.

`requireCheckedIn()` guards every office action, page and API route. **Every later office action must call it too.**

## In progress

- This wrap-up: branch `docs/wrap-up-attachments` (handoff, session log, decisions fix), as its own small docs PR.
- PR #21 (`chore/allow-read-only-commands`): lets common read-only commands run without a prompt. Open, waiting for the owner.

## Next steps

1. **PR 6b profile pictures:** PNG, JPEG or WebP only, 2 MB, checked by their first bytes (no SVG); same bucket and keys. Plan first, with the expected look.
2. PR 6c CSV export: admins download the time log as a CSV built on the spot (no storage, no table).
3. Then PR 7 hardening. Add Playwright to the repo with the first committed browser test.
4. Still open from before: the owner's live check of the 5c look, the gate swing, an office with 6 or more projects, and a real phone.

## Open decisions (owner)

- One-line reasons for `docs/decisions.md`: the four PR 6 choices (split in three, CSV as a direct download, owner and sender only, test locally then live); and from before: polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, PR 5c, the cubicle-row fix and PR 6a.
- Whether the bucket's Lifecycle is set to "Keep only the last version" (not confirmed). Without it, removed files stay as hidden copies and keep using space.
- Whether to delete merged branches on GitHub. Not approved yet.
- Whether check-out asks for confirmation, whether admins can correct a logged time, and whether Everyone's time log shows work periods.

## Verified vs. not

- Tested (PR 6a): 147 Vitest tests in 15 files against a throwaway Postgres (bucket faked in tests), plus lint, format, typecheck, build, and CI on #22. Against the real bucket from a local server, 11 checks passed: upload marked ready, stored as download-only bytes, same bytes back under the original name, unsigned and expired links refused (401), bigger-than-signed and web-page-type uploads refused (403), the live site's address allowed and others refused, Remove deletes record and file.
- Live: the owner's image upload (40,200 bytes, stored as a JPEG) and its download through the app.
- Not verified: a 25 MB file, a slow connection, files on Sent between two real accounts. The very first local upload stuck on "Uploading…" for over 20 seconds right after the CORS rule was saved; later runs took about 3 seconds. Cause not found.
- From before: not verified on real phones and graphics cards, many people at once, a real 2-minute wait, two tabs of one person, invite and reset links live.

## Watch out for

- **Permission prompts:** `.claude/settings.local.json` allows `git *`, `npm *`, `gh pr *` and a few more by prefix, so run those as separate simple commands. Batch into one command only what no rule covers. Don't copy big folders.
- **Backblaze:** files are stored as `attachments/<project id>/<file id>` with no name or extension, so a file downloaded inside Backblaze won't open until renamed; the app restores the name. `.env.local` (git-ignored) holds only the four `B2_` settings; Claude never reads it, only passes it with `node --env-file`. A changed site address needs `scripts/set-bucket-cors.mjs` run again. Local tests against the bucket must use port 3000 (the CORS rule allows `http://localhost:3000`).
- Local browser tests: throwaway `embedded-postgres` and Playwright installed in the job's temp folder (outside the repo, gone after the session), Postgres on port 54339, `next start` via `Start-Process` stopped in `finally`, `channel: "msedge"`. Wait for `networkidle` before filling forms, or hydration clears them. `/setup` needs a `SETUP_TOKEN` of 24+ characters.
- `gh api -q` filters with spaces break in Windows PowerShell. Vercel reports deploys as commit statuses (context `Vercel`). `gh pr create` needs `--body-file`.
- Don't rewrite UTF-8 files with PowerShell `Get-Content`/`Set-Content`. Account tests empty every table: only on a database whose name ends in `_test`.
- 3D: walkers and the gate arm move inside `useFrame`; avoid HTML inside the canvas. three r187 needs `shadows="percentage"`.
- Never run `vercel env pull`. Secrets never go in the chat.
