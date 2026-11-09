# Handoff — 2026-11-10

## Where things stand

PR 0 (Foundation) is merged as PR #1 (`eab3b5f`). The placeholder app is live at https://office-space-tawny.vercel.app, and `GET /api/health` returns `{"ok":true}` from Neon. CI runs lint, format, typecheck, tests and build against a real Postgres. The Vercel project is `jmvl1/office-space`, and merges to `main` deploy automatically.

## In progress

Nothing is half-built. The only open item is this wrap-up docs PR.

## Next steps

1. Start PR 1 (Accounts): database schema with Drizzle, Better Auth login, invite links, first admin account, password reset by admin link. See `docs/PLAN.md`.
2. In PR 1, agree with the owner how database migrations are run. `DATABASE_URL` is not set for Vercel's Development environment, and secrets must stay out of the chat.
3. Add Playwright when the first browser test is written. It is not installed yet.

## Open decisions (owner)

- Why invite-only, and why must an assignee approve a task before it creates a cubicle? Record the owner's words in `docs/decisions.md`.
- Which Vercel plan to use. Hobby excludes commercial use, so a company team needs Pro.

## Verified vs. not

- Tested: all CI checks on PR #1, including the real Postgres health test (3 of 3). Live `/api/health` on Neon returned 200 after the redeploy. Production dependency audit reported 0 vulnerabilities.
- Only rendered: the placeholder page at 1280px and 500px wide, on a local production build.
- Not verified: preview deployments reaching a database.

## Watch out for

- `vercel link` writes a `VERCEL_OIDC_TOKEN` to `.env.local` and appends `.vercel` and `.env*` to `.gitignore`, which cancels the `!.env.example` exception. This folder is already linked. If it is relinked, delete that file and run `git restore .gitignore`.
- Vercel settings only reach deployments built after they are added, so redeploy after changing one.
- Do not run `vercel env pull`, because it copies real secrets to this PC. `vercel env ls` shows names only.
- The Neon setup added `NEON_AUTH` settings. They are unused, because the plan uses Better Auth.
- Agreed limits on the Vercel login: reading status and logs is automatic; redeploys and setting changes need the owner's yes.
- `@types/node` must stay at 24 or higher for Vitest.
