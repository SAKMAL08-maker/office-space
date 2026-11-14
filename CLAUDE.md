@AGENTS.md

# Office Space: project guide

3D top-down office web app. Users check in at a machine, walk to named offices, and work in cubicles tied to projects. A task is a project offered to someone, and it becomes their project if they accept it. Start each session by reading `docs/HANDOFF.md`. The full design is in `docs/PLAN.md`.

## Commands

- `npm run dev`: local server on port 3000
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`: the same checks CI runs
- `npm run format`: fix formatting
- `npm run db:generate`: write a new migration file after changing `src/db/schema.ts`
- `npm run db:migrate`: apply migrations to the database in `DATABASE_URL`

## Folder map

- `src/app/`: pages and API routes (`api/health` checks the database; `api/presence` takes each tab's "still here" and spot, behind the gate; `api/pictures/<id>` sends a profile picture to anyone logged in; `profile/` is where people change their own picture)
- `src/db/pool.ts`: the shared Postgres connection. All database access goes through it
- `src/db/schema.ts`, `src/db/client.ts`, `src/db/migrations/`: tables, typed queries, dated migrations
- `src/server/`: login setup and account rules (`session.ts` has `requireUser` and `requireAdmin`). `storage.ts` is the only code that talks to Backblaze; `attachments.ts` decides who may upload, see and remove project files; `pictures.ts` does the same for profile pictures
- `src/ui/`: shared form parts, and `avatar.tsx` (a picture, or initials on the person's shirt colour)
- `src/world/`: the 3D office. `layout.ts` places everything on a grid of one-metre cells, `path.ts` finds walks, and each 3D object has its own small component. The floor data comes from `src/server/floor.ts`, which checks the gate itself
- `scripts/set-bucket-cors.mjs`: lets the site's browsers upload to the bucket. Run once per site address
- `tests/`: Vitest tests
- `docs/`: plan, handoff, decisions, AI usage and session log
- `.github/workflows/ci.yml`: CI, with a real Postgres service
- `.github/workflows/migrate.yml`: applies migrations to production, started by hand

## Rules that must not break

- **Secrets:** real values live in Vercel env vars or `.env.local`. Only the blank `.env.example` is committed.
- **Check-in gate:** it must be enforced on the server with `requireCheckedIn()`. Hiding a button is not enough.
- **Attendance:** a record stays open until its owner checks out. Nothing closes it automatically. Log out is only offered after checking out.
- **Tasks and cubicles:** a task creates a project and its cubicle only when the receiver accepts it, in one transaction. Each active project has exactly one cubicle. At most 10 tasks can be waiting from one sender to one receiver.
- **Work periods:** only a cubicle's owner can start work there, while checked in, and each person has at most one open period. It ends on Stop working, starting elsewhere, checking out or finishing the project, each in the same transaction. Walking away does not end it.
- **Presence:** visible tabs report every 10 seconds; 2 minutes of silence shows someone as away. Away never checks anyone out or ends a work period. Only checked-in people are listed.
- **Files:** Backblaze storage stays private, with short-lived signed links only. A project's files are for its owner and its sender. Uploads stay "pending" until the server has seen the file in the bucket at the promised size, and are always stored to download, never to open in the page. Profile pictures are the one thing shown in the page: only through `api/pictures/<id>`, only once their first bytes prove PNG, JPEG or WebP, and only with the type the server found plus `nosniff` and a sandbox policy. Anyone logged in may see them; each person changes their own, and admins may remove any.
- **Database changes:** each one is a new dated migration file. Never edit an old migration. Production is changed only by the Migrate production workflow, after the owner has read the SQL.
- **Accounts:** public sign-up stays off. Accounts come only from `/setup` and invite links. Every admin action calls `requireAdmin()` on the server. Invite and reset links are stored only as hashes.
- **3D assets:** original shapes built in code. Each 3D object is its own small component.

## Hosting

Vercel for the app, Neon Postgres through the Vercel integration, Backblaze B2 for files. Deploys come from `main`. Merge only when the owner says so.
