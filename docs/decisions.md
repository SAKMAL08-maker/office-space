# Decisions

One line per decision: what, why (where a reason was given), who decided, date.

## Product

- Accounts are invite only, with email and password. Owner, 2026-11-10.
- People click to walk, and other workers update every few seconds. Owner, 2026-11-10.
- Backblaze stores task and project attachments, profile pictures and time log exports. Owner, 2026-11-10.
- There is one cubicle per project a user created and one per task assigned to them. Owner, 2026-11-10.
- Anyone can assign any number of tasks to anyone, and the assignee must approve before a cubicle appears. Owner, 2026-11-10.

## Approved defaults

Proposed by Claude and approved by the owner with the plan, 2026-11-10.

- A silent user shows as away after 2 minutes. After 2 hours the record closes at the last signal and is marked auto-closed, so hours are not inflated.
- Users see their own time log. Admins see everyone's and can export them.
- A finished task or archived project loses its cubicle, and its history stays in the time log.
- Only a cubicle's owner can start work there.
- A plain list of who is working on what backs up the 3D view, for phones, keyboard users and devices that cannot run 3D.

## Technical

Recommended by Claude and approved by the owner with the plan, 2026-11-10.

- Backend checks every 10 seconds rather than a realtime service, because Vercel cannot hold open connections and this avoids another paid account.
- Browsers upload straight to Backblaze with signed links, because Vercel limits request bodies to about 4.5 MB.
- Logic is built before the 3D world, so the rules are tested first and the scene only displays them.
- The `pg` driver is used so the same code runs on Neon and on the Postgres in CI.
