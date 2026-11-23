# Handoff — 2026-11-23

## Where things stand

PRs 0 to 7c and **PR 7d Browser tests** (#34, merge `250cff6`) are merged; the app is at https://office-space-tawny.vercel.app. 7d changed no app code.

New in 7d: Playwright (Chromium) runs `tests/browser/` against the built app (`next build` + `next start`, port 3100). `office.spec.ts`: set up the first admin on `/setup`, log in, "Go to check-in machine" (walk, check in), "Go to check-out machine" (walk, check out), Log out offered, still checked out after a reload. It runs at desktop size and at phone size (375 px, touch). `plain-office.spec.ts`: with WebGL off, the plain machine buttons check in and out (desktop only). Every test empties the database first and refuses to run unless its name ends in `_test`. CI runs it in the `browser` job beside `check`, with one retry and failure screenshots and traces kept 7 days. It is not a required check yet. Command: `npm run test:browser`.

From 7c: a two-row office menu on phones, everything else behind Menu. From 7b: one Vercel Firewall rule, 60 requests a minute per IP on the logged-out pages (`docs/firewall.md`). From 7a: 5 tries a minute per IP at login, setup, invite and reset.

## In progress

- This wrap-up: branch `docs/wrap-up-browser-tests` (handoff, plan status, session log), as its own small docs PR.
- Merged branches are kept on GitHub (deleting them is still open).

## Next steps

1. **PR 7e security review:** a review of the whole app, findings picked by the owner and fixed in their own PRs. Include logged-in routes having no Firewall limit. Its own session.
2. Watch the `browser` CI job over a few PRs ("flaky" in its log means a test passed only on its retry). Once it is reliable, make it a required check in GitHub.
3. Owner: try the live office on a real phone; confirm the 7a limit is per address (6 wrong logins on phone data, then a normal login from the laptop on Wi-Fi still works).
4. Still open from before: the CSV in Excel or Google Sheets; a live picture upload; the live 5c look, the gate swing, an office with 6+ projects.

## Open decisions (owner)

- Confirm or change Claude's choices in `docs/decisions.md`: 7d (walk with the machine buttons, not floor taps; tests on the built app on port 3100), 7c, 7a, 6c and 6b.
- One-line reasons for `docs/decisions.md`: PR 7's four choices, the 7b choices, the PR 6 choices, polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, 5c, the cubicle-row fix, 6a, 6b, 6c, 7a, 7b, 7c and 7d.
- Whether the first 7a commit message (wrong claim about preview builds) stays; Claude advises leaving it rather than rewriting `main`.
- Whether the bucket's Lifecycle is "Keep only the last version"; whether to delete merged branches; check-out confirmation; admins correcting a logged time; work periods in Everyone's time log or the CSV.

## Verified vs. not

- Tested (7d): lint, format check, typecheck, 188 Vitest tests locally; CI on #34 (browser job: 3 passed, 1 skipped, no retries, about 20 s desktop and 10 s phone). Locally, after the test fixes, the desktop 3D test passed 6 of 7 runs and the phone test the last 2 of 5. On the laptop, software graphics can freeze the page for 30 s or more after check-in. One slow desktop failure (over 150 s) is unexplained; its files were overwritten.
- Not verified: the browser job over many PRs; tapping the 3D floor; real phones, Safari, Firefox. Older: see the items in Next steps 3 and 4; `/api/auth` and `/reset` under a live burst; many people at once; invite and reset links live.

## Watch out for

- **Browser tests locally:** start a Postgres with a `_test` database (in the scratchpad, `npm install embedded-postgres`; port 54339, `office_test`), run `npm run db:migrate`, `npx playwright install chromium`, then `npm run test:browser` with `DATABASE_URL` set. A `next start -p 3100` already running is reused (skips the build; it must use the same env as `playwright.config.ts`). Stopping a background `npm run start` can leave the server on port 3100: check with `netstat -ano | grep :3100`.
- **Never run the browser tests and `npm test` at once on the same database**: both empty it.
- **Next.js keeps the previous page hidden in the document.** In tests, find things by role (`getByRole`) or filter to visible ones; a plain `getByLabel` can find two.
- **A sleeping laptop fails a long test** (`ERR_NETWORK_IO_SUSPENDED` in the trace). Each run overwrites `test-results/`; use `--output=<folder>` to keep a failure.
- **A Firewall burst test blocks the testing computer from the whole site for a few minutes.** Never run it from a computer someone is working on.
- **Vercel connection:** reading team settings needs the owner to approve an `authorize_team_access` link (team `jmvl1`, project `prj_ORM0HzS8dJVLOsWwozqHkJLgf8a6`). Changing the Firewall needs the owner's yes.
- **Chained checks:** `npm run format:check | tail` hides a failure; check the exit code. Logins in tests and local runs are limited too (5 a minute).
- **Production migrations run from the PR branch:** `gh workflow run migrate.yml --ref <PR branch>`, before merging.
- **Backblaze:** `.env.local` holds only the four `B2_` settings; Claude never reads it. Never run `vercel env pull`. Secrets never go in the chat.
- **Stacked PRs:** when two PRs both change `docs/HANDOFF.md`, build the second on the first's branch and merge in order.
- Working copies use Windows line endings. `gh pr create` needs `--body-file`. Shell one-liners with an apostrophe in the text break; write a script file instead. Vercel reports deploys as commit statuses (context `Vercel`).
