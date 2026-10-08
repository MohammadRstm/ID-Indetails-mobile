# Build contracts

The agreements every phase builds against while the phases are built in parallel: the new API endpoints, the push payload, the app's shared modules, the route tree, and who owns which files. The architecture behind them is in [phase-0-plan.md](phase-0-plan.md); the answers to its open questions are in [decisions.md](decisions.md).

If something here turns out to be wrong, change it only through the orchestrator, never in one phase alone.

## 1. Branches and merging

| Work | Repo | Branch | Folder |
|---|---|---|---|
| Contracts (this) | mobile | `MR-Mobile-Contracts` | `Desktop/ID-Indetails-mobile` |
| Phase 1a: scaffold, shared modules, UI kit, route tree | mobile | `MR-Mobile-Scaffold` | `Desktop/ID-Indetails-mobile` |
| Phase 1b: sign-in, lock, guards, fonts, docs | mobile | `MR-Mobile-Phase-1` | worktree `Desktop/idm-phase-1` |
| Phase 2: employee and site staff | mobile | `MR-Mobile-Phase-2` | worktree `Desktop/idm-phase-2` |
| Phase 3: admin | mobile | `MR-Mobile-Phase-3` | worktree `Desktop/idm-phase-3` |
| Phase 4: super admin | mobile | `MR-Mobile-Phase-4` | worktree `Desktop/idm-phase-4` |
| Phase 5: native enhancements | mobile | `MR-Mobile-Phase-5` | worktree `Desktop/idm-phase-5` |
| API: every backend change | API | `MR-Mobile-Api` | worktree `source/repos/idi-mobile-api` |

- Phases 1b–5 branch from `MR-Mobile-Scaffold` once it is done.
- **No phase merges anything, pushes, or commits to `main`/`master`.** Each reports back. The orchestrator reviews the branch, asks the user for approval, and only then merges.
- Integration happens on `MR-Mobile-Integration`, merging in the order 1b → 2 → 3 → 4 → 5.

## 2. New API endpoints

All JSON is camelCase. Errors use the existing body `{ type, code, message, errors, traceId }`. Times are UTC ISO strings; days are `YYYY-MM-DD`.

### Mobile sign-in (Phase 1, DB-1)

| Method and path | Access | Body | Answer |
|---|---|---|---|
| `POST /api/mobile/auth/login` | Anonymous, rate `auth` | `{ email, password }` | `200 MobileAuthResponse` |
| `POST /api/mobile/auth/refresh` | Anonymous, rate `refresh` | `{ refreshToken }` | `200 MobileAuthResponse` |
| `POST /api/mobile/auth/logout` | Anonymous | `{ refreshToken }` | `204` (also when the token is unknown) |
| `POST /api/mobile/auth/change-password` | Signed in (pending password change allowed), rate `credential` | `{ currentPassword, newPassword }` | `200 MobileAuthResponse` |

```ts
type MobileAuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;   // UTC
  refreshToken: string;
  refreshTokenExpiresAt: string;  // UTC, 30 days from now
  user: CurrentUserResponse;      // exactly what GET /api/auth/me returns
};
```

- **Errors:** the same codes as the web sign-in.

  | Code | Status |
  |---|---|
  | `invalid_credentials` | 401 |
  | `sign_in_suspended` | 403 on login, 401 on refresh |
  | `refresh_token_invalid` | 401 |
  | `refresh_token_reused` | 401 |
  | `current_password_incorrect` | 400 |
  | `rate_limited` | 429 |

- **The session rules** are in phase-0-plan.md section 5.
- **Mobile access tokens** carry a `sid` claim, the session id.
- **Endpoints reused unchanged:** `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.

### Devices (Phase 2 push, DB-2; Phase 5 device management)

| Method and path | Access | Body | Answer |
|---|---|---|---|
| `PUT /api/me/devices` | Signed in with a mobile token (`sid`) | `{ pushToken, platform: "ios" \| "android", appVersion?: string }` | `200 DeviceResponse` |
| `DELETE /api/me/devices/current` | Signed in | — | `204` |
| `GET /api/me/devices` | Signed in | — | `200 DeviceResponse[]`, newest first |
| `DELETE /api/me/devices/{id}` | Signed in, own device only (`404` otherwise) | — | `204`; ends that device's session |

```ts
type DeviceResponse = {
  id: number;
  platform: "ios" | "android";
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
  current: boolean;   // true for the caller's own session
};
```

### Notification settings (Phase 2, DB-4)

| Method and path | Access | Body | Answer |
|---|---|---|---|
| `GET /api/me/notification-settings` | Signed in | — | `200 NotificationSettingsResponse` |
| `PUT /api/me/notification-settings` | Signed in | `{ quietFromMinute: number \| null, quietToMinute: number \| null, mutedCategories: NotificationCategory[] }` | `200 NotificationSettingsResponse` |

```ts
type NotificationCategory =
  "work" | "requirements" | "projects" | "meetings" | "sites" | "money" | "people" | "messages";

type NotificationSettingsResponse = {
  quietFromMinute: number | null;   // minutes after midnight, company time; both null = no quiet hours
  quietToMinute: number | null;
  mutedCategories: NotificationCategory[];
  isDefault: boolean;               // true while the person has never saved (22:00–07:00, nothing muted)
};
```

- Quiet hours are both set or both null, each 0–1439. A range may cross midnight.

### Materials and labour weeks (Phase 2, DB-3)

- **`POST /api/projects/{id}/materials`:** each item gains an optional `clientRef` (a UUID string).
  - If the caller already added a material with that `clientRef`, that material is returned instead of a new one: no new row, event or notification.
  - The answer stays `MaterialResponse[]`, in request order.
- **`GET /api/projects/{id}/labour-weeks/{weekStart}`:** the answer gains `version: string`. It is opaque: `"0"` when the week isn't reported, otherwise a value that changes whenever the week changes.
- **`PUT /api/projects/{id}/labour-weeks/{weekStart}`:** the body gains an optional `expectedVersion: string`.

  | Situation | Answer |
  |---|---|
  | `expectedVersion` absent (the web) | As today |
  | The stored days and note already equal the request | `200` with the week; nothing saved, no event, no notification |
  | `expectedVersion` sent and differs from the current version, and the days or note differ | `409`, code `labour_week_changed` |

### Existing endpoints the app uses

- Everything in [investigation.md](investigation.md). Types come from `src/api/schema.d.ts`, generated from the API's OpenAPI document.
- Until the API branch is merged and the types regenerated, the new shapes above live by hand in `src/api/mobileTypes.ts`.

## 3. Push payload

Every push the API sends:

- **Title and body:** privacy-safe text written by the server (phase-0-plan.md section 8).
- **`badge`:** unread notifications plus unread messages.
- **`channelId`** (Android) and **`data`**, as below.

```ts
type PushData = {
  forUserId: number;               // the app ignores a push for anyone other than the signed-in person
  kind: string;                    // a notification kind, or "message", "log_reminder", "labour_week_reminder"
  notificationId?: number;         // set for notification pushes
  target: PushTarget;
};

type PushTarget =
  | { type: "project"; id: number; domain: "design" | "execution"; section?: "requirements" | "meetings" | "materials" | "labour" }
  | { type: "requirement"; projectId: number; requirementId: number; domain: "design" | "execution" }
  | { type: "work_entry"; id: number }
  | { type: "conversation"; teamId?: number; userId?: number }
  | { type: "labour_week"; projectId: number; weekStart: string }
  | { type: "person"; id: number }
  | { type: "client"; id: number }
  | { type: "invoice"; id: number }
  | { type: "payment"; id: number }
  | { type: "statement"; id: number }
  | { type: "page"; page: "notifications" | "today" | "work" | "meetings" | "company" };
```

**Android channels.** The app creates these; the server uses them as `channelId`.

| Channel | Importance |
|---|---|
| `work`, `requirements`, `projects`, `meetings`, `sites`, `money`, `people` | Default |
| `messages`, `reminders` | High |
| `timer` | Low; used by the app's own ongoing timer notification |
| `quiet` | Low; everything sent during quiet hours |

**Category of each kind** (server side, for mutes and channels):

| Category | Kinds |
|---|---|
| `work` | `work_logged`, `work_digest`, `entry_comment`, `weekly_summary`, `hours_excused`, `schedule_changed` |
| `requirements` | `requirement_*` |
| `projects` | `project_created`, `project_status_changed`, `project_owner_set`, `project_nearly_done`, `project_idle` |
| `meetings` | `meeting_scheduled` |
| `sites` | `materials_added`, `labour_week_submitted`, `labour_week_reminder` |
| `money` | `invoice_*`, `payment_recorded`, `statement_sent`, `project_closed`, `project_cost_high`, `client_added`, `pay_changed`, `hours_short` |
| `people` | `invitation_accepted`, `role_changed`, `domain_changed`, `team_changed`, `permissions_changed` |
| `messages` | `message` |
| — | `log_reminder` (channel `reminders`) |

## 4. The app's shared modules

Phase 1a creates them with their final exports and a working first version. Phase 1b hardens the auth and session ones without changing their exports. Phases 2–5 import them and never change their exports. A phase that needs a change asks the orchestrator.

| Module | Exports |
|---|---|
| `src/config/env.ts` | `env: { apiUrl: string; variant: "development" \| "preview" \| "production" }` |
| `src/api/http.ts` | `http` (axios: base URL, bearer token, one refresh on 401, arrays as repeated keys) |
| `src/api/errors.ts` | `ApiError` (`status`, `code`, `message`, `fieldErrors: Record<string, string[]>`, `traceId`), `isApiError(e)`, `toApiError(e)` |
| `src/api/types.ts` | Named aliases over `schema.d.ts` and `mobileTypes.ts` (`CurrentUser`, `ProjectSummary`, …) |
| `src/api/queryClient.ts` | `queryClient` (AppState focus, NetInfo online, the web's retry rules) |
| `src/auth/session.tsx` | `SessionProvider`, `useSession(): { status: "loading" \| "signedOut" \| "signedIn"; user: CurrentUser \| null; signIn(email, password): Promise<void>; signOut(): Promise<void> }`, `useCurrentUser(): CurrentUser` |
| `src/auth/tokenManager.ts` | `tokenManager.getAccessToken()`, `tokenManager.refresh()`, `tokenManager.onSessionEnded(listener)` |
| `src/permissions/codes.ts` | `P` (the 54 codes, ported from the web) |
| `src/permissions/permissions.ts` | `permissionsOf(user)` → `{ has, hasAny, hasAll, canSeeDomain, isAdmin, isSuperAdmin, homeDomain, visibleDomains, hasCompanyArea }` |
| `src/permissions/usePermissions.ts` | `usePermissions()` |
| `src/permissions/screens.ts` | `screens` (every route key with its rule), `canOpen(perms, key)`, `tabsFor(perms)`, `persona(perms): "design_employee" \| "execution_employee" \| "admin" \| "super_admin"` |
| `src/navigation/targets.ts` | `routeForTarget(target: PushTarget, perms): Href \| null`, `routeForProtonCommand(cmd, perms): Href \| null` |
| `src/theme/tokens.ts` | `light`, `dark` (every web token), `radii`, `spacing` |
| `src/theme/ThemeProvider.tsx` | `ThemeProvider`, `useTheme(): { colors, scheme: "light" \| "dark", preference, setPreference }` |
| `src/theme/typography.ts` | Text variants (`title`, `heading`, `body`, `label`, `micro`, `mono`, `figure`, …) |
| `src/format/*` | Ported `time.ts`, `money.ts`, `periods.ts`, `phone.ts` (company time zone always) |
| `src/ui/index.ts` | `Screen`, `ScreenHeader`, `Text`, `Button`, `IconButton`, `Card`, `Section`, `ListRow`, `Badge`, `StatusBadge`, `Chip`, `Segmented`, `Switch`, `TextField`, `NumberField`, `DateField`, `TimeField`, `Select`, `Sheet`, `ConfirmDialog`, `toast()` + `ToastHost`, `Skeleton`, `EmptyState`, `InlineError`, `LoadError`, `OfflineBanner`, `Icon`, `Avatar`, `AvatarStack`, `Money`, `Bar`, `Divider` |
| `src/ui/charts/*` | `WeekBars`, `DayRuler`, `ProgressRing` |
| `test/*` | `personas` (ported), MSW `server`, `renderWithProviders(ui, { persona })` |

## 5. Route tree and owners

Phase 1a creates every route file. Each renders a screen from its owner's feature folder. Until the owner builds it, the screen is a placeholder ("Coming in phase N").

| Route (`app/…`) | Screen | Owner |
|---|---|---|
| `_layout.tsx`, `index.tsx`, `(auth)/*`, `(app)/_layout.tsx` | providers, redirect, sign-in, guards, lock | 1b |
| `(app)/(tabs)/_layout.tsx`, `(app)/(tabs)/more.tsx`, `(app)/not-available.tsx`, `(app)/settings/index.tsx`, `(app)/dev/gallery.tsx` | tabs, More, not available, settings (theme, biometrics), UI gallery | 1a → 1b |
| `(app)/(tabs)/today.tsx` | picks `DesignToday` / `ExecutionToday` (2), `AdminToday` (3), `CompanyToday` (4) by persona | 1a (the switch); each owner its screen |
| `(app)/(tabs)/work.tsx`, `(app)/work/entry/[id].tsx`, `(app)/log-work.tsx`, `(app)/pay.tsx` | Design work, entry, log work, my pay | 2 |
| `(app)/(tabs)/sites.tsx`, `(app)/projects/[id]/materials.tsx`, `(app)/materials/add.tsx`, `(app)/projects/[id]/labour/index.tsx`, `(app)/projects/[id]/labour/[weekStart].tsx`, `(app)/pending.tsx` | sites, materials, add materials, labour weeks, a week, pending records | 2 |
| `(app)/(tabs)/projects.tsx`, `(app)/projects/[id]/index.tsx`, `(app)/projects/[id]/requirements.tsx`, `(app)/requirements/index.tsx` | projects, project, its requirements, my requirements | 2 |
| `(app)/meetings/index.tsx`, `(app)/meetings/new.tsx`, `(app)/meetings/[id].tsx` | meetings | 2 |
| `(app)/(tabs)/messages.tsx`, `(app)/messages/team/[teamId].tsx`, `(app)/messages/direct/[userId].tsx` | messages | 2 |
| `(app)/(tabs)/alerts.tsx`, `(app)/notifications/settings.tsx` | notifications, notification settings | 2 |
| `(app)/profile/index.tsx` | my profile | 2 |
| `(app)/requirements/edit.tsx` | add or edit a requirement (`?projectId&id`) | 3 |
| `(app)/projects/[id]/activity.tsx`, `(app)/activity.tsx` | activity | 3 |
| `(app)/people/index.tsx`, `(app)/people/[id].tsx` | people | 3 |
| `(app)/clients/index.tsx`, `(app)/clients/[id].tsx` | clients | 3 |
| `(app)/proton.tsx` | Proton | 3 |
| `(app)/company/index.tsx`, `(app)/company/alerts.tsx` | company figures, money follow-ups | 4 |
| `(app)/billing/invoices/index.tsx`, `(app)/billing/invoices/[id].tsx`, `(app)/billing/payments/new.tsx`, `(app)/billing/statements/[id].tsx` | invoices, record a payment, statement | 4 |
| `(app)/settings/devices.tsx` | my devices | 5 |

## 6. Slots: where one phase's screen shows another phase's part

Phase 1a creates each slot as a component that renders nothing, with its final props. The screen's owner renders the slot in the agreed place; the slot's owner fills it in.

| Slot (`src/features/…`) | Props | Rendered by (where) | Owner |
|---|---|---|---|
| `projects/slots/AdminProjectActions.tsx` | `{ project }` | 2, project screen header | 3 |
| `projects/slots/ProjectMoney.tsx` | `{ project }` | 2, project screen below the summary | 4 |
| `requirements/slots/RequirementManageActions.tsx` | `{ projectId, requirement }` | 2, each requirement row's menu | 3 |
| `requirements/slots/AddRequirementButton.tsx` | `{ projectId }` | 2, project requirements header | 3 |
| `people/slots/PersonSecurityActions.tsx` | `{ person }` | 3, person screen | 4 |
| `calendar/AddToCalendarButton.tsx` | `{ event: { title, startsAt, endsAt?, allDay?, notes? } }` | 2, meeting screen and requirement rows with a deadline | 5 |
| `timer/liveActivity.ts` | `startTimerActivity(timer)`, `stopTimerActivity()` | 2, timer start and stop | 5 |
| `src/push/categories.ts` | `registerNotificationCategories()` | 2, push setup | 5 |
| `src/push/actions.ts` | `handleNotificationAction(actionId, data): Promise<boolean>` | 2, response handler (before opening the target) | 5 |
| `src/offline/background.ts` | `registerBackgroundSync(run: () => Promise<void>)` | 2, sync engine start | 5 |
| `src/navigation/universalLinks.ts` | `routeForUniversalLink(url): Href \| null` | 1b, link handling | 5 |

## 7. File ownership after the fan-out

| Owner | Owns |
|---|---|
| 1b | `src/auth/**`, `src/api/http.ts`, `src/api/queryClient.ts`, `src/config/**`, `assets/fonts/**`, `scripts/fonts*`, `src/theme/fonts.ts`, the routes marked 1b, `src/features/settings/**`, `docs/setup.md`, `docs/architecture.md`, `docs/ported-from-web.md` |
| 2 | `src/features/{today/design,today/execution,work,timer,sites,materials,labour,projects,requirements,meetings,messages,notifications,profile}/**`, `src/offline/**`, `src/push/**`, `src/live/**`. Excluded: the slots owned by others |
| 3 | `src/features/{today/admin,activity,people,clients,proton}/**`, the phase 3 slots |
| 4 | `src/features/{today/company,company,billing}/**`, the phase 4 slots |
| 5 | `src/features/{devices,calendar,widgets}/**`, the phase 5 slots; it may add plugin entries to `app.config.ts` |

- **Changing someone else's file:** only to fix a compile error caused by a contract mismatch, with the smallest possible change, reported to the orchestrator.
- **Dependencies:** all installed by Phase 1a. **No other phase runs `npm install`**; a missing package goes to the orchestrator.
- **Tests:** every phase adds tests for what it owns, next to the code (`*.test.ts(x)`).

## 8. Heavy runs: builds, type checks, lint, tests

The laptop is shared with other Claude sessions and overheats. Every heavy command follows this:

1. **Take the lock:** `mkdir` the lock folder `C:\Users\masst\AppData\Local\Temp\claude\C--Users-masst-source-repos-ID-Indetails\43172fa3-6f43-41fd-ac19-755d68f078df\scratchpad\heavy-run.lock`.
   - If it already exists, someone else is running: wait, checking every 30 seconds for up to 20 minutes.
   - Write your name into `owner.txt` inside it.
   - **Always delete the folder when done, also after a failure.**
2. **Check other sessions:** list processes whose command line matches `testhost|vitest|jest|dotnet test|dotnet build|tsc` (`Get-CimInstance Win32_Process`). If any aren't yours, release the lock, wait a few minutes and try again.
3. **Cap the run:** low priority, 2 cores. In `cmd`: `start "" /b /wait /belownormal /affinity 3 <command>`.
   - Jest: `--maxWorkers=2`.
   - .NET: `DOTNET_PROCESSOR_COUNT=2` and `-- xUnit.MaxParallelThreads=2`.
   - Never run a type check, lint and tests at the same time.
4. **API integration tests** use a MySQL test database shared with another session, and every run drops it. Only run them filtered (`--filter`), and only when nothing else is testing. If unsure, don't run them; say so in the report, and the orchestrator runs them.
5. **Never** apply migrations to the development database, run `dotnet ef database update`, or start long-running servers.

## 9. Settled after Phase 1a and the API branch

- **Slot `src/features/notifications/slots/useTabBadges.ts`** (owner 2): returns `{ alerts?, messages? }`, which the tab bar reads for its counts.
- **`src/features/requirements/manage/**`** belongs to Phase 3 (the requirement editor).
- **Rate limiting** answers type `rate_limited` with code `too_many_requests`.
- **Labour `version`** is `"0"` until reported, then the time of the last change in milliseconds. A changed week answers `409 labour_week_changed`.
- **Devices:** registering from a web token answers `403`; from an ended session, `401`.
- **Materials:** a `clientRef` already used on another site, or twice in one batch, answers `400`.
- **Quiet hours:** a start equal to the end answers `400`.
- **Mobile change-password** keeps the phone's session id, so its push device stays registered.
- **Throttled digest pushes** have null title and body; they only update the badge.
- **Shared module additions from Phase 1a** (see its report, now in `README.md`/`docs/ported-from-web.md`):
  - `ApiError.type` and `.isNetwork`;
  - `tokenManager.setSession`, `.getRefreshToken`, `.clearSession`;
  - `createQueryClient`, `clearToasts`, `dismissToast`;
  - `toast({ text, sub?, icon?, actionLabel?, action?, duration? })`;
  - `renderWithProviders` is async.
- **Screen props** are fixed by the route files (`ProjectScreen { projectId, section }`, `ProjectRequirementsScreen { projectId, highlightRequirementId }`, …). Keep the names and props of the placeholder you replace.
