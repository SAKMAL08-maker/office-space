# Decisions

One line per decision: what, why (where a reason was given), who decided, date.

## Product

- Accounts are invite only, with email and password, so that only the team can access the app and to avoid tanking or bombing it. Owner, 2026-11-10.
- People click to walk, and other workers update every few seconds. Owner, 2026-11-10.
- Backblaze stores task and project attachments, profile pictures and time log exports. Owner, 2026-11-10.
- There is one cubicle per project a user created and one per task assigned to them. Owner, 2026-11-10. The owner has since clarified this (see the task decision below).
- Anyone can assign any number of tasks to anyone, and the assignee must approve before a cubicle appears. The assignee has the power to accept or reject assigned tasks, to avoid malicious or unnecessary tasks in their room and to choose whether they want the task. Owner, 2026-11-10. The number is now limited (see below).
- PR 7 adds protection against floods of traffic. Owner, 2026-11-10.
- The app uses Vercel's free plan. Owner, 2026-11-10.
- Preview deployments stay logged out until PR 6, when giving them their own database is decided. Owner, 2026-11-10.
- Attendance never closes by itself. It keeps running until the person checks out, even if they close the tab or keep it in the background. If they forget, using the check-in machine asks "You are still not checked out, would you like to?" with Yes and No, and Yes logs the check-out time. This replaces the 2-hour automatic close approved with the plan. Owner, 2026-11-10.
- There is a separate check-out machine next to the check-in machine. Owner, 2026-11-10.
- Tasks are projects being given to users. It is called a task until accepted, then it is turned into a project. Anyone can send tasks to anyone, and the receiver has the power to accept or reject. So every cubicle belongs to a project, and tasks never sit inside projects. Owner, 2026-11-10.
- At most 10 tasks can be waiting from one sender to one receiver. Answering or cancelling one frees a slot. Owner, 2026-11-10.
- Tasks and projects have a title and an optional description. Owner, 2026-11-10.
- A project's owner can edit its title and description. Owner, 2026-11-10.
- Once a task is accepted, the sender is only credited on the project and has no control over it. Owner, 2026-11-10.
- A project ends with one Finish button, and the owner can reopen it. Owner, 2026-11-10.
- The lobby, floor and offices are one connected world you walk through, rather than separate screens. The camera glides closer when you enter an office. Owner, 2026-11-10.

## Approved defaults

Proposed by Claude and approved by the owner with the plan, 2026-11-10.

- A silent user shows as away after 2 minutes. An automatic close after 2 hours was also approved here, and the owner has since replaced it (see Product).
- Users see their own time log. Admins see everyone's and can export them.
- A finished task or archived project loses its cubicle, and its history stays in the time log. The owner has since replaced tasks and archiving here with Finish and Reopen on projects (see Product).
- Only a cubicle's owner can start work there.
- A plain list of who is working on what backs up the 3D view, for phones, keyboard users and devices that cannot run 3D.

## PR 6 Backblaze

Chosen by the owner when PR 6 started, 2026-11-11.

- PR 6 is split into three PRs: 6a attachments, 6b profile pictures, 6c CSV export.
- Time-log CSV exports are built on the spot and downloaded directly. They are not stored in Backblaze, so there is no `time_exports` table.
- A project's files can be seen and downloaded by its owner and by the person who sent it as a task.
- Uploads are tested locally against the real bucket, then checked on the live site after merging. Preview deployments stay logged out.

Proposed by Claude in PR 6a, 2026-11-11, and confirmed by the owner, 2026-11-12.

- The owner and the sender can both add files, only while the project is active. Old files stay downloadable after Finish.
- The uploader or the project's owner can remove a file.
- At most 20 files per project. Upload and download links work for 5 minutes. An upload not finished within an hour is cleared away.
- Files can only be added once a task is accepted, so a waiting task has no files.

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

Proposed by Claude in the PR 3 plan, with no objection from the owner, 2026-11-10.

- Finishing a project deletes its cubicle row and keeps the project. Reopening gives it the owner's lowest free seat, which may not be its old one.
- People see only their own tasks and projects until PR 5. Since PR 5a, anyone checked in can read any active project's title, description and sender in its cubicle, as the plan says. Tasks and finished projects stay private.
- Titles can be up to 120 characters, descriptions 2,000 and reject reasons 500.

Chosen by Claude while building PR 3, 2026-11-10.

- Every Projects, Inbox and Sent page and action needs a check-in, not only the actions.
- A task cannot be sent to yourself. Creating a project does the same job.
- The "Send to" list shows names only, so email addresses stay visible only to admins.
- A finished project cannot be edited until it is reopened.
- Each list shows at most 200 records. Active projects are listed first, so the limit can only hide old finished ones.

Chosen by Claude while building PR 4, 2026-11-10.

- The server sends the floor (names, offices, cubicle seats) only to people who are checked in. Before that, the browser gets the lobby and nothing else.
- Offices are ordered by name, in up to 4 columns, with each door facing the lobby. The floor shows at most 200 offices.
- Name plates and signs are drawn inside the 3D scene with the browser's own font. Signs laid over the page as HTML crashed when leaving the page, and this also avoids loading fonts from other sites.
- The menu over the scene keeps "Go to check-in machine" and "Go to check-out machine" buttons, which walk the character there. This keeps the machines usable from a keyboard.
- Browsers that cannot draw 3D get the machines as plain buttons, until the "who's working" list arrives in PR 5b. Done in PR 5b: they also get the "Who's in" list.
- Your position is not saved. Reloading the page starts you in the lobby. Saving positions belongs with presence in PR 5. Since PR 5a, someone who reloads while working starts in their chair. Since PR 5b, your spot is shared with others while you are checked in, but a reload still starts you in the lobby or your chair.
- Cubicles show no project names yet. The details panel and labels come in PR 5. Done in PR 5a.

Recommended by Claude in the PR 5 plan and chosen by the owner ("go"), 2026-11-11.

- PR 5 is split in two: 5a Working (details panel, start and stop working, indicators, nicer furniture and character, work periods in the time log) and 5b Presence (other people's characters, updates every 10 seconds, away, the "who's working" list), so each PR stays small enough to review.
- There is a Stop working button, for breaks, as well as switching cubicles and checking out.
- Finishing a project ends any work period open on it.
- My time log shows work periods per project, so the recorded time is visible.

Chosen by Claude while building PR 5a, 2026-11-11.

- Walking away from your desk does not stop work. Only Stop working, starting elsewhere, checking out or finishing the project end a period.
- My projects also has Start working here and Stop working, so browsers without 3D can work too.
- A floating label shows only over occupied cubicles. Any cubicle shows its details when clicked.
- An office's name plate reads "Name · working" in amber while its owner works there. A separate badge overlapped the name plate when seen from far away.
- Until PR 5b, other people's starts and stops show after a page reload. Your own show at once. Done in PR 5b: others' show within 10 seconds.
- A machine button pressed while the scene is still loading now walks the character once it loads. Before, that press was lost.

Chosen by the owner in the PR 5b plan, 2026-11-11.

- Other people appear at live spots: each open tab sends its grid cell every 10 seconds, and other people walk there. Why: "live spots are better so it's more interactive seeing a live office working with co workers".
- When a cubicle appears or goes, other people's floors refresh by themselves, without a reload.
- Someone away shows as a faded grey character where they were last seen, labelled "Name · away".

Chosen by Claude while building PR 5b, 2026-11-11.

- Away is worked out by the database clock, so a wrong clock on someone's computer cannot change it. A spot sent before the latest check-in is ignored.
- Without a spot, a person is drawn in the chair where they work, else just inside their office door, else in the lobby. A browser without 3D sends no spot.
- My projects, Inbox and Sent also say "still here", so reading the inbox does not make someone away.
- The button over the scene is called "Who's in", because the admin's menu already has "People" (the accounts page).
- At their desk, a person's own name label is hidden: the cubicle's label already names them, and the two overlapped.
- The viewer's own office keeps the floor's data, not presence's, so their own Start working does not flicker off while presence catches up.

Chosen by the owner after PR 5b, 2026-11-11.

- Claude Code's automatic safety check stays on, and no permission rule lets Claude start production migrations. Why: "it allows me to do manual reviews on actions that causes the check". The owner starts the Migrate production workflow with `!`.
