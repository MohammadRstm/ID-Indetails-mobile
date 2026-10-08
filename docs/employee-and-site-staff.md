# Employees and site staff (Phase 2)

What the phone does for Design employees and Execution site staff, and how its moving parts fit together. The plan behind it is [phase-0-plan.md](phase-0-plan.md) (sections 8–12 and 16–18); the API endpoints are in the API repo's `docs/me.md`, `design.md`, `execution.md`, `messaging.md` and `notifications.md`.

## Screens

| Screen | Who | What |
|---|---|---|
| Today (Design) | Design employees | The timer, stopped runs still to log, today's hours against the day with a day ruler, the week's progress, deadlines, today's meetings, Log work |
| Today (Execution) | Site staff | Pending-records banner, Add materials, my sites (last recorded), this week's labour status per site, open requirements |
| Work | `work_entry:create` + `view_own` | The week (bars, a day's entries, every entry by day), overtime by month, the hours balance |
| Entry | `work_entry:view_own` | One entry with its photo and comments; edit and delete with Undo while `canEdit` |
| Log work | `work_entry:create` + `view_own` | Project, day, start and end, description, one photo; the API's overtime preview; "Use a timer instead" |
| My pay | `work_entry:view_own` | A month's hours as pay counts them, day by day, and its excuses. **No amounts**: salary stays on the web |
| Sites | `material:create` or `:manage` | Open sites, the ones recorded on most recently first |
| Materials, Add materials | the same | A site's materials (read, paged, no costs); the Add materials sheet |
| Labour, Labour week | `labour_report:create` or `:manage` | A site's weeks; one week's days (workers, daily pay) and note |
| Pending records | the same | Everything recorded on the phone, with its state and what can be done |
| Projects, Project, Requirements, My requirements | `project:view`, `requirement:view` | Read-only projects; ticking off one's own requirements (`requirement:complete_own`) |
| Meetings, New meeting, Meeting | `project:view`; `meeting:create` to set, `meeting:manage` or one's own to change | |
| Messages, Team chat, Direct chat | Signed in | Conversations, threads, @mentions, photos and videos |
| Alerts, Notifications settings | Signed in | The notification list; quiet hours and muted categories |
| Profile | Signed in | Photo, details, permissions and where they come from |

Money is never shown to these people: no site cost, ground labour or salary figures. The values a person types (a material's cost, a day's pay) are shown only where they type them, and in their own unsent records.

## The timer

- A start time per person in the key-value store (`idi.timer.<userId>`), never a running process: it survives the app being killed and the phone restarting.
- Starting posts a local notification on the `timer` channel (sticky on Android) with a **Stop** button (category `timer`), and schedules "Your timer is still running" 4 hours after the start. Stop opens the log sheet filled in from the run.
- A stopped run stays as a "Time to log" card until it is logged or discarded, so logging can wait for a connection.
- It shows only while the Design domain's `timerEnabled` is on. `timer/liveActivity.ts` (Phase 5) is called on start and stop.

## Logging work

- The sheet checks what the web checks (5 minutes to 16 hours, not in the future unless allowed, no overlap unless allowed); the API checks everything again and its codes become words (`edit_window_closed`, `month_closed`, …).
- **A lost answer:** a retried log that comes back `422 entry_overlaps` is looked for on the day (`/me/day`); an identical entry (same project, start and end) means the first try saved it.

## Offline: the outbox

`src/offline` keeps materials and labour weeks recorded without signal (phase-0-plan.md sections 10–11).

- **The table** `outbox` in `outbox.db` (SQLite) has the plan's columns. Payloads are checked with Zod when written and read.
- **Materials:** one row per saved batch; each material gets a `clientRef` (UUID) when it is saved, kept through every retry, so the API never saves it twice.
- **Labour weeks:** at most one unsent row per person, site and week (a newer edit replaces it). It carries the week's `version` as `expectedVersion`; `409 labour_week_changed` makes it "Needs attention" with **Use mine** (resend against the new version) and **Keep theirs** (delete it).
- **The sync engine** (`sync.ts`) sends the signed-in owner's due records, oldest first, one at a time: after a save, when the network returns, on return to the foreground, on a timer, and through `registerBackgroundSync` (Phase 5). The state machine is `model.ts` (`classify`, `nextState`, `backoffMs`): network or 5xx back off 5 s, 30 s, 2 min, 10 min; 429 waits for `Retry-After`; 401 pauses the whole queue; 400/403/404/409/422 need attention and are never retried by themselves.
- **Owners:** records belong to who made them; another person signing in sees none of them, and they are deleted after 30 days. Sent records are kept 7 days.
- **Reading offline:** for people who record on site, the queries under `projects`, `materials`, `labour`, `requirements/mine`, `company` and `domainSettings` are kept per person (`idi.queryCache.<userId>`), and screens say "You're offline. Showing what was loaded at …".

## Push, alerts and live updates

- **Channels** (`src/push/channels.ts`) are exactly those of contracts.md section 3.
- **Registration** (`src/push/register.ts`): the permission is asked once, on the first signed-in start; then `PUT /api/me/devices`, and again on a new token. The Expo push token needs the EAS project id (`extra.eas.projectId` in the app config); without it push stays off.
- **In the foreground** the system shows nothing: a push reloads the queries it names and appears as an in-app banner, except a message for the chat already open.
- **A tap** (`src/push/respond.ts`): a push for anyone but the signed-in person is ignored; `handleNotificationAction` (Phase 5) goes first; otherwise `routeForTarget`, or Alerts when the person can't open the target.
- **Alerts** words notifications as the web does (`features/notifications/words.ts`, ported from `notificationWords.ts`) and opens each one's target.
- **Live** (`src/live`): the SignalR connection is open only in the foreground, with the access token in a header; its signals and every reconnect reload notifications and messages. The tab badges (`useTabBadges`) and the app icon badge follow.

## Wiring it into the app

- `<SignedInServices />` (`src/live/SignedInServices.tsx`) runs the sync engine, the kept cache, push and the live connection. Render it once inside the signed-in, unlocked part of the app (`app/(app)/_layout.tsx`), so a notification tap opens its screen only after the lock.
- `useUnsentRecordsGuard()` (`src/offline/signOutGuard.tsx`) returns `{ signOut, dialog }`: sign-out asks first when records haven't been sent (Send now, or Sign out and delete them, asked twice), then calls `useSession().signOut()`. The person's kept queries, badge and timer notification are removed by a cleanup registered with `onSignOut` (`src/live/signOutCleanup.ts`), so it runs for every way out, including the lock's Sign out and an ended session; the session clears the cached photos. The More and Settings screens' sign-out use it.
