# Phone app investigation

What the ID InDetails system is, how the web app looks, how sign-in and permissions work, and what a phone app would add. It was written on 8 Oct 2026, before any mobile code, by reading:

- the API: `ID-Indetails` (ASP.NET Core .NET 10 on MySQL), at commit `90a43d5`;
- the web client: `Ident-Internal-Management-System-client` (React 19, Vite, React Query), branch `MR-Proton-Navigation`.

The server stays the same. The phone app is a new client of the same API. New endpoints are allowed, and the website is not changed. Every database change needs explicit approval first (the API's CLAUDE.md, section 9).

## Contents

1. [What the system is](#1-what-the-system-is)
2. [How it looks](#2-how-it-looks)
3. [Sign-in](#3-sign-in)
4. [Roles, domains and permissions](#4-roles-domains-and-permissions)
5. [Screens on the web](#5-screens-on-the-web)
6. [Notifications, live updates and messaging today](#6-notifications-live-updates-and-messaging-today)
7. [Files](#7-files)
8. [Proton](#8-proton)
9. [API conventions](#9-api-conventions)
10. [What a phone app adds](#10-what-a-phone-app-adds)
11. [A better notification system](#11-a-better-notification-system)
12. [Server work needed](#12-server-work-needed)
13. [Recommended approach](#13-recommended-approach)
14. [Open decisions](#14-open-decisions)

---

## 1. What the system is

ID InDetails (called "Hourline" internally) is the internal platform of an interior design and fit-out company in Beirut. It has three areas:

| Area | What happens there |
|---|---|
| **Design** | Designers log their hours on projects. Their pay, overtime and hours balance are worked out from those hours. |
| **Execution** | Construction sites. Site staff record materials and weekly ground labour; statements go to the client. |
| **Company** | Overhead, salaries, working time, schedules and the overall profit and loss. |

Shared by all of them: projects, requirements (tasks), meetings, clients, invoices and payments, team and direct messaging, notifications, and **Proton**, an AI assistant built on Claude.

- Company time zone: `Asia/Beirut`. Every date is shown in it, never in the device's.
- Currencies: USD and LBP.
- Production: a Hostinger VPS. Caddy (TLS) → the web container's nginx, which serves the app and proxies `/api` and `/hubs` to the API. Only the web container is exposed, so the API's public base is `https://<domain>/api`.
- Single API instance: presence, Proton conversations, live connections and uploaded files all live on that one machine.

## 2. How it looks

The web app reuses the prototype's stylesheet unchanged (`src/styles/hourline.css`). Everything comes from CSS tokens, so the look can be copied exactly.

### Theme

- **Light is the default** (the web README's "dark by default" is out of date). Dark is a full second theme.
- Stored in localStorage `hl-theme`. The web ignores the device's light/dark setting.
- The toggle shows a moon in light mode and a sun in dark mode.

### Colour tokens

| Token | Light | Dark |
|---|---|---|
| `--ground` | `#F2F5F4` | `#0B1011` |
| `--surface` | `#FFFFFF` | `#131A1B` |
| `--surface-2` | `#F7FAF9` | `#182122` |
| `--surface-3` | `#EDF1F0` | `#1E2829` |
| `--ink` | `#111819` | `#E6EDEB` |
| `--ink-2` | `#4A5553` | `#A7B3B0` |
| `--ink-3` | `#697572` | `#7B8986` |
| `--line` | `#E2E7E5` | `#243032` |
| `--line-2` | `#CED6D3` | `#33403F` |
| `--accent` | `#0C6B69` | `#36B0A6` |
| `--accent-2` | `#095957` | `#4CC3B8` |
| `--accent-soft` | `#DDEFEC` | `rgba(54,176,166,.16)` |
| `--accent-ink` | `#0A5654` | `#5CC7BC` |
| `--on-accent` | `#FFFFFF` | `#04201E` |
| `--now` (live, unread, overdue, danger) | `#D9432E` | `#FF6B57` |
| `--now-soft` | `#FBE7E2` | `rgba(255,107,87,.16)` |
| `--ok` / `--ok-soft` | `#178A4B` / `#E4F3EA` | `#34C377` / `rgba(52,195,119,.14)` |
| `--warn` / `--warn-soft` / `--warn-mark` | `#86560A` / `#FBEFD6` / `#C58200` | `#F2C063` / `rgba(242,192,99,.14)` / `#E0A63F` |
| `--done` / `--done-soft` | `#3F4B63` / `#ECEFF5` | `#B7C2DA` / `rgba(183,194,218,.13)` |
| `--arch` / `--arch-soft` | `#6B7774` / `#EFF2F1` | `#8B9895` / `rgba(139,152,149,.13)` |
| `--heat-0` … `--heat-4` | `#EDF1F0` `#7CC3B7` `#46A596` `#1E8378` `#0C5F59` | `#1B2527` `#1F5A55` `#24817A` `#3AAA9F` `#7AD6CB` |
| `--chart` / `--chart-soft` | `#13807A` / `rgba(19,128,122,.12)` | `#3DB5AB` / `rgba(61,181,171,.16)` |
| `--ghost` / `--ghost-soft` | `#A3AFAB` / `#E7ECEA` | `#4A5856` / `#212C2D` |
| `--grid` / `--axis` | `#E7ECEA` / `#CED6D3` | `#1F292B` / `#33403F` |
| `--cost` / `--cost-2` | `#8A9693` / `#B8C2BF` | `#5E6C6A` / `#3C4847` |
| `--profit` / `--loss` | `#178A4B` / `#C2402C` | `#34C377` / `#FF7A66` |

Shadows (only on floating layers: menus, modals, toasts):

- Light: `--shadow-1: 0 1px 2px rgba(16,25,26,.05)`; `--shadow-2: 0 10px 30px -12px rgba(16,25,26,.22), 0 2px 8px rgba(16,25,26,.06)`; `--shadow-3: 0 24px 60px -18px rgba(16,25,26,.32), 0 4px 12px rgba(16,25,26,.08)`.
- Dark: the same shapes in black at .4 / .7 + .35 / .8 + .4.

Scrims: modal `rgba(9,15,16,.45)`, drawer `rgba(9,15,16,.4)`, media viewer `rgba(4,7,8,.86)`.

Invoices, statements and reports always render on white "paper", even in dark mode.

### Type

- **Archivo** (text) and **Martian Mono** (numbers), both variable fonts **with the width axis**. The design depends on it, so bundle the variable versions.
- Base: 13px, line height 1.45.
- Numbers: Martian Mono at width 78%, tabular figures, letter-spacing -.015em.
- Headings: Archivo widened to 104–108% with negative letter-spacing.
- Micro-labels: 10px, uppercase, 600, letter-spacing .1em, `--ink-3`.

| Role | Size / weight / tracking |
|---|---|
| Hero figure | 42px / 650 / -.03em, width 104% |
| Large money | 30px / 650 / -.025em |
| Page title | 21px / 650 / -.02em, width 106% |
| KPI value | 19px / 650 / -.02em |
| Modal title | 15px / 650 |
| Card title | 14px / 650 |
| Panel title | 13.5px / 650 |
| Body, inputs | 13px |
| Buttons, tabs, table cells | 12.5px (buttons and tabs 550) |
| Field label | 11.5px / 600, `--ink-2` |
| Badge | 11px / 600 |
| Table header, nav section | 10px / 600 uppercase |

Weights in use: 500, 550, 600, 650 (the main "bold"), 700.

### Shape, spacing and motion

- Radii: `--r1` 6px (buttons, nav items), `--r2` 9px (panels, cards, menus, toasts), `--r3` 14px (modals). Inputs 8px. Pills, badges and counts fully rounded. Avatars round.
- Borders: 1px hairlines in `--line`; buttons and inputs use `--line-2`. A 3px accent stripe on the left marks task cards and Proton action cards.
- Focus: 2px accent outline; inputs get an accent border with a 3px `--accent-soft` ring.
- Spacing has no scale token. In practice: 14px between sections, 10px between rows, 8px small gaps; panels pad 14–15px.
- Motion is short: .12s for colour changes, .14s rise for modals, .16s slide for drawers, .24s for toasts. All off under reduced motion.

### Patterns to copy

- **Selected = accent tint behind accent text** (nav, chips, options, unread items, your own chat bubbles).
- **Flat cards** with hairline borders, no shadow.
- **Status badges** pair a soft fill with a strong text colour: Active `ok`, On hold `warn`, Completed `done`, Archived `arch`.
- **Toasts are inverted** (ink background, ground text), with an optional underlined action such as Undo.
- **Diagonal hatching** (135°) marks overtime, meetings, quiet stretches and days off.
- **Red is reserved** for live, unread, overdue and danger.
- Desktop sizing is dense (32px buttons, 34px inputs). On the phone, touch targets grow to about 44pt; keep the proportions.

### Icons, avatars and logo

- **Icons:** 75 hand-drawn 24×24 stroke icons in `src/shared/icons/icons.ts`, stored as inner-SVG strings. Render with `fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`; elements with `class="f"` are filled instead. They port directly to react-native-svg.
- **Avatars:** DiceBear `notionists` v9, generated from the person's name: background from `["d9ece7","e3e2f4","f4e6d7","dde8f5","f3e1e6","e5eed9","eee6f4","dcecee"]` indexed by `abs(h = h*31 + charCode | 0) % 8`, `radius 50, scale 96, beardProbability 20, glassesProbability 25`. The same seed, hash and version give the same face. An uploaded photo (`photoFileId`) wins.
- **Logo:** the company can upload one (`GET /api/company/logo`, public). Otherwise an accent tile with a clock mark. The favicon is a black tile with the company mark; there are no app-icon PNGs yet.
- Product name on screen: **ID InDetails**.

### Formatting

- Times `9:30 AM` (or `09:30` in 24-hour mode, a company setting); ranges `9:00 AM → 11:30 AM`.
- Durations `45m`, `1h 05m`, `7h 30m`; `1,240h` from 100h.
- Dates `Sep 23`, `Wed, Sep 23`, `Wednesday, September 23, 2026`; relative "5 minutes ago", "Yesterday".
- Money `$12,500`, `$1,250.50`, `2,500,000 LBP`; compact on screen from 1,000 (`$12.2k`, `$1.25M`) with the full figure on long-press. Negatives use the real minus sign (`−$1,200`). Gains green, losses red.
- Company settings (`GET /api/company/settings`: time zone, 24-hour clock, week start) are loaded before any screen.
- The client never calculates money. Every figure comes from the API.

### Charts

All hand-drawn SVG, no library: columns with rounded tops, line and area, waterfall, ranked bars, profit bars, stacked status bars, sparklines, a calendar heatmap, an hour heatmap, and a day ruler (6 AM–10 PM). They port to react-native-svg.

### The web on a narrow screen

The web already adapts, which shows the intended phone patterns:

- ≤820px: the sidebar becomes a slide-in drawer.
- ≤640px: top-bar buttons become icon-only; wide tables scroll sideways with a sticky first column; modals become near full screen; Messages shows one pane at a time with a back button.

### App frame on the web

- **Sidebar:** logo and company name, a "Log work" button (Design employees), the area's pages, a "Workspace" group (Settings, Proton budget), and "All areas" for people with several areas. The account menu sits at the bottom.
- **Top bar:** search (projects, people, pages), the work timer, New project, Proton, Help, theme, Messages (red count, "@" for a mention) and the notification bell.

## 3. Sign-in

### Endpoints

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/auth/login` `{email, password}` | Anonymous | Returns `{accessToken, accessTokenExpiresAt, user}` and sets the refresh cookie |
| `POST /api/auth/refresh` | Anonymous, cookie only | No body. Returns a new `AuthResponse` and a new cookie |
| `POST /api/auth/logout` | Anonymous, cookie only | Revokes that refresh token and clears the cookie. The access token stays valid until it expires, so drop it locally |
| `POST /api/auth/change-password` `{currentPassword, newPassword}` | Signed in | Signs out every other device; returns a new session |
| `POST /api/auth/change-email` | `employee:change_email` (super admins) | Returns a new session |
| `POST /api/auth/forgot-password` `{email}` | Anonymous | Always `204`; link lasts 30 minutes, single use |
| `POST /api/auth/reset-password` `{token, password}` | Anonymous | Signs out everywhere; doesn't sign in |
| `GET /api/auth/me` | Signed in | The current user and their effective permissions |
| `POST /api/invitations/validate` `{token}` | Anonymous | What the invitation is for |
| `POST /api/invitations/accept` `{token, firstName, lastName, phone, password}` | Anonymous | Creates the account and signs in |

### Tokens

- **Access token:** a JWT (HS256), **15 minutes**. Claims: `sub` (user id), `email`, `given_name`, `family_name`, `role`, `must_change_password`, and `domain`, `team`, `position` when set. Permissions are **not** in the token.
- **Refresh token:** only ever in the HttpOnly cookie `idi_refresh` (`Secure`, `SameSite=Strict`, `Path=/api/auth`). It is never in a response body, by design.
  - It lasts **1 day**, renewed on each refresh (`RefreshToken:ExpirationDays`, one setting for every client; production doesn't change it).
  - Every refresh replaces it with a new one. The database stores only a hash.
  - **Re-using a replaced token:** within 30 seconds it is refused; after 30 seconds the server treats it as theft and ends **every session of that user on every device**.
  - When two refreshes race, the loser is refused and its response also clears the cookie.
- Every request also checks whether the user's sessions were ended (by an admin, a password reset or deactivation).
- `user.mustChangePassword` (a temporary password) blocks everything except `/auth/me` and change-password.

### Other rules

- Passwords: 10–128 characters, no composition rules.
- No MFA, no SSO, no account lockout.
- Emails sent with links point at the **web** (`/accept-invitation?token=`, `/reset-password?token=`, `/login`).
- `POST /api/setup/super-admin` (setup key header) creates super admins; not for the app.

### Error codes the app should handle

`invalid_credentials` (401), `sign_in_suspended` (403 on login, 401 on refresh), `refresh_token_invalid` and `refresh_token_reused` (401), `unauthenticated` (401), `password_change_required` (403), `current_password_incorrect` (400), `password_reset_invalid` (404), `invitation_invalid` (404), `too_many_requests` (429, with `Retry-After`).

### How the web client handles it

- The access token is kept in memory only.
- On a 401 it refreshes once and repeats the request. Refreshes never overlap: one shared promise per tab, and a Web Lock across tabs.
- On start it restores the session by calling refresh.
- `/auth/me` is re-read every 5 minutes and on focus; that is how permission changes reach an open app.

### What this means for a phone app

1. **Daily sign-ins.** With a 1-day refresh lifetime, a phone left alone for a day asks for the password again.
2. **The refresh token is in a cookie.** A native app can read `Set-Cookie` and send `Cookie: idi_refresh=…` back (the API's integration tests do this), but it is fragile, and some HTTP stacks hide `Set-Cookie`.
3. **Lost refresh responses sign people out.** On a weak site connection, a refresh can succeed on the server while the response never arrives. The device is then signed out; if it retries with the old token after 30 seconds, every session the user has ends.
4. **One refresh at a time, app-wide.** Web Locks and BroadcastChannel don't exist on the phone. The app needs its own single refresh lock covering foreground and background work, and must store the new token before using it.
5. **Carrier networks.** Login, forgot/reset password and invitation share **10 attempts per minute per IP**, and many phones share one IP behind a carrier. Signed-in traffic is limited per user (300/min), so that is fine.
6. **Email links** open the website unless the app claims those links (see section 12).

## 4. Roles, domains and permissions

- **Roles:** `super_admin`, `admin`, `employee`.
- **Domains:** `design`, `execution`. Admins and employees have one home domain. Super admins have none and see both.
- **Permissions:** 54 codes. Role defaults are in the API's `Constants/PermissionCatalog.cs`.

### Default permissions per role

Permissions any domain can hold:

| Permission | Super admin | Admin | Employee |
|---|---|---|---|
| `project:view` | ✓ | ✓ | ✓ |
| `project:create`, `project:edit`, `project:change_status` | ✓ | ✓ | – |
| `requirement:view`, `requirement:complete_own` | ✓ | ✓ | ✓ |
| `requirement:manage` | ✓ | ✓ | – |
| `meeting:create` | ✓ | ✓ | ✓ |
| `meeting:manage` | ✓ | ✓ | – |
| `client:view`, `client:create`, `client:manage` | ✓ | ✓ | – |
| `employee:view`, `employee:manage`, `team:manage` | ✓ | ✓ | – |
| `activity:view`, `report:view`, `domain_settings:manage` | ✓ | ✓ | – |
| `proton:use` | ✓ | ✓ | – |
| **Money:** `financial:view`, `invoice:create`, `invoice:send`, `invoice:void`, `payment:record`, `payment:void`, `billing_settings:manage`, `expense:manage` | ✓ | – | – |
| **Hiring and pay:** `employee:invite`, `employee:pay_manage` | ✓ | – | – |
| **Company:** `company:view`, `overhead:manage`, `overhead_category:manage`, `salary:view`, `company_settings:manage`, `working_time:manage`, `schedule:manage`, `hours:excuse`, `employee:invite_super_admin`, `employee:change_email`, `permission:manage`, `session:manage`, `exchange_rate:manage`, `proton_budget:manage` | ✓ | – | – |

Permissions limited to one domain (D = Design, E = Execution):

| Permission | Domain | Super admin | Admin D | Admin E | Employee D | Employee E |
|---|---|---|---|---|---|---|
| `work_entry:create`, `work_entry:view_own` (log own hours) | D | – | – | – | ✓ | – |
| `work_entry:view_all`, `work_entry:comment` | D | ✓ | ✓ | – | – | – |
| `material:create`, `labour_report:create` | E | ✓ | – | ✓ | – | ✓ |
| `material:manage`, `labour_report:manage` | E | ✓ | – | ✓ | – | – |
| `project:pricing_manage`, `statement:create`, `statement:send` | E | ✓ | – | – | – | – |

Totals: super admin 52, Design admin 21, Execution admin 23, each employee 6.

Admins and super admins log no hours: they are paid a fixed salary. Money and hiring became super-admin-only on 7 Oct 2026 (migration `AdminsSeeNoMoney`); it is a default, so an individual admin can still be granted them.

### Per-person changes

- Any admin or employee can be granted or have revoked any permission on top of their role's defaults. `isJoker` in `/auth/me` is true when someone differs from their defaults.
- People only grant what they hold themselves.
- Granting one permission from the other domain opens that whole domain to the person.
- If someone's permissions end up exactly matching the other role's defaults, their role switches automatically.
- Super admins' permissions can't be changed. The last active super admin can't be deactivated or demoted.
- Role, domain and permission changes don't end sessions; permissions are re-read on the next request (cached 10 minutes on the server).

### How the server enforces it

- Each endpoint declares its permission (`[HasPermission]`, `[HasAnyPermission]`); services check again.
- A record in a domain the caller can't see answers **404**, not 403.
- People's own data (`/api/me/...`) never takes a user id.

### What `/auth/me` returns

`id`, `email`, `firstName`, `lastName`, `phone`, `photoFileId`, `position`, `role`, `domain` (null for super admins), `visibleDomains[]`, `team {id, name}`, `joinedOn`, `mustChangePassword`, `permissions[]` (effective codes), `isJoker`.

Use `role`, `domain` and `permissions` from here, not from the token's claims, which can be stale until the next refresh. `GET /api/me/permissions` explains each permission and where it came from (role, granted, removed).

### How the web uses it

The web hides what someone can't use; the server makes every real decision. The pieces to port:

- `permissionsOf(user)`: `has`, `hasAny`, `hasAll`, `canSeeDomain`, `isAdmin`, `isSuperAdmin`, `homeDomain`, `hasCompanyArea`.
- The company area opens with any of `company:view`, `overhead:manage`, `salary:view`, `schedule:manage`.
- Home: several areas → an area picker; one area → its first page; none → "no access".

## 5. Screens on the web

Routes are `/{design|execution}/...` and `/company/...`. Admins get the admin version of a page; employees get the employee version where one exists.

| Page | Needs | Notes |
|---|---|---|
| Overview ("Dashboard" in Execution) | `report:view` | Period KPIs and a rearrangeable board |
| Projects | `project:view` | Built per person: Design employees see their week and today; site staff see site cards; overseers see the full table |
| Project | `project:view` | Tabs: Overview, Requirements, Timeline (Design + `work_entry:view_all`), Meetings. Execution projects add materials, labour, statements and site money |
| Clients, Client | `client:view` | |
| Employees ("People"), Profile of someone | `employee:view` | The Employees list is Design only |
| Financials | `financial:view` | |
| My work | Design: `work_entry:view_own`; Execution: `requirement:view` | Design: entries and week; Execution: the person's open requirements |
| My pay | Design + `work_entry:view_own` | |
| Meetings | `project:view` | |
| Activity, Reports | Design + `activity:view` / `report:view` | |
| Profile (own) | Signed in | |
| Settings | Any settings permission | |
| Notifications, Messages, Help | Signed in | |
| Company: Overview, Expenses, Salaries, Project pay, Schedules, Proton budget, Settings | Company permissions | |

What each person sees by default:

| Person | Pages |
|---|---|
| Design employee | Projects, My work, My pay, Meetings, Profile, plus the timer and "Log work" |
| Execution employee | Projects, My work (requirements), Meetings, Profile |
| Design admin | Overview, Projects, Clients, Employees, Meetings, Activity, Reports, Settings (no money) |
| Execution admin | Dashboard, Projects, Clients, Meetings, Settings (no money) |
| Super admin | Everything in both domains and the company area; starts at the area picker |

The work timer runs in the browser (localStorage `hourline.timer`); stopping it logs an entry through `POST /api/work-entries`. There is no timer on the server.

## 6. Notifications, live updates and messaging today

### Notifications

- Stored per recipient: `{id, kind, actor{id,name,photoFileId}, project{id,title,domain,icon,tint}, subjectType, subjectId, payload (JSON), count, createdAt, readAt}`. There is no title or text: **the web writes the wording** from the kind and payload (`notificationWords.ts`).
- Endpoints (signed in): `GET /api/notifications?unreadOnly=&page=&pageSize=`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`.
- Access is checked again when reading: money kinds need `financial:view`, work kinds `work_entry:view_all`, `hours_short` needs `salary:view`, and notifications about a domain the reader can no longer see are hidden.
- There are no per-person preferences (only a sound switch in the browser) and nothing deletes old notifications.
- Domain-wide switches: `notifyEntry` (all / long / digest / off), `notifyProject`, `notifyIdle`, `weeklySummary`. `logReminder` and `timerEnabled` exist but are only read by the client; **the server never sends a log reminder**.

The 38 kinds:

| Group | Kinds | Who gets them |
|---|---|---|
| Requirements | `requirement_assigned`, `requirements_added`, `requirement_done`, `requirement_due_soon`, `requirement_overdue` | Assignees, the domain's people, requirement managers |
| Design work | `work_logged`, `work_digest`, `entry_comment`, `weekly_summary`, `hours_short` | Holders of `work_entry:view_all`; the entry's author; people who log work; holders of `salary:view` |
| Meetings | `meeting_scheduled` | Holders of `meeting:manage` |
| Sites | `materials_added`, `labour_week_submitted` | Holders of `material:manage` / `labour_report:manage` |
| Projects | `project_created`, `project_status_changed`, `project_owner_set`, `project_nearly_done`, `project_idle`, `project_cost_high`, `project_closed` | The domain's people, the owner, status managers, money holders |
| Money | `invoice_issued`, `invoice_overdue`, `invoice_sent_automatically`, `invoice_send_due`, `invoice_send_failed`, `invoice_reminder_due`, `invoice_draft_waiting`, `payment_recorded`, `statement_sent` | Holders of `financial:view` or `invoice:send`, or whoever scheduled the invoice |
| People | `client_added`, `invitation_accepted`, `role_changed`, `domain_changed`, `team_changed`, `permissions_changed`, `pay_changed`, `schedule_changed`, `hours_excused` | The person concerned, or the relevant managers |

- Nobody is notified about their own action.
- Scheduled checks run every hour (`NotificationScheduler`). Day-based ones fire on the first tick after midnight in Beirut, so they can land around 00:xx.
- All notifications go through `NotificationSender`, except `work_digest`, which `WorkLogNotifier` writes itself.

### Live updates

- One SignalR hub, `/hubs/live`, server to client only. Token as a `Bearer` header (native) or `?access_token=` (browsers).
- Two signals, both "reload this", carrying no content: `notifications` (no payload) and `messages` (`{teamId}` or `{userId}`).
- The server closes the connection when the access token expires (15 minutes); the client reconnects with a fresh one.
- Online means having the hub open. A backgrounded phone app shows as offline. `GET /api/presence` lists who is online; the web polls it every 60 seconds.
- Permission changes are not pushed; the web re-reads `/auth/me`.

### Messaging

- Team chats (every team has one; members are the team, its domain's admins and the super admins) and direct messages (super admins message anyone; others message their own domain and the super admins).
- Endpoints: `GET /api/messages/conversations`, `GET /api/messages/badge` → `{unread, mention}`, `GET /api/messages/contacts`, `GET /api/messages/teams/{id}/members`, `GET|POST /api/messages/teams/{id}`, `POST /api/messages/teams/{id}/read`, and the same under `/direct/{userId}`.
- Pages are cursor-based: `?before={messageId}&limit=1..100` → `{items (oldest first), hasMore}`.
- Messages up to 4,000 characters, up to 10 photos or videos, @mentions in team chats. No editing, deleting, typing indicators or "seen by".
- **Messages create no notifications**; only the badge and the live signal.

### Email

Sent over SMTP: invitations, temporary super-admin passwords, password resets, sign-in address changes, bug reports, invoices, invoice reminders and statements (with PDFs). No notification emails or digests.

## 7. Files

- Upload: `POST /api/files`, multipart field `file`, one file per request, 30 per minute per user. Returns `{id, name, mimeType, kind, sizeBytes, createdAt}`; then the id is attached.
- Allowed: photos (JPEG, PNG, WebP, HEIC, up to 10 MB) and videos (MP4, MOV, WebM, up to 100 MB). The type is checked from the file's bytes. No PDFs or documents. 2 GB per person per day.
- Attach to: a work entry (one), a message (up to 10), a profile photo, the company logo. Unattached uploads are deleted after a day.
- Materials and labour weeks take no photos today.
- Download: `GET /api/files/{id}` with the `Bearer` header; no public or signed links. Responses are `no-store`, so the app has to cache by file id.
- No thumbnails or resizing, and location data in photos is kept. The app should shrink photos and strip location before uploading.
- PDFs and CSVs are downloaded with the token (invoices, statements, project reports, exports); the phone needs a share sheet for them.

## 8. Proton

- Needs `proton:use` (admins and super admins by default). 10 questions a minute per user, plus a monthly per-user and company budget.
- `POST /api/proton/messages` `{conversationId, text, page, choice}` → `{conversationId, reply, refs, sources, choices, pendingAction, uiCommands, usage, limited}`. **Not streamed**: one answer, up to 55 seconds.
- Proposed changes come back as `pendingAction` cards, confirmed or cancelled with `POST /api/proton/actions/{id}/confirm|cancel`.
- **Cards since 13 Oct 2026:** a reply carries up to 3 cards in `pendingActions` (`pendingAction` is the last). `preview.confirm` is `standard` (one Confirm), `two_step` (Review, then Confirm) or `typed` (the phrase is typed and sent as `typed`; a wrong one is `422 proton_phrase_mismatch`). `GET /api/proton/actions` gives the status of each card. The phone's rules are in `src/features/proton/cards.ts`.
- `GET /api/proton/usage` for "N of M questions left this month". Chats are saved by the API: `GET /api/proton/conversations` (list, `search`, `page`), `GET`/`PATCH`/`DELETE /api/proton/conversations/{id}`. **`DELETE` deletes the saved chat for good**; "New conversation" on the phone only leaves the open chat and never calls it.
- Conversations live in the API's memory (30 minutes idle, 4 hours or 20 questions at most).
- **Navigation commands use names, not web addresses:** `open_project`, `open_client`, `open_person`, `open_page` (`dashboard`, `projects`, `clients`, `people`, `financials`, `meetings`, `activity`, `reports`, `company_overview`, `company_expenses`) and `refresh`, with optional `section` and `tab`. The app can map them straight onto its own screens.

## 9. API conventions

- Errors: `{type, code, message, errors, traceId}`. `type` is one of `validation` (400), `authentication` (401), `authorization` (403), `not_found` (404), `conflict` (409), `business_rule` (422), `rate_limited` (429), `unavailable` (503), `unexpected` (500). Branch on `code`.
- JSON: camelCase, enums as snake_case strings, instants in UTC, dates as `YYYY-MM-DD` in the company time zone.
- Pages: `{items, page, pageSize, totalCount}`, page size 1–100.
- No versioning (`/api/...`). The OpenAPI document is only served in Development, at `/openapi/v1.json`; the web generates its types from it, and the app can do the same.
- Request bodies are limited to 1 MB, except uploads.

## 10. What a phone app adds

| Who | What the phone adds |
|---|---|
| **Execution site staff** (the biggest win) | Record materials on site, with the camera at hand. A Saturday reminder to submit the labour week. Saving entries offline on sites with weak signal |
| **Design employees** | A work timer that keeps running with the app closed, shown on the lock screen and as an ongoing notification with a Stop button. A real "you haven't logged today" reminder. Photos on work entries from the camera. A home-screen widget for today's hours |
| **Admins** | Push alerts for overdue requirements, materials added, labour submitted, meetings booked and quiet projects. Quick status and requirement updates. Proton on the go |
| **Super admins** | Money alerts: payment recorded, invoice overdue, automatic send failed. Sharing invoice and statement PDFs through the share sheet or WhatsApp; the system already records WhatsApp sends as deliveries. A company figures widget |
| **Everyone** | Message push. An unread count on the app icon. Face ID or fingerprint to protect a longer session. Tapping a notification opens the exact screen |

Opening the exact screen is half built: the web already turns each notification kind into a link, and Proton's commands are names, not addresses.

Heavy admin screens are better left on the web: the permissions editor, salaries tables, CSV exports, settings and the rearrangeable dashboards.

## 11. A better notification system

What is needed for push, in order:

1. **Register devices.** An endpoint for the app to register and remove its push token. The token goes away on sign-out, when an admin ends the person's sessions, and on deactivation.
2. **Send pushes from the existing hooks.** Hook into `NotificationSender`. Two paths need their own hook: `WorkLogNotifier` (it writes `work_digest` rows itself) and `MessagingService` (messages create no notifications today).
3. **Write the text on the server.** The web writes notification wording itself, so the 38 kinds need server-side text for pushes. The push also carries the kind and subject so the app opens the right screen.
4. **Check access at send time,** exactly as the in-app list does, so someone who lost `financial:view` gets no money alerts.
5. **Quiet hours,** or hold the overnight scheduled reminders until morning.
6. **Per-person preferences:** by category, and mute per chat.
7. **The unread count in each push,** so the app icon badge is right.
8. **New reminders the phone makes useful:** log work (respecting `logReminder` and the person's schedule), the labour week on Saturday, requirements due today. Meetings have no attendees today, so a meeting reminder needs a decision on who gets it.
9. **Reliability.** Live signals are best effort today. Pushes can be sent after the change is saved; an outbox table would make them survive a crash.
10. **Clean up dead tokens** when the push service reports them.

## 12. Server work needed

### Endpoints and code only (no schema change)

- **Mobile sign-in endpoints** that send and accept the refresh token in the body, with a longer mobile session lifetime as configuration. They use the same refresh-token table; the expiry is stored per row.
- The push sending service and the server-side notification text.
- New reminder jobs.

### Database changes (each needs explicit approval with a full proposal first)

| Change | Why | Needed for |
|---|---|---|
| Device / push-token table | Where to send pushes | Push (minimum) |
| Notification preferences | Per-person categories, chat mutes, quiet hours | Preferences |
| Outbox table (optional) | Pushes survive a crash | Reliability |
| Idempotency keys (optional) | A retried offline batch of materials isn't saved twice | Offline site entries |
| Device info on sessions (optional) | A "your signed-in devices" list | Session management |
| Photos on materials and labour weeks (optional) | Receipts and site photos | Site features |

### Outside the API

- **Opening email links in the app** needs `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` on the domain. They can be served by Caddy so the website stays untouched.
- **Push accounts:** an Apple Developer account and a Firebase project.

## 13. Recommended approach

**React Native with Expo, in TypeScript.** The web is React and TypeScript with React Query, axios, zod and `@microsoft/signalr`, so most non-screen code can be copied almost as is:

- the generated API types and the data hooks;
- `permissionsOf` and the route table logic;
- the notification wording;
- date, time and money formatting in the company time zone;
- the icons and charts (react-native-svg) and the DiceBear avatars.

Expo covers the rest: push (`expo-notifications`), secure token storage (`expo-secure-store`), biometrics (`expo-local-authentication`), camera and photo picking, and background tasks. Widgets and lock-screen timers need small native modules through config plugins.

Suggested order:

1. **Server:** mobile sign-in, device registration and the push pipeline.
2. **App, first release:** sign-in, notifications (push and list), messages, Design "My work" with the timer and log work, Execution "My work" and site recording (materials, labour weeks), projects (read), profile.
3. Admin actions: status changes, requirements, meetings, Proton.
4. Super-admin money views, sharing PDFs, company overview, widgets.

## 14. Open decisions

1. **Stack:** React Native + Expo (recommended), Flutter, or fully native?
2. **Mobile sign-in:** new endpoints with the refresh token in the body, kept in secure storage behind Face ID, or reading the cookie by hand?
   - How long should a phone stay signed in? 30 days?
   - Should a refresh re-sent within a short window get the same new token instead of being refused? It avoids sign-outs on weak site connections, at some security cost.
3. **Push provider:** Expo Push, or Firebase directly?
4. **Lock screen:** may money alerts show amounts and client names?
5. **Scope:** which people and screens come first?
6. **Offline:** must site staff record materials and labour without signal in the first release?
