# Handoff — 2026-11-24

## Where things stand

PRs 0 to 7d, the 7d wrap-up (#35) and **PR 7e fix A, uploads** (#36, merge `56abaf1`) are merged and deployed (Vercel status green); the app is at https://office-space-tawny.vercel.app.

7e security review: done, read-only, by two subagents, with every main finding re-checked by Claude against the code. **The findings stay outside the repo until fixed** (the repo is public): `C:\Users\Julian\Desktop\office-space-security-review-2026-11-23.md` on the owner's laptop. It lists 11 findings plus small items, what was checked and fine, and suggested fix PRs A to F.

Fix A (#36): failed uploads stay pending and are cleared with anything stored once their link has expired (10 minutes; links last 5); files and pictures removed or replaced in their first 10 minutes get the new `removed` status and the same clean-up; pictures are re-checked by first bytes each time they are sent; file names lose invisible formatting characters. Migration `20261123151644_upload_removed_status.sql` was applied to production by the owner before merging (run 45213618670, success).

## In progress

- This wrap-up: branch `docs/wrap-up-security-fix-a` (handoff, session log, decisions), as its own small docs PR.
- Merged branches are kept on GitHub (deleting them is still open).

## Next steps

1. Owner: on the live site, upload one profile picture and one project file (fix A was tested only against a pretend bucket).
2. **The remaining 7e fixes, one PR each, in a fresh session:** "Read docs/HANDOFF.md and the private security report, then do 7e fixes B to E." The owner asked Claude to build them all and keeps the merges. The report's last section gives the order and what each needs from the owner: B and C are code only; D, E and the preview-database item each need the owner's yes for a dashboard or GitHub setting; F (a new feature) needs planning with the owner first.
3. After the fixes: a short `docs/security-review.md` summary in the repo, and 7e marked Done in `docs/PLAN.md`.
4. Still open from before: watch the `browser` CI job, then make it required; a live phone check; the 7a per-address check; the CSV in Excel; the 5c look items.

## Open decisions (owner)

- Confirm or change Claude's choices in `docs/decisions.md` for 7e fix A, 7d, 7c, 7a, 6c and 6b.
- One-line reasons still missing in `docs/decisions.md` (PR 7, 7b, the PR 6 choices and others).
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for 5a to 7d and this session.
- Bucket Lifecycle "Keep only the last version" (it matters more now: Backblaze may keep hidden old versions of deleted files); deleting merged branches; check-out confirmation; admins correcting a logged time.

## Verified vs. not

- Tested (fix A): lint, format check, typecheck, build, 195 Vitest tests on a local throwaway Postgres; CI on #36 (check, browser, Vercel preview) passed.
- Not verified: fix A against the real Backblaze bucket; whether Backblaze enforces the signed upload size and download headers (one wrong-size test upload would show it).

## Watch out for

- **Never put unfixed findings in the repo, PRs or commit messages**; describe only the fix.
- **Local test Postgres:** `npm install embedded-postgres` in a scratch folder, start it on port 54339 with an `office_test` database, then `npm run db:migrate` with `DATABASE_URL=postgres://postgres:postgres@localhost:54339/office_test`. Claude Code may stop it when the laptop is low on memory; ask before restarting it.
- **Hidden characters:** typing `\u202e` through Claude's edit tools can insert the real character. Write escapes from a script with `String.fromCharCode(92)`, and scan changed files for U+202A–202E, U+2066–2069, U+200B and U+FEFF.
- **Production migrations run from the PR branch, before merging:** the owner types `! gh workflow run migrate.yml --ref <PR branch>`; Claude checks the run's log for "migrations applied successfully".
- **Vercel connection:** env var targets can be read without decrypting (`filter_project_envs`, team `jmvl1`, project `prj_ORM0HzS8dJVLOsWwozqHkJLgf8a6`). Changing the Firewall or env vars needs the owner's yes.
- Working copies use Windows line endings, so scripted text edits must match `\r\n`. `gh pr create` needs `--body-file`. A Firewall burst test blocks the testing computer from the whole site for minutes. Never run the browser tests and `npm test` at once on the same database.
