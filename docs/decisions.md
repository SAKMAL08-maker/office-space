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
- At most 20 files per project. Upload and download links work for 5 minutes. An upload not finished within an hour is cleared away (10 minutes since PR 7e, see below).
- Files can only be added once a task is accepted, so a waiting task has no files.

Proposed by Claude in the PR 6b plan and chosen by the owner ("go and apply your recommendations"), 2026-11-14.

- The browser crops a chosen picture to a square and shrinks it to a 256 x 256 JPEG before upload. This leaves hidden details such as a phone photo's location behind, and keeps pictures small.
- Being logged in is enough to set or see pictures; checking in is not needed. The Who's in list and the 3D office stay behind the gate.
- Admins can remove anyone's picture on the People page.
- Pictures show on the 3D name signs now: over other people's characters and over a working cubicle.

Chosen by Claude while building PR 6b, 2026-11-14, for the owner to confirm in review.

- Pictures are sent through the app's own address, not a bucket link, so browsers keep each one and the 3D signs can draw it. Each new picture has a new id.
- The app's `users.image` column is not used: the login library lets a person set it to any web address.
- People without a picture show their initials on a circle in their character's shirt colour, in black or white letters, whichever reads better.
- The file chosen may be up to 20 MB, because it is shrunk to about 30 KB before upload. The server still refuses anything over 2 MB.
- Replacing a picture deletes the old one. At most 3 uploads can be on the way at once, and one not finished within 10 minutes is cleared away.

Proposed by Claude in the PR 6c plan and chosen by the owner ("go and apply your recommendations"), 2026-11-17.

- The CSV shows times in the admin's own time zone, which the browser sends with the download and the column headers name. An unknown time zone falls back to UTC.
- The CSV holds every record, all time, oldest first. There is no date filter. A response over Vercel's 4.5 MB limit (roughly 40,000 records) would need one.
- The CSV holds check-ins and check-outs only, not work periods.

Chosen by Claude while building PR 6c, 2026-11-17, for the owner to confirm in review.

- Columns: Name, Email, Checked in, Checked out, Minutes. A record still open has blank Checked out and Minutes.
- A cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading `'`, so a spreadsheet shows it as text instead of running it as a formula.
- The download needs an admin, not a check-in, like the Everyone's time log page it sits on.

## PR 7 Hardening

Proposed by Claude in the PR 7 plan. The owner said "go" without changing them, so Claude's recommendations apply, 2026-11-18.

- PR 7 is split into five PRs, in this order: 7a login limits, 7b flood protection, 7c phone layout, 7d browser tests, 7e security review.
- Each IP address gets 5 tries a minute at logging in.
- Try counts are kept in the app's own database, not in Upstash Redis.
- The browser test runs in CI on every PR.

Chosen by Claude while building PR 7a, 2026-11-18, for the owner to confirm in review.

- Every login try counts, right or wrong, because that is how the login library counts. People sharing one office network share the 5 tries.
- The setup, invite and reset forms get the same 5 tries a minute per IP address, each form counted on its own.
- A refused visitor waits a full minute from their last allowed try. Refused tries do not make the wait longer.
- Limits are on in every environment, including local runs and tests, so they behave like the live site.

Recommended by Claude in the PR 7b plan and chosen by the owner ("go with your recommendation"), 2026-11-18.

- Flood protection is one Vercel Firewall rate-limit rule, because the free plan includes one. No limit in code.
- The rule covers only the logged-out pages (`/login`, `/setup`, `/invite`, `/reset`, `/api/auth`), so `/api/presence` and every logged-in page are never blocked.
- 60 requests a minute per IP address, answered with 429. Challenge was ruled out because login and logout are sent by the page's own code, which cannot show a browser challenge.
- The owner turns the rule on in the dashboard, following the steps in `docs/firewall.md`.
- Logged-in routes stay without a Firewall limit; this is looked at again in 7e.

Chosen by the owner after the live Firewall check, 2026-11-20.

- The unexplained whole-site refusal seen after a 61-request `curl` burst (see `docs/firewall.md`) is accepted. Claude's reason, accepted by the owner: real people stay far below 60 requests a minute on the logged-out pages.

Recommended by Claude in the PR 7c plan and chosen by the owner ("go with your recommendations"), 2026-11-20.

- On a phone (narrower than 640 px) the office menu shows only the two machine buttons and a Menu button. Everything else, Who's in and Inbox included, is behind Menu. Why: accepted Claude's recommendation.
- No dragging or pinching to move the camera, and no landscape layout, in 7c. Why: accepted Claude's recommendation.

Chosen by Claude while building PR 7c, 2026-11-20, for the owner to confirm in review.

- On a phone the greeting ("You checked in on…" or "You are checked out.") also moves behind Menu, to keep the bar to two rows.
- The hint says "Tap" on touch screens and "Click" with a mouse, decided by the browser's main pointer.
- Each machine has an unseen tap area a little bigger than the cabinet, because on a phone the cabinet is only about 30 points wide.
- Inside an office on a phone, the camera looks less far ahead, so the character stays clear of the cubicle panel. The lobby keeps the usual framing.
- The page is not stretched under the notch (`viewport-fit=cover` is left off), so the browser keeps every page clear of it by itself.

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

Recommended by Claude in the PR 7d plan and chosen by the owner ("go"), 2026-11-23.

- The browser test also runs at phone width with touch (375 px), because 7c had just changed the phone layout. Why: accepted Claude's recommendation.
- A second test covers the plain-buttons page for browsers without 3D. Why: accepted Claude's recommendation.
- The browser job is not a required check at first. It becomes one after a few PRs show it is reliable. Why: accepted Claude's recommendation.

Chosen by Claude while building PR 7d, 2026-11-23, for the owner to confirm in review.

- The test walks with the "Go to check-in machine" and "Go to check-out machine" buttons, not by tapping the 3D floor at a spot, which breaks whenever the camera moves.
- The tests run against the built app (`next build` and `next start`) on port 3100, and empty the `_test` database before each test.

Chosen by Claude while building PR 7e fix A (uploads), 2026-11-23, for the owner to confirm in review. The owner asked Claude to make all the review's fixes.

- A failed upload stays pending instead of being deleted at once, and is cleared 10 minutes after it started (upload links last 5). Deleting it while its link still worked could leave a stored file nothing points at.
- Removing a file works only on finished files; pending ones are left to that clean-up. A file or picture removed or replaced in its first 10 minutes is marked "removed" (a new status, one migration) and deleted by the same clean-up, so finishing it again cannot bring it back. Older ones are deleted at once, as before.
- A profile picture's first bytes are checked again every time it is sent, rather than copying each upload to a second key, because the bytes could be replaced while the upload link still works. A project file is not checked again: only its uploader could replace it, with a file of the same size, in those few minutes.
- File names also lose invisible formatting characters, such as right-to-left marks.

Chosen by the owner for PR 7e, 2026-11-23.

- The review's findings stay outside the repo, in a private file on the owner's laptop, until they are fixed; a short summary goes into `docs/` afterwards. Why: the repo is public (Claude's recommendation, accepted).
- The review was split between two read-only subagents, with Claude re-checking their findings. Why: the owner asked for Claude's recommendation.
- Claude builds all of the review's fixes, one PR each; the owner keeps the merges and says yes to each dashboard or GitHub setting change. Why: the owner asked Claude to do the work on its own.

Chosen by Claude while building PR 7e fix B (security headers), 2026-11-24, for the owner to confirm in review.

- Every path gets `frame-ancestors 'none'` plus `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin` and a Permissions-Policy turning off camera, microphone, location, payment and USB. A full script policy (CSP with nonces) is left for later: it would make every page dynamic and needs testing against the 3D scene.
- Because Next.js drops a route's header when the config already set it, the picture route's sandbox policy and the download route's no-referrer are repeated in `next.config.ts`, and a test checks them.

Chosen by Claude while building PR 7e fix C (limits), 2026-11-24, for the owner to confirm in review.

- Each person may have 30 active projects (cubicles). Creating, accepting a task and reopening are refused past that; a refused accept leaves the task waiting. Finished projects do not count.
- The floor loads only the cubicles of the offices it shows, at most 200 × 30.
- Logged-in limits are per person, never per IP, so an office sharing one network is never blocked: presence 20 a minute (a tab sends 6), upload start and finish together 30 a minute. They use the same `rate_limits` table as the form limits. A refused presence beat is answered 429 and the tab simply tries again on its next beat.

Chosen by Claude while building PR 7e fix E (migrate approval), 2026-11-24, for the owner to confirm in review.

- The production secret moves into a GitHub Environment `production` with the owner as required reviewer, and the repository secret is deleted. No branch restriction on the environment, because migrations run from the PR branch before merging; the approval is the check instead.
