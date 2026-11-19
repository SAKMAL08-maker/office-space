# Handoff — 2026-11-20

## Where things stand

PRs 0 to 7a, the 7a wrap-up (#29) and **PR 7b Floods** (#30, merge `61b6c18`) are merged; the app is at https://office-space-tawny.vercel.app. Vercel reported the `61b6c18` deploy complete. 7b changed docs only.

New in 7b: one Vercel Firewall rule, "Logged-out pages", is live. It covers paths starting with `/login`, `/setup`, `/invite`, `/reset` or `/api/auth` (five OR groups), allows 60 requests per 60 s per IP (fixed window) and answers 429, with no persistent action. It lives in the dashboard; `docs/firewall.md` is its record, with the steps and the check. The free plan allows only this one rate-limit rule. **Any new page or route usable without logging in must be added to it** (CLAUDE.md rule), and must call `takeFormTry()` if it has a form.

From 7a: each IP gets 5 tries a minute at login, setup, invite and reset, counted in the `rate_limits` table. `requireCheckedIn()` guards every office action, page and API route; account things need only `requireUser()` or `requireAdmin()`.

## In progress

- This wrap-up: branch `docs/wrap-up-flood-protection` (handoff, session log), as its own small docs PR.
- Merged branches are kept on GitHub (deleting them is still open).

## Next steps

1. **PR 7c phone layout:** every page at phone width, the 3D office fitted to a narrow screen, tap to walk (see `docs/PLAN.md`).
2. Then 7d Playwright in the repo and in CI on every PR, 7e security review of the whole app (include logged-in routes having no Firewall limit). One session each.
3. Owner: confirm the 7a live limit is per address: 6 wrong logins from phone data, then a normal login from the laptop on Wi-Fi should still work.
4. Still open from before: open the CSV in Excel or Google Sheets; a live picture upload; the live 5c look, the gate swing, an office with 6+ projects, a real phone.

## Open decisions (owner)

- Confirm or change Claude's PR 7a, 6c and 6b choices in `docs/decisions.md`.
- One-line reasons for `docs/decisions.md`: PR 7's four choices, the 7b choices, the PR 6 choices, polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, 5c, the cubicle-row fix, 6a, 6b, 6c, 7a and 7b.
- Whether the first 7a commit message (wrong claim about preview builds) stays; Claude advises leaving it rather than rewriting `main`.
- Whether the bucket's Lifecycle is "Keep only the last version"; whether to delete merged branches; check-out confirmation; admins correcting a logged time; work periods in Everyone's time log or the CSV.

## Verified vs. not

- Tested (7b): the rule read back through the Vercel connection (version 2). Live `curl` burst on 2026-11-19, before the AND fix: 60 requests to `/login` got 200 and the 61st got 403 (not 429). The testing computer was then refused on the whole site for a few minutes (Security Checkpoint on health, 403 on presence) and recovered by itself. No attack recorded; cause unknown. The owner accepted it. Format check, lint and typecheck passed, and CI passed on #30.
- Not verified: `/api/auth` and `/reset` under a live burst (read-back only); why the answer was 403 and the whole site was refused; CI on `main` for `61b6c18` (it was still running at wrap-up). From 7a: the live limit keyed per address; setup, invite and reset refusing a 6th try in a browser. Older gaps: the CSV in a spreadsheet, a live picture upload, real phones, many people at once, invite and reset links live.

## Watch out for

- **A Firewall burst test blocks the testing computer from the whole site for a few minutes.** Never run it from a computer someone is working on.
- **Dashboard joiners:** when adding Firewall conditions, each joiner must read OR; one was left as AND the first time.
- **Vercel connection:** reading the team's settings needs the owner to approve a link from `authorize_team_access` (team `jmvl1`, id `team_GZAg0ZZQgzjlv490f3omNFgW`, project `prj_ORM0HzS8dJVLOsWwozqHkJLgf8a6`). The approval was granted this session. Changing the Firewall still needs the owner's yes.
- **Chained checks:** `npm run format:check | tail` hides a failure; run checks on their own or check the exit code.
- **Production migrations run from the PR branch:** `gh workflow run migrate.yml --ref <PR branch>`, before merging.
- **Logins in tests and local runs are limited too** (5 a minute); a single test logging in more than 5 times will be refused.
- **Local test database:** `npm install embedded-postgres` in the scratchpad, start it on port 54339 with database `office_test`, then `DATABASE_URL=postgres://postgres:postgres@localhost:54339/office_test npm run db:migrate && npm test`. Use port 3001 for `next start` checks; stop background servers by port.
- **Permission prompts:** `git *`, `npm *`, `gh pr *` are allowed by prefix, so run them as separate simple commands. `/merge-it` can only be typed by the owner.
- **Backblaze:** `.env.local` holds only the four `B2_` settings; Claude never reads it. Never run `vercel env pull`. Secrets never go in the chat.
- Working copies use Windows line endings. `gh pr create` needs `--body-file`. Vercel reports deploys as commit statuses (context `Vercel`). GitHub's PR file list can lag after a base PR merges; `gh api .../compare/main...<branch>` shows the truth.
