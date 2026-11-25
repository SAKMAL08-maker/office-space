# Handoff — 2026-11-25

## Where things stand

PRs 0 to 7d and **PR 7e fixes A to E** are merged and deployed (Vercel status green on `17d58b7`); the app is at https://office-space-tawny.vercel.app. This session merged #37 (fix A wrap-up), #38 (fix B, security headers), #39 (fix C, 30 active projects each, bounded floor query, per-person limits: presence 20 and uploads 30 a minute), #40 (fix D, `/api/health` in the Firewall rule's record) and #41 (fix E, the Migrate production job runs in a `production` environment).

The 7e findings are still kept outside the repo (it is public): `C:\Users\Julian\Desktop\office-space-security-review-2026-11-23.md` on the owner's laptop. Fixed now: 1, 2, 3, 5, 9, 10 in code. Waiting on owner settings: 6 (fix D) and 7 (fix E). Still open: 4 (owner check), 8 (fix F), 11 and 12 (later or skip). Read the report for what they are.

## In progress

- **Fix D is only in the docs.** The live Firewall rule (read 2026-11-24) still has five OR groups, without `/api/health`. The owner adds it (steps in `docs/firewall.md`, "Adding `/api/health`") or says yes and Claude changes it through the Vercel connection, then reads it back: six groups.
- **Fix E is not active.** No `production` environment exists yet, so migrations still use the repository secret with no approval. Owner, in this order: create the environment with themself as reviewer (`'{"reviewers":[{"type":"User","id":345587145}]}' | gh api -X PUT repos/SAKMAL08-maker/office-space/environments/production --input -`), then `gh secret set MIGRATE_DATABASE_URL --env production` (typed at the prompt), then `gh secret delete MIGRATE_DATABASE_URL`.
- This wrap-up: branch `docs/wrap-up-security-fixes-b-e`, its own small docs PR.

## Next steps

1. Owner: the fix D and fix E settings above.
2. Owner check: finding 4 in the private report (a Vercel settings check).
3. Plan fix F (a new feature, described in the private report) with the owner, then build it.
4. After that: a short `docs/security-review.md` summary in the repo (only fixed items), and 7e marked Done in `docs/PLAN.md`.
5. Still open from before: upload one picture and one file on the live site (fix A); make the `browser` CI job required; a live phone check; the 7a per-address check; the CSV in Excel; the 5c look items.

## Open decisions (owner)

- Confirm or change Claude's choices in `docs/decisions.md` for 7e fixes A, B, C, E (the numbers 30 / 20 / 30 especially), 7d, 7c, 7a, 6c and 6b.
- One-line reasons still missing in `docs/decisions.md` (PR 7, 7b, the PR 6 choices and others).
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for 5a to 7e and this session.
- Bucket Lifecycle "Keep only the last version"; deleting merged branches; check-out confirmation; admins correcting a logged time.

## Verified vs. not

- Tested: B's headers on the built app locally and on the live site (`/login` sends all five; `/api/pictures/x` keeps `default-src 'none'; sandbox; frame-ancestors 'none'`). C's database tests ran only in CI (200 passed on #39); no local test database was running. CI (check, browser, Vercel) passed on every PR, again after each merge of `main`.
- Not verified: C on the live site (nobody has hit a limit); fix A against the real bucket; whether Backblaze enforces the signed upload size and download headers.

## Watch out for

- **Never put unfixed findings in the repo, PRs or commit messages**; describe only the fix.
- **Headers:** a header in `next.config.ts` wins over the same header set by a route (Next.js skips the route's copy), so stricter route values must be repeated there. `tests/security-headers.test.ts` checks this.
- **Parallel doc PRs clash:** every PR appends to `docs/AI-USAGE.md` and `docs/decisions.md`. Merge `main` into each branch before merging it; keep both sides for appended lines, but check `CLAUDE.md` by hand (neighbouring rule edits duplicate a bullet if both are kept).
- **Local test Postgres:** `npm install embedded-postgres` in a scratch folder, start it on port 54339 with an `office_test` database, then `npm run db:migrate` with `DATABASE_URL=postgres://postgres:postgres@localhost:54339/office_test`. Ask before restarting it. Without it, `npx vitest run` skips the database tests (73 run, 140 skipped).
- **Hidden characters:** write escapes like `\u202e` from a script with `String.fromCharCode(92)`, and scan changed files for U+202A–202E, U+2066–2069, U+200B and U+FEFF.
- **Production migrations run from the PR branch, before merging:** the owner types `! gh workflow run migrate.yml --ref <PR branch>`; once fix E is set up the run waits for the owner's Approve in GitHub. Claude checks the log for "migrations applied successfully".
- **Vercel connection:** team `jmvl1`, project `prj_ORM0HzS8dJVLOsWwozqHkJLgf8a6`; the Firewall can be read with `get_firewall_config`. Changing the Firewall or env vars needs the owner's yes.
- Windows line endings: scripted edits must match `\r\n`. `gh pr create` needs `--body-file`. A Firewall burst test blocks the testing computer for minutes. Never run the browser tests and `npm test` at once on the same database.
