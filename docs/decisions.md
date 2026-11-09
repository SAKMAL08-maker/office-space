# Decisions

One line per decision: what, why (where a reason was given), who decided, date.

## Product

- Accounts are invite only, with email and password, so that only the team can access the app and to avoid tanking or bombing it. Owner, 2026-11-10.
- People click to walk, and other workers update every few seconds. Owner, 2026-11-10.
- Backblaze stores task and project attachments, profile pictures and time log exports. Owner, 2026-11-10.
- There is one cubicle per project a user created and one per task assigned to them. Owner, 2026-11-10.
- Anyone can assign any number of tasks to anyone, and the assignee must approve before a cubicle appears. The assignee has the power to accept or reject assigned tasks, to avoid malicious or unnecessary tasks in their room and to choose whether they want the task. Owner, 2026-11-10.
- PR 7 adds protection against floods of traffic. Owner, 2026-11-10.
- The app uses Vercel's free plan. Owner, 2026-11-10.
- Preview deployments stay logged out until PR 6, when giving them their own database is decided. Owner, 2026-11-10.
- Attendance never closes by itself. It keeps running until the person checks out, even if they close the tab or keep it in the background. If they forget, using the check-in machine asks "You are still not checked out, would you like to?" with Yes and No, and Yes logs the check-out time. This replaces the 2-hour automatic close approved with the plan. Owner, 2026-11-10.
- There is a separate check-out machine next to the check-in machine. Owner, 2026-11-10.

## Approved defaults

Proposed by Claude and approved by the owner with the plan, 2026-11-10.

- A silent user shows as away after 2 minutes. An automatic close after 2 hours was also approved here, and the owner has since replaced it (see Product).
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

Recommended by Claude and chosen by the owner, 2026-11-10.

- Migrations run from a manual GitHub Actions workflow, after the owner has read the SQL. A Vercel build step was ruled out, because a preview build could change the live database.
- The first admin is created on a `/setup` page protected by a private `SETUP_TOKEN`, and the page locks once an admin exists.

Chosen by Claude while building PR 1, 2026-11-10.

- Invite links last 7 days and reset links last 24 hours, because an admin passes them on by hand. Each works once, and a newer link cancels the older one.
- Passwords need at least 12 characters.
- Admins choose Member or Admin when inviting, so a team can have more than one admin.

Chosen by Claude while building PR 2, 2026-11-10.

- The check-out machine checks out at once, with no question. It is greyed out while checked out.
- Time log pages do not need a check-in, so people can read their hours after checking out.
- Time log pages show the newest 200 records. Exports in PR 6 cover the full history.
- The database refuses to delete a person who has attendance records, so hours cannot vanish by accident.
