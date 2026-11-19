# Handoff — 2026-11-18

## Where things stand

PRs 0 to 6c and **PR 7a Login limits** (#28, merge `f279b68`) are merged; the app is at https://office-space-tawny.vercel.app. CI on `main` passed for `f279b68`, Vercel reported the deploy complete, `/api/health` returned `{"ok":true}`, and one wrong live login got 401 (not 500), so the new `rate_limits` table is in use. Its migration (`20261118145435_rate_limits.sql`) was applied by the owner's Migrate production run from the PR branch before merging.

New in 7a: each IP address gets 5 tries a minute at login (Better Auth's limiter, `storage: "database"`, `/sign-in/*` rule in `src/server/auth.ts`) and at each of the setup, invite and reset forms (`takeFormTry()` in `src/server/rate-limit.ts`, same table). The 6th try is refused with "Too many tries. Wait N seconds and try again." Every try counts, right or wrong. **Any new form usable without logging in must call `takeFormTry()`.**

`requireCheckedIn()` guards every office action, page and API route. **Every later office action must call it too.** Account things (time log, profile, pictures, the CSV) need only `requireUser()` or `requireAdmin()`.

## In progress

- This wrap-up: branch `docs/wrap-up-login-limits` (handoff, session log), as its own small docs PR.
- Merged branches `feat/login-rate-limits` and `feat/time-log-csv` were kept on GitHub (deleting merged branches is still open).

## Next steps

1. **PR 7b flood protection** (branch `feat/flood-protection`, docs only). The free plan includes one Firewall rate-limit rule. PR #30. The owner turned on "Logged-out pages" (`/login`, `/setup`, `/invite`, `/reset`, `/api/auth`, 60 requests a minute per IP, 429); Claude read it back through the Vercel connection (version 2, five OR groups, after fixing an AND joiner). Live burst on 2026-11-19: 60 got 200, the 61st 403, then the testing computer was refused on the whole site for a few minutes (cause unknown, see `docs/firewall.md`). PR #29 is merged; #30 waits for "merge it".
2. Then 7c phone layout, 7d Playwright in the repo and in CI on every PR, 7e security review of the whole app. One session each (see `docs/PLAN.md`).
3. Owner: confirm the live limit is per address: 6 wrong logins from phone data, then a normal login from the laptop on Wi-Fi should still work.
4. Still open from before: open the CSV in Excel or Google Sheets; a live picture upload; the live 5c look, the gate swing, an office with 6+ projects, a real phone.

## Open decisions (owner)

- Whether to accept the unexplained whole-site refusal seen after a 61-request `curl` burst (see `docs/firewall.md`), or look into it in 7e. Claude's view: accept for now, since real people stay far below 60 a minute on the logged-out pages.

- Confirm or change Claude's PR 7a choices in `docs/decisions.md` (every try counts, so one office network shares 5 tries; same limit on setup, invite and reset; on in every environment). Also the PR 6c and 6b choices listed there.
- One-line reasons for `docs/decisions.md`: PR 7's four choices, the PR 6 choices, polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, 5c, the cubicle-row fix, 6a, 6b, 6c and 7a.
- Whether the first 7a commit message, which wrongly says the limiter "was off on Vercel's preview builds", should stay (PR #28's description has the correction; fixing it means rewriting `main`'s history, so Claude advises leaving it).
- Whether the bucket's Lifecycle is "Keep only the last version"; whether to delete merged branches; check-out confirmation; admins correcting a logged time; work periods in Everyone's time log or the CSV.

## Verified vs. not

- Tested (7a): 188 Vitest tests in 18 files on a throwaway Postgres, none skipped (7 new), lint, format, typecheck, build, CI on #28 and on `main`. Built app on port 3001: 5 wrong logins got 401, the 6th 429 with `x-retry-after: 60`, another address still 401, a spoofed address list not trusted, counts stored as rows. Live: health, and one wrong login got 401.
- Not verified: the live limit is keyed by each visitor's address and not `no-trusted-ip` (needs a production read or the phone check above); setup, invite and reset refusing a 6th try in a browser; the login page's wait message on screen. Older gaps: the CSV in a spreadsheet, a live picture upload, iPhone photos, a 25 MB file, real phones and graphics cards, many people at once, invite and reset links live.

## Watch out for

- **Production migrations run from the PR branch:** `gh workflow run migrate.yml --ref <PR branch>`, before merging. Without `--ref` it uses `main` and still says "migrations applied successfully" while changing nothing.
- **Logins in tests and local runs are limited too** (5 a minute; locally every visitor counts as one address). Account tests empty `rate_limits` with the other tables; a single test logging in more than 5 times will be refused.
- **`/merge-it` can only be typed by the owner**; its `--delete-branch` step is skipped until the owner decides on deleting merged branches.
- **Permission prompts:** `.claude/settings.local.json` allows `git *`, `npm *`, `gh pr *` and a few more by prefix, so run those as separate simple commands.
- **Local test database:** `npm install embedded-postgres` in the session's scratchpad (its install script is blocked, which is fine on Windows), start it on port 54339 with database `office_test`, then `DATABASE_URL=postgres://postgres:postgres@localhost:54339/office_test npm run db:migrate && npm test`. Use port 3001 for `next start` checks. Stopping a background server leaves the process holding its port, so stop it by port too. Playwright is not installed this session (7d puts it in the repo).
- **Backblaze:** `.env.local` holds only the four `B2_` settings; Claude never reads it.
- Working copies use Windows line endings. `gh pr create` needs `--body-file`. Vercel reports deploys as commit statuses (context `Vercel`). Never run `vercel env pull`. Secrets never go in the chat.
