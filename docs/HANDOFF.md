# Handoff — 2026-11-10

## Where things stand

PR 0 (Foundation) is merged and live at https://office-space-tawny.vercel.app. PR 1 (Accounts) is built on branch `feat/accounts` and is waiting for review. It is not merged, and its migration has not been applied to the live database.

PR 1 adds the database tables, email and password login, the `/setup` page for the first admin, invite links, and password reset links. Admins manage these at `/admin/people`.

## Going live with PR 1 (in this order)

The owner types every secret into a hidden prompt in their own terminal, never into the chat.

1. Create two random values, one for each setting below, with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Keep the second one for step 5.
2. Add them to Vercel's Production environment: `npx vercel env add BETTER_AUTH_SECRET production` and `npx vercel env add SETUP_TOKEN production`.
3. Store the Neon direct-connection address (the one without `-pooler`) for the migration workflow: `gh secret set MIGRATE_DATABASE_URL`.
4. Say "merge it". Then, after the owner's yes to the SQL, run the **Migrate production** workflow. `/` shows an error until this finishes. There are no users yet, so that does no harm.
5. Open `/setup` on the live site and create the first admin with the setup token.

From PR 2 on, migrations run before the merge: `gh workflow run migrate.yml --ref <branch>`. PR 1 cannot do that, because GitHub only offers a manual workflow once its file is on `main`.

## Next steps

1. Finish the going-live list above.
2. Start PR 2 (Attendance). See `docs/PLAN.md`.
3. Add Playwright to the repo when PR 2 or later writes the first committed browser test. It is not installed yet.

## Open decisions (owner)

- Why invite-only, and why must an assignee approve a task before it creates a cubicle? Record the owner's words in `docs/decisions.md`.
- Which Vercel plan to use. Hobby excludes commercial use, so a company team needs Pro.
- Whether preview deployments get their own Neon database. Until then, leave `BETTER_AUTH_SECRET` out of Vercel's Preview environment, so a preview cannot log anyone in.

## Verified vs. not

- Tested on a throwaway local Postgres 18: the migration, and 27 Vitest tests (setup lock, simultaneous submits, invites, reset links, server-side admin checks).
- Tested in a headless browser against a local production build on that same database: the whole flow from first admin to invite, reset and log out, plus the login limit. Rendered at 1280px and 390px wide.
- Not verified: anything on Vercel or Neon with this PR. The workflow in `.github/workflows/migrate.yml` has not run yet, because GitHub cannot start it until it is on `main`.

## Watch out for

- `vercel link` writes a `VERCEL_OIDC_TOKEN` to `.env.local` and appends `.vercel` and `.env*` to `.gitignore`, which cancels the `!.env.example` exception. This folder is already linked. If it is relinked, delete that file and run `git restore .gitignore`.
- Vercel settings only reach deployments built after they are added, so redeploy after changing one.
- Do not run `vercel env pull`, because it copies real secrets to this PC. `vercel env ls` shows names only.
- The Neon setup added `NEON_AUTH` settings. They are unused, because the plan uses Better Auth.
- Agreed limits on the Vercel login: reading status and logs is automatic; redeploys and setting changes need the owner's yes.
- `@types/node` must stay at 24 or higher for Vitest.
- The account tests empty every table, so they only run when the database name ends in `_test`.
- This Next.js keeps a visited page alive but hidden after an in-app move. Login and logout use a full page load so that no password or private page stays in the browser.
- The login limit (3 tries in 10 seconds per address) is kept per server instance and is shared by everyone behind one office connection. PR 7 replaces it.
