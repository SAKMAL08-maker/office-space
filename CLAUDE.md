@AGENTS.md

# Office Space: project guide

3D top-down office web app. Users check in at a machine, walk to named offices, and work in cubicles tied to projects and tasks. Start each session by reading `docs/HANDOFF.md`. The full design is in `docs/PLAN.md`.

## Commands

- `npm run dev`: local server on port 3000
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`: the same checks CI runs
- `npm run format`: fix formatting

## Folder map

- `src/app/`: pages and API routes (`api/health` checks the database)
- `src/db/pool.ts`: the shared Postgres connection. All database access goes through it
- `tests/`: Vitest tests
- `docs/`: plan, handoff, decisions, AI usage and session log
- `.github/workflows/ci.yml`: CI, with a real Postgres service

## Rules that must not break

- **Secrets:** real values live in Vercel env vars or `.env.local`. Only the blank `.env.example` is committed.
- **Check-in gate:** it must be enforced on the server. Hiding a button is not enough.
- **Cubicles:** a task assigned by someone else creates a cubicle only after the assignee approves it.
- **Files:** Backblaze storage stays private, with short-lived signed links only.
- **Database changes:** each one is a new dated migration file. Never edit an old migration.
- **3D assets:** original shapes built in code. Each 3D object is its own small component.

## Hosting

Vercel for the app, Neon Postgres through the Vercel integration, Backblaze B2 for files. Deploys come from `main`. Merge only when the owner says so.
