# Handoff — 2026-11-10

## Where things stand

PR 0 (Foundation, #1) and PR 1 (Accounts, #3, merge `f50d3b0`) are merged and live at https://office-space-tawny.vercel.app. Login, invite links and password reset links work, and admins manage them at `/admin/people`. The first migration is applied to Neon through the Migrate production workflow. `/setup` has locked itself, which means the owner's admin account exists.

Merges to `main` deploy automatically. CI runs lint, format, typecheck, migrations, tests and build against a real Postgres.

## In progress

Only this wrap-up docs PR. Nothing is half-built.

## Next steps

1. Start PR 2 (Attendance): check-in and check-out rules, the server gate `requireCheckedIn()`, and the time log page. See `docs/PLAN.md`. Log out must only be offered after checking out, so the Log out button on the home page has to change.
2. For any later migration, show the owner the SQL, get a yes, then run `gh workflow run migrate.yml --ref <branch>` before merging.
3. Add Playwright to the repo when the first committed browser test is written. It is not installed yet.

## Open decisions (owner)

- Why must an assignee approve a task before it creates a cubicle? Record the owner's words in `docs/decisions.md` by PR 3.
- PR 7: Claude recommends adding protection against floods of traffic, because the owner chose invite-only partly to avoid the app being bombed, and the login page is still public. The owner has not decided yet.
- Whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment, so a preview cannot log anyone in.
- Which Vercel plan to use. Hobby excludes commercial use, so a company team needs Pro.

## Verified vs. not

- Tested: 27 Vitest tests in 5 files, on Postgres 17 in CI and on a throwaway local Postgres 18. Headless browser walk-through of the whole accounts flow on a local production build, at 1280px and 390px wide.
- Tested live: the migration workflow succeeded. `/setup` showed its form and then locked. `/api/health` returned 200, public sign-up returned 404, and a made-up login returned 401.
- Not verified: a direct query of the live tables, because Claude does not hold the database address. Invite and reset links on the live site. Preview deployments reaching a database.

## Watch out for

- `vercel link` writes a `VERCEL_OIDC_TOKEN` to `.env.local` and appends `.vercel` and `.env*` to `.gitignore`, which cancels the `!.env.example` exception. This folder is already linked. If it is relinked, delete that file and run `git restore .gitignore`.
- Vercel settings only reach deployments built after they are added, so redeploy after changing one. Do not run `vercel env pull`, because it copies real secrets to this PC. `vercel env ls` shows names only.
- Agreed limits on the Vercel login: reading status and logs is automatic; redeploys and setting changes need the owner's yes.
- Secrets go in a separate PowerShell window, never through `!`. In the owner's PowerShell, `node -e` with brackets and quotes failed, so use PowerShell-only commands there.
- With `cacheComponents` on, anything reading cookies, headers, params or the database must sit inside `<Suspense>`. Read the request before touching `getAuth()`, so builds work without secrets.
- This Next.js keeps a visited page alive but hidden after an in-app move. Login and logout use a full page load so that no password or private page stays in the browser.
- The account tests empty every table, so they only run when the database name ends in `_test`. `@types/node` must stay at 24 or higher for Vitest.
- The login limit (3 tries in 10 seconds per address) is kept per server instance and is shared by everyone behind one office connection. PR 7 replaces it.
