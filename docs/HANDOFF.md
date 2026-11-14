# Handoff — 2026-11-14

## Where things stand

PRs 0 to 5c, the cubicle-row fix, **PR 6a Attachments** (#22, `bf68dec`) and **PR 6b Profile pictures** (#24, merge `363d8f9`) are merged; the app is at https://office-space-tawny.vercel.app. 6b's migration `20261114032929_profile_pictures.sql` (one new table) ran on production before the merge (run 43563851953, on `feat/profile-pictures`, success). CI on #24 was green, Vercel reported the deploy of `363d8f9` complete, `/api/health` returned `{"ok":true}`, and logged out, `/api/pictures/<id>` and `/profile` both send visitors to log in.

People can log in, check in and out, send and answer tasks, manage projects in a 3D office with presence, and attach project files (see `docs/PLAN.md`). New in 6b: on My profile, people choose or remove their picture. The browser crops it to a 256 x 256 JPEG and uploads it to the private bucket under `pictures/<user id>/<picture id>`. The server keeps it only once its first bytes prove PNG, JPEG or WebP, and deletes the old one. Pictures, or initials on the person's shirt colour, show in the greeting, Who's in, admin People (with Remove picture) and on the 3D name signs. They are sent through `/api/pictures/<id>` to anyone logged in, with the type the server found, `nosniff` and a sandbox policy. Code: `src/server/storage.ts` (only code that talks to Backblaze), `src/server/attachments.ts`, `src/server/pictures.ts`, `src/app/profile/`, `src/ui/avatar.tsx`, `src/world/label.tsx`.

`requireCheckedIn()` guards every office action, page and API route. **Every later office action must call it too.** Account things (time log, profile, pictures) need only `requireUser()`.

## In progress

- This wrap-up: branch `docs/wrap-up-pictures` (handoff, session log, plan status), as its own small docs PR.
- PR #21 (`chore/allow-read-only-commands`) shows as closed without merging.

## Next steps

1. Owner: on the live site, choose a picture on My profile and check it in the greeting and Who's in.
2. PR 6c CSV export: admins download the time log as a CSV built on the spot (no storage, no table).
3. Then PR 7 hardening. Add Playwright to the repo with the first committed browser test.
4. Still open from before: the owner's live check of the 5c look, the gate swing, an office with 6 or more projects, and a real phone.

## Open decisions (owner)

- Confirm or change Claude's PR 6b choices in `docs/decisions.md` (20 MB chosen file, 3 uploads at once, 10-minute cleanup, black or white initials, `users.image` unused).
- One-line reasons for `docs/decisions.md`: the four PR 6 choices; and from before: polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, PR 5c, the cubicle-row fix, PR 6a and PR 6b.
- Whether the bucket's Lifecycle is set to "Keep only the last version" (not confirmed). Without it, removed and replaced files stay as hidden copies.
- Whether to delete merged branches on GitHub; whether check-out asks for confirmation, admins can correct a logged time, and Everyone's time log shows work periods.

## Verified vs. not

- Tested (6b): 170 Vitest tests in 16 files against a throwaway Postgres (bucket faked with real bytes), lint, format, typecheck, build, and CI on #24. Real bucket from a local server, 14 checks passed: shrunk to a 256 x 256 JPEG with no Exif block, stored download-only, same bytes served with safe headers, logged-out sent to log in, HTML posing as the JPEG refused, replace and both removes delete the file, a missing file answers 404, nothing left in the bucket. Each picture fetched once over 12 seconds of presence updates.
- Rendered (local server, test accounts): My profile, greeting, Who's in, admin People, the 3D signs (cubicle, standing, away) at desktop and phone width.
- Not verified: a live picture upload, Safari, iPhone photos (HEIC), a big photo on a slow phone. From 6a: a 25 MB file, a slow connection, files on Sent between two real accounts. From before: real phones and graphics cards, many people at once, two tabs of one person, invite and reset links live.

## Watch out for

- **Production migrations run from the PR branch:** `gh workflow run migrate.yml --ref <PR branch>`, before merging. Run without `--ref` it uses `main`, which lacks the new file, and still says "migrations applied successfully" (that happened once on 2026-11-14 and changed nothing).
- **Permission prompts:** `.claude/settings.local.json` allows `git *`, `npm *`, `gh pr *` and a few more by prefix, so run those as separate simple commands. Batch only what no rule covers.
- **Backblaze:** keys have no name or extension, so a file downloaded inside Backblaze won't open until renamed. `.env.local` holds only the four `B2_` settings; Claude never reads it, only passes it with `node --env-file` (`next start` loads it by itself). Local bucket tests must use port 3000 (the CORS rule allows `http://localhost:3000`). A real-bucket run once timed out reaching Backblaze; rerunning worked.
- Local browser tests: `embedded-postgres` and Playwright in the job's temp folder (gone after the session), Postgres on port 54339, `channel: "msedge"`. Wait for `networkidle` before filling forms; on the 3D home page use `load` instead, since link prefetching keeps the network busy. `/setup` needs a `SETUP_TOKEN` of 24+ characters.
- Working copies use Windows line endings (`core.autocrlf`); edit scripts must expect `\r\n` or the match fails. `gh pr create` needs `--body-file`. Vercel reports deploys as commit statuses (context `Vercel`).
- Account tests empty every table: only on a database whose name ends in `_test`. 3D: walkers move inside `useFrame`; avoid HTML inside the canvas; three r187 needs `shadows="percentage"`.
- Never run `vercel env pull`. Secrets never go in the chat.
