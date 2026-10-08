# Phase 0: architecture and implementation plan

The plan for the ID InDetails phone app, written before any app code (8 Oct 2026). It builds on [investigation.md](investigation.md), which describes the API, the web app, sign-in and permissions as they are today. The rules for working on the code are in [CLAUDE.md](../CLAUDE.md).

**Status: waiting for approval.** Nothing in Phase 1 starts until this plan is approved. No database change is made until its proposal (section 25) is approved on its own.

The product is called ID InDetails everywhere. "Hourline" is only the old internal name.

## Contents

- [Principles](#principles)
- [What the Phase 0 reviews found](#what-the-phase-0-reviews-found)
1. [Recommended mobile architecture](#1-recommended-mobile-architecture)
2. [Repository structure](#2-repository-structure)
3. [Expo configuration](#3-expo-configuration)
4. [Navigation architecture](#4-navigation-architecture)
5. [Authentication architecture](#5-authentication-architecture)
6. [Token lifecycle](#6-token-lifecycle)
7. [Biometric strategy](#7-biometric-strategy)
8. [Push notification architecture](#8-push-notification-architecture)
9. [Deep-link architecture](#9-deep-link-architecture)
10. [Offline architecture](#10-offline-architecture)
11. [Synchronisation strategy](#11-synchronisation-strategy)
12. [File and photo strategy](#12-file-and-photo-strategy)
13. [State management strategy](#13-state-management-strategy)
14. [API integration strategy](#14-api-integration-strategy)
15. [Permission and role strategy](#15-permission-and-role-strategy)
16. [Timer strategy](#16-timer-strategy)
17. [Messaging strategy](#17-messaging-strategy)
18. [Error, loading and empty states](#18-error-loading-and-empty-states)
19. [Testing strategy](#19-testing-strategy)
20. [Development environment](#20-development-environment)
21. [Android testing](#21-android-testing)
22. [iOS testing](#22-ios-testing)
23. [Build and release strategy](#23-build-and-release-strategy)
24. [Required backend changes](#24-required-backend-changes)
25. [Required database changes](#25-required-database-changes)
26. [Security implications](#26-security-implications)
27. [Risks and trade-offs](#27-risks-and-trade-offs)
28. [Phase 1 implementation breakdown](#28-phase-1-implementation-breakdown)
- [Later phases](#later-phases)
- [Decisions needed](#decisions-needed)

---

## Principles

- **The web is the command centre; the phone is the field-and-pocket companion.** For every workflow the question is: what is the person trying to do, and is a phone a better tool for it?
- **Bring it to the phone** when the phone makes it better: recording on site, the timer, reacting to notifications, messaging, checking today.
- **Leave it on the web** when the phone makes it worse: large tables, exports, reports, financial analysis, salaries, permissions, settings, the invoice editor, the statement builder, dashboards, bulk entry, timeline analysis.
- **The server stays the authority.** The app never calculates money, overtime, pay or access. New endpoints only where the phone genuinely needs them; nothing on the web changes.
- **Simple and explicit.** Smart and dumb components, one hook per endpoint, no speculative layers.

## What the Phase 0 reviews found

These are the review steps of Phase 0 (items 1–9). The investigation covers the rest; these are the points that shape the design.

| Area | Finding | Consequence |
|---|---|---|
| Web architecture | The reusable non-screen code is: the generated API types, the error type, `permissionsOf`, the route table idea, date/time/money formatting, the icon paths, the avatar recipe, and the notification wording (`notificationWords.ts`). The web can't be changed, so there is no shared package. | Port these modules by copying them, listed in `docs/ported-from-web.md` so they can be kept in step. |
| Sign-in | A refresh rotates the token; a replaced token presented again after 30 s ends every session of the user; the refresh token only travels in a cookie; one 1-day lifetime for every client (`AuthService.RefreshAsync`, `RefreshTokenRules`). | A separate mobile session flow (sections 5–6) and one database change (DB-1). |
| Notifications | All rows go through `NotificationSender` except `work_digest` (`WorkLogNotifier`). Live signals are staged per request and sent after it succeeds (`LiveUpdatesMiddleware`). The web writes the wording. | Pushes hook into the same staging point; the server gets its own short, privacy-safe push wording (section 8). |
| Messaging | Messages create no notifications, only a badge and a live signal. | Message pushes are a new hook in `MessagingService`. |
| Timer | The web timer is a start time in the browser's localStorage per person; stopping it opens the log form. No server timer. | The phone timer is the same idea on the phone, with no server change (section 16). |
| Permissions | 54 codes; effective permissions come from `/auth/me`; the server checks every request. | The app ports `permissionsOf` and a screen table (section 15). |
| Uploads | Photos and videos only, 10 MB / 100 MB, upload first then attach; no thumbnails; location data kept; downloads need the bearer token. | Shrink and strip photos on the phone; cache files by id (section 12). |
| Live updates | One hub, two "reload" signals, Bearer header accepted, the connection closes when the token expires. | The app connects only while in the foreground (section 17). |
| Materials | `POST /materials` creates rows every time it is called; `added_at` is the time the server saved them. | Offline retries need duplicate protection (DB-3) and a decision on the recorded date (section 10). |
| Labour weeks | `PUT /labour-weeks/{weekStart}` replaces the week's days, and sends the `labour_week_submitted` notification again on every resubmission, even an identical one. `labour_weeks` has `submitted_at` and `updated_at`. | An identical resubmission becomes a no-op, and an optional version check detects conflicts, with no schema change (section 10). |

---

## 1. Recommended mobile architecture

**React Native with Expo (SDK 57, the current stable release), TypeScript in strict mode, Expo Router.** No technical blocker was found.

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 57 and the React Native version it pins | Managed native builds, config plugins, EAS for cloud builds (no Mac needed for iOS). Never upgrade React Native separately from the SDK. |
| Language | TypeScript, strict | Same as the web; reuse the generated API types. |
| Navigation | Expo Router | File-based routes give deep links and push routing almost for free. |
| Server state | TanStack React Query 5 | Same as the web: one hook per endpoint, invalidation lists. |
| HTTP | Axios | Same as the web; interceptors for the bearer token and refresh. |
| Validation | Zod 4 | Forms and the offline queue's stored records. |
| Secure storage | `expo-secure-store` | The refresh token (Keychain / Keystore). |
| Biometrics | `expo-local-authentication` | Face ID / fingerprint gate. |
| Push | `expo-notifications` | Expo Push in V1; local notifications for the timer. |
| Local data | `expo-sqlite` (and its `kv-store`) | The offline queue, the timer and small preferences in one dependency. |
| Graphics | `react-native-svg` | The web's icons, DiceBear avatars and charts. |
| Camera and photos | `expo-image-picker`, `expo-image-manipulator`, `expo-image` | Capture, shrink and strip, display with headers and a disk cache. |
| Connectivity | `@react-native-community/netinfo` | Online state for React Query and the sync engine. |
| Live updates | `@microsoft/signalr` | Same hub as the web. |
| Sharing, calendar | `expo-sharing`, `expo-file-system`, `expo-calendar` | Later phases. |

The app is organised by **feature** (design work, timer, sites, requirements, projects, messages, notifications, profile). Each feature has its hooks, its smart screens, its dumb components and its pure logic. Everything the features share sits beside them: the API layer, auth, offline, push, permissions, theme, UI kit and formatting.

## 2. Repository structure

```text
ID-Indetails-mobile/
├── app/                        Expo Router routes. Thin files that render a feature's screen.
│   ├── _layout.tsx             Providers: theme, query client, session, push, live
│   ├── (auth)/                 sign-in, forgot-password, change-password
│   └── (app)/                  everything signed-in (guarded, biometric lock)
│       ├── (tabs)/             the tab bar, built per person
│       ├── projects/[id]/...
│       ├── messages/...
│       └── ...                 modals: log-work, add-materials, labour week
├── src/
│   ├── api/                    http client, ApiError, generated schema.d.ts, query client, query keys
│   ├── auth/                   session provider, token manager, secure storage, biometric lock
│   ├── permissions/            codes, permissionsOf, the screen table
│   ├── offline/                outbox database, sync engine, connectivity
│   ├── push/                   registration, handlers, notification → screen mapping
│   ├── live/                   SignalR connection
│   ├── theme/                  tokens (light, dark), typography, ThemeProvider
│   ├── ui/                     dumb UI kit: Text, Button, Card, ListRow, Badge, Field, Sheet, Toast,
│   │                           Skeleton, EmptyState, ErrorText, Icon, Avatar, charts
│   ├── format/                 company-time-zone dates and times, durations, money
│   ├── config/                 environment (API URL, variant)
│   └── features/
│       └── <feature>/
│           ├── api.ts          one hook per endpoint, query keys, invalidations
│           ├── screens/        smart: data, permissions, navigation
│           ├── components/     dumb: props in, callbacks out
│           └── model.ts        pure logic (tested directly)
├── assets/                     fonts (static instances), app icon, splash
├── scripts/                    api-types, font instancing
├── test/                       MSW handlers, personas, render helpers
├── docs/
├── app.config.ts, eas.json, tsconfig.json, eslint.config.js, jest.config.js, package.json
└── CLAUDE.md, README.md
```

- Route files in `app/` stay thin, so screens can be tested without the router.
- The smart/dumb split is visible in the folders: `screens/` are smart; `components/` and `src/ui/` are dumb.
- Modules ported from the web are listed in `docs/ported-from-web.md` with their source path, so they can be compared when the web changes.

## 3. Expo configuration

- **`app.config.ts`** (code, not JSON) so one file makes three variants from `APP_VARIANT`:

  | Variant | App name | Bundle / package id | API |
  |---|---|---|---|
  | development | ID InDetails (Dev) | `<base>.dev` | the laptop's API |
  | preview | ID InDetails (Preview) | `<base>.preview` | decision 9 |
  | production | ID InDetails | `<base>` | production |

  The three variants install side by side on one phone. The base id (for example `com.indetails.app`) is permanent once published: decision 1.
- **`eas.json`** has the `development`, `preview` and `production` build profiles, their `APP_VARIANT` and API URL, and `appVersionSource: remote`, so build numbers increase automatically.
- **Configuration** is read through `src/config/env.ts` from `EXPO_PUBLIC_API_URL`. Everything in the app bundle is public, so it holds no secrets.
- **Plugins:** `expo-router`, `expo-secure-store`, `expo-local-authentication` (Face ID usage text), `expo-notifications` (icon, colour, Android channels), `expo-image-picker` (camera and photo usage texts), `expo-sqlite`, `expo-font`.
- **Deep links:** scheme `idindetails`. Universal links come later (section 9).
- **Runtime version:** the `fingerprint` policy, so an over-the-air update only reaches builds with the same native code.
- **New Architecture:** the SDK default.

## 4. Navigation architecture

**Expo Router.** Groups: `(auth)` for signed-out screens; `(app)` for signed-in ones, behind the session guard and the biometric lock.

- **Tabs are built per person** from permissions, using the same screen table as the guards (section 15). Hidden tabs use `href: null`.

  | Person | Tabs |
  |---|---|
  | Design employee (Phase 2) | **Today** · **Work** · **Messages** · **Alerts** · **More** |
  | Execution employee (Phase 2) | **Today** · **Sites** · **Messages** · **Alerts** · **More** |
  | Admin (Phase 3) | **Today** · **Projects** · **Messages** · **Alerts** · **More** |
  | Super admin (Phase 4) | **Company** · **Projects** · **Messages** · **Alerts** · **More** |

- **Today** is the person's day:
  - **Design:** the timer, today's hours against the day's required hours, the week's progress, deadlines, today's meetings, quick "Log work".
  - **Execution:** my sites (last recorded), open requirements, "Add materials", this week's labour status, pending offline records.
- **Work** (Design): my entries by day, the week, overtime and hours balance, my pay.
- **Sites** (Execution): each site with its materials, labour weeks and requirements.
- **Alerts:** the notification list. A badge on the tab and on the app icon.
- **More:** profile, projects, meetings, pending records, settings (theme, biometrics, notification preferences), help, sign out.
- **Full-screen and modal routes:**
  - project (`projects/[id]` with requirements and meetings sections);
  - conversation (`messages/team/[teamId]`, `messages/direct/[userId]`);
  - log work, add materials, labour week (`labour/[projectId]/[weekStart]`);
  - entry details, notification preferences, pending records.
- **Guards:**
  - signed out → sign-in;
  - `mustChangePassword` → change password;
  - locked → the biometric lock screen;
  - a route the person can't open → "Not available to you", with a way home.

## 5. Authentication architecture

The app does **not** use the browser's refresh cookie. It gets its own endpoints, which return and accept the refresh token in the body. Its sessions are marked as mobile so they can have their own lifetime and replay rules. The web is untouched: it keeps its cookie, its 1-day lifetime and its 30-second rule.

### New endpoints (`api/mobile/auth`, a new `MobileAuthController`)

| Endpoint | Access | Request | Response |
|---|---|---|---|
| `POST /api/mobile/auth/login` | Anonymous, `auth` rate limit | `{ email, password }` | `MobileAuthResponse` |
| `POST /api/mobile/auth/refresh` | Anonymous, `refresh` rate limit | `{ refreshToken }` | `MobileAuthResponse` |
| `POST /api/mobile/auth/logout` | Anonymous | `{ refreshToken }` | `204`. Ends this phone's session and removes its push device (Phase 2) |
| `POST /api/mobile/auth/change-password` | Signed in, `credential` rate limit | `{ currentPassword, newPassword }` | `MobileAuthResponse`. Every other session ends; this phone gets a new one |

`MobileAuthResponse` is `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, user }`. `user` is the same `CurrentUserResponse` as `/auth/me`.

- **Reuse what exists.** The existing `/api/auth/me`, `/forgot-password` and `/reset-password` work as they are. Invitations and resets are completed on the web in V1, because the emailed links open the website (section 9).
- **Same rules as the web.** The same `AuthService` checks run: dummy-hash timing, `sign_in_suspended`, inactive users, password hashing and rehash, last seen. The mobile endpoints differ only in transport (body instead of cookie), lifetime and replay handling.
- **Session id.** Mobile access tokens carry a `sid` claim: the id of the phone's session. Device registration (Phase 2) uses it to tie a push token to the session, so ending the session stops its pushes. Web tokens are unchanged.
- **Configuration** (new section `MobileSession`):

  | Setting | Value |
  |---|---|
  | `RefreshTokenDays` | 30 |
  | `ReplayGraceSeconds` | 300 |

  `RefreshToken:ExpirationDays` (web) stays 1.

### The 30-day mobile session

- Signing in on the phone starts a **session**, a chain of refresh tokens that share a `session_id`.
- Each refresh replaces the token and sets the new one's expiry to **now + 30 days**. A phone used at least once a month stays signed in; one left unused for 30 days asks for the password again.
- There is no absolute cap. One could be added (for example 180 days) if wanted: decision 3.
- The session still ends when:
  - the person signs out on the phone;
  - they change or reset their password;
  - an admin ends their sessions;
  - they are deactivated, or their sign-in email is changed;
  - theft is detected (below).

  These all use the existing "revoke everything" paths, which already cover mobile rows.
- The access token stays a 15-minute JWT.

### Refresh replay and the grace window

**The problem.** A refresh can succeed on the server while its response is lost on a weak connection. The phone still holds the old token and tries again. Today that is refused, and after 30 seconds it is treated as theft and every session of the person ends.

**The design.** Each mobile refresh token records why it stopped being valid (`revoke_reason`, DB-1):

| Reason | Meaning |
|---|---|
| `rotated` | It was presented and replaced by a normal refresh |
| `superseded` | It was issued, but never presented, and was replaced because the token before it was replayed |
| `signed_out` | Its session was signed out |
| `revoked` | Ended by a password change or reset, an admin, deactivation, theft detection, or a stale replay |

When the phone presents token **P**:

1. **P is unknown or expired** → `401 refresh_token_invalid`.
2. **P is valid** → a normal rotation. P becomes `rotated` and points to the new token **N** in the same session; N is returned.
3. **P is `rotated`** (presented before). Walk forward from P along `replaced_by_id`, past every `superseded` token, to the last one, **L**:
   - **Lost-response retry.** Every token after P is `superseded` (nobody has ever presented one), L is still valid, and P was rotated at most **5 minutes** ago (`ReplayGraceSeconds`). L becomes `superseded`, a new token N is issued in the same session, and N is returned. Repeated retries inside the window keep working the same way. It is logged at Information.
   - **Session already expired.** L has reached its 30-day expiry → `401 refresh_token_invalid`, nothing else.
   - **Stale replay.** Every token after P is still unpresented, but the 5 minutes have passed. The server can't tell a phone that was offline for a long time from someone replaying an old token, so it plays safe: `401 refresh_token_invalid`, and **this session only** ends (L becomes `revoked`). No new token is issued, so whoever replayed gains nothing. The phone asks for the password. It is logged as a warning.
   - **Two holders.** A token after P was itself presented (some token after P is `rotated`). Two parties hold this session: **theft**. Every session of the person ends on every device (`revoked`, `sessions_valid_from = now`), as the web does today. It is logged as a security warning.
4. **P is `superseded`** → **theft**, as above. A superseded token is only ever held by someone other than the phone that retried, because that phone never received it.
5. **P is `signed_out` or `revoked`** → `401 refresh_token_invalid`, nothing else.

**How this still detects theft.**

- **Stolen after the phone rotated past it.** An attacker presents an old token after the phone has used a newer one → case 3, "Two holders" → everything ends. Same as today.
- **Stolen before the phone used its newest token.** Within 5 minutes, the attacker gets a new token and the phone's token becomes `superseded`. The next time the phone refreshes it presents the superseded token → case 4 → everything ends, the attacker's included. Detection is delayed until the phone's next refresh (at most 15 minutes of active use), the same delay the web has today.
- **The window only applies to mobile sessions, and only to a token whose successors have never been used.** Outside it, the worst a replay can do is end that one session.

**Concurrency.** Claiming a token stays an atomic conditional update (`WHERE revoked_at IS NULL`), as it is now. Superseding L is the same atomic update, so two retries arriving together can't both get a new token; the loser gets `401 refresh_token_reused`. The app never sends two refreshes at once (section 6).

**Several devices.** Each phone sign-in is its own session with its own chain. Retries and stale replays only affect their own session. Theft ends every session of the person, on every phone and in the browser, which is today's rule for the web.

**What doesn't change.** Web sessions keep the cookie, the 1-day lifetime and the 30-second rule. The new rules live in a pure, unit-tested function (`Business/Auth/MobileRefreshRules.cs`) that decides the case; `AuthService` acts on it.

## 6. Token lifecycle

```text
sign in ─► access token (memory, 15 min) + refresh token (secure store, 30 days)
              │
request ──────┤  Authorization: Bearer <access>
              │
401 ──────────┴─► TokenManager.refresh()   one at a time, app-wide
                    1. read the refresh token from the secure store
                    2. POST /api/mobile/auth/refresh
                    3. write the NEW refresh token to the secure store   ◄─ before anything else
                    4. keep the new access token in memory
                    5. repeat the original request once
```

- **One refresh at a time.** `TokenManager` holds a single in-flight promise. Every caller (requests, the live connection, the sync engine, push registration) awaits it. On a cold start, many screens fire at once, and they all share one refresh.
- **Persist before use.** The new refresh token is written to the secure store before the access token is handed out. If the write fails, the session is treated as ended rather than continuing with a token the phone can't keep.
- **Retry policy for the refresh itself:**

  | Outcome | What happens |
  |---|---|
  | Network error or timeout | Retry up to 3 times with backoff, within the 5-minute window, with the same stored token (the server's grace window makes this safe). After that, the requests fail and the session is kept |
  | `429` or `5xx` | The requests fail, the session is kept, and the app tries again later |
  | `401` | The session has ended: clear the tokens and the cache, then go to sign-in with "Your session ended. Please sign in again." |

- **Background and foreground.**
  - Coming back to the foreground: if the access token expires within 60 seconds, refresh first, then refetch what is stale.
  - Going to the background: in-flight work finishes, nothing new starts, and the live connection closes.
  - If the app is killed in the middle of a refresh, the stored token is still the old one, and the next start retries it inside the grace window.
- **Ahead-of-time refresh** only for the live connection (60 seconds before expiry), as on the web. HTTP requests refresh on a 401.
- **Sign out:**
  1. If there are unsent offline records, the app warns first (section 10).
  2. `POST /api/mobile/auth/logout` with the refresh token. A network failure still signs out locally, and the token dies on its own after 30 days. This differs from the web, which keeps the session when sign-out fails; on a phone, the person's intent to leave wins.
  3. Clear the secure store, the query cache, image caches, the timer and local notifications.
- **`/auth/me`** is re-read every 5 minutes while open and on every return to the foreground, so permission changes reach the phone (the API doesn't push them).

## 7. Biometric strategy

- **Biometrics is a local lock, not sign-in.** The server session is the refresh token. Face ID or fingerprint only decides whether this person may look at the app now.
- **Offered after the first sign-in** when the phone has biometrics enrolled ("Use Face ID to unlock ID InDetails?"). It can be switched on or off in More → Security.
- **When it locks:**
  - on a cold start;
  - after being in the background longer than a timeout (proposed 5 minutes: decision 11).

  While locked, a privacy cover hides the content, including in the app switcher's snapshot.
- **Unlocking:**
  - Face ID or fingerprint, falling back to the phone's passcode (the platform default).
  - After repeated failures, "Sign out" is offered; signing in with the password always works.
  - If biometrics were removed from the phone, the lock falls back to the passcode.
- **The refresh token is not stored behind biometrics** (`requireAuthentication` off). Background work (the offline queue, push registration) must be able to refresh without the person present, and a biometric-bound key is destroyed on Android when fingerprints change. It is stored as `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`: never in backups, never moved to another phone.
- **Pushes still arrive while locked.** Tapping one unlocks first, then opens its screen.

## 8. Push notification architecture

### Overview

```text
 API request / scheduled check / message sent
        │ NotificationSender, WorkLogNotifier, MessagingService, reminder jobs
        ▼
 IPushQueue.Stage(push intent)              staged per request, like live signals
        │ LiveUpdatesMiddleware flush (only if the request succeeded), or the job's flush
        ▼
 in-process channel ──► PushDispatcher (background service)
        │   1. load recipients' devices whose session is still live
        │   2. check access again (NotificationAccess) and the person's preferences
        │   3. render privacy-safe text (PushText) and the target screen (PushTarget)
        │   4. quiet hours → deliver silently
        │   5. unread badge = unread notifications + unread messages
        ▼
 IPushProvider ──► ExpoPushProvider (batches of 100, access token)
        │
        └─► receipts check job (every 15 min): DeviceNotRegistered → delete the device
```

- **Behind an abstraction.** `IPushProvider` is the only part that knows Expo. A later `FcmApnsPushProvider` swaps in without touching the rest. The device table records the token's provider (DB-2).
- **Expo Push access token** ("enhanced push security") is server configuration (`Push:Expo:AccessToken`, a secret), never in the app.

### Device registration (Phase 2)

| Endpoint | Access | Purpose |
|---|---|---|
| `PUT /api/me/devices` | Signed in, mobile token | `{ pushToken, platform, appVersion }`. Registers or updates this phone for the caller's current session (`sid`). A token already registered to someone else moves to the caller, so a shared phone never receives the previous person's pushes |
| `DELETE /api/me/devices/current` | Signed in | Stops pushes to this phone (the person turned pushes off in the app) |

- The app registers after sign-in once the OS permission is granted, and again whenever Expo issues a new token.
- **Removal:**
  - Signing out on the phone deletes the device with its session.
  - Every other way a session ends (password, admin, deactivation, theft, 30 idle days) needs no hook. The dispatcher **only sends to devices whose session still has a valid refresh token**, and a daily cleanup deletes devices of dead sessions.
  - Expo's `DeviceNotRegistered` receipts delete the device.

### What sends a push

| Source | What | Hook |
|---|---|---|
| Existing notifications (38 kinds) | Every notification row, to its recipient | `NotificationSender.SendAsync`, `SendDigestAsync`, `SendOnceAsync`, plus `WorkLogNotifier`'s own `work_digest` write |
| Messages | Team and direct messages to every member except the sender; mentions marked | `MessagingService` send paths |
| Reminders (new, push only, no notification row, so the web bell is unchanged) | **Log your hours:** Design people with `work_entry:create`, on a working day, in the hour before their day ends, if they have logged less than the day requires. Follows the domain's `logReminder` setting. **Labour week:** Execution people, Saturday afternoon (decision 7) | A new scheduled check in `NotificationScheduler` |

- Repeated digest updates (`work_digest`, `requirements_added`) push at most once per hour per person; later updates only update the badge.
- Reminder checks run hourly. A restart could repeat a reminder once; that is accepted rather than adding a table.

### Text, privacy and the lock screen

- The server writes push text (`Business/Push/PushText.cs`), one short template per kind. The phone's in-app list keeps the web's wording (ported `notificationWords.ts`). Pushes are deliberately shorter and privacy-safe, so they are worded separately.
- **Never on the lock screen:** client names, payment amounts, invoice or statement amounts, margins or costs, pay. Money kinds get a neutral text:

  | Kinds | Lock-screen text |
  |---|---|
  | `payment_recorded` | "Payment recorded. Open ID InDetails to see it." |
  | `invoice_overdue`, `invoice_draft_waiting`, `invoice_reminder_due`, `invoice_send_due` | "An invoice needs your attention." |
  | `invoice_send_failed` | "An invoice couldn't be sent automatically." |
  | `invoice_issued`, `invoice_sent_automatically`, `statement_sent` | "Billing update. Open ID InDetails to see it." |
  | `project_closed`, `project_cost_high` | "A project's money needs a look." |
  | `client_added` | "A new client was added." |
  | `pay_changed`, `hours_short` | "Pay and hours update." |

- **Other kinds** may name the project and the person, for example "Rana assigned you a requirement on Villa Haddad".
  - Project titles can contain a client's name. Decision 4 asks whether non-money pushes may show project titles.
- **Messages:** sender and a preview by default; decision 5.
- **The data payload** (also visible to Apple, Google and Expo) carries only ids and kinds: `{ notificationId, kind, target }`. No text, no amounts.
- **Expanding later:** privacy rules are one function of `(kind, settings)`. Adding a "show details on the lock screen" setting is one more preference column.

### Permission-aware sending

- **At send time,** the dispatcher re-runs the same check the in-app list uses (`NotificationAccess`). Someone who lost `financial:view` gets no money pushes, and someone who can no longer see the project's domain gets nothing about it.
- **Deactivated people** have no live sessions, so they have no eligible devices.

### Quiet hours and preferences (DB-4)

- **Quiet hours,** per person, in company time:
  - The default is decision 6 (proposed 22:00–07:00).
  - A push during quiet hours is still delivered, but **silently**: no sound or vibration, delivered quietly on iOS and on a low-importance "Quiet" channel on Android. It waits in the notification centre. Nothing is stored or delayed on the server.
  - Mentions and direct messages follow the same rule.
- **Categories** the person can mute: Work, Requirements, Projects, Meetings, Sites, Money, People, Messages.
- **Android notification channels** match the categories. Android users also get the OS's own per-category switches.
- `GET` and `PUT /api/me/notification-settings`.

### Badge

- Every push carries the badge count: unread notifications plus unread messages.
- The app also sets the badge on foreground and after reading.

### Delivery reliability

- **Delivery queue.** Pushes are queued in memory after the change commits. If the API restarts in that moment, a push can be lost, but the notification row (and the in-app list) is not. An outbox table would close that gap; it is not proposed for V1 (DB alternatives, section 25).
- **Reminders and scheduled checks** already run after their rows are saved.

## 9. Deep-link architecture

- **One mapping from a semantic target to a screen,** used by push taps, the in-app notification list, Proton commands (Phase 3) and `idindetails://` links:

  | Target | Screen |
  |---|---|
  | `{ type: "project", id, domain, section? }` | `projects/[id]` (`requirements`, `meetings`, `materials`, `labour`) |
  | `{ type: "requirement", projectId, requirementId }` | The project's requirements, scrolled to it and highlighted |
  | `{ type: "work_entry", id }` | Entry details |
  | `{ type: "conversation", teamId \| userId }` | That conversation |
  | `{ type: "labour_week", projectId, weekStart }` | The labour week |
  | `{ type: "page", page }` | A tab or list (`notifications`, `meetings`, `today`) |
  | `{ type: "person", id }`, `{ type: "client", id }` | Profile or client (admin phases) |

- **The server computes the target** for pushes (`PushTarget`), from kind, subject and payload. The in-app list computes the same targets on the phone, from the ported web logic.
- **Every target is checked against the screen table and permissions** before navigating. Not allowed → open Alerts instead.
- **Links only open screens.** A link never performs an action (no "mark done" from a URL). Notification action buttons (Phase 5) call the API with the signed-in session after the lock.
- **Cold start from a push:** the app restores the session, unlocks, then routes. A push for a different account than the one signed in (a shared phone) is ignored.
- **Email links** (`/accept-invitation`, `/reset-password`) keep opening the **website** in V1.
  - Opening them in the app needs universal links: `apple-app-site-association` and `assetlinks.json` served from the production domain. Caddy (in the API repo's `deploy/`) can serve them, so the website stays untouched.
  - Proposed for Phase 5, or earlier if invitations should complete in the app.

## 10. Offline architecture

**Scope in V1:** recording **materials** and submitting **labour weeks** without signal. Everything else needs a connection, but shows its last loaded data while offline.

### Reading offline

- React Query's cache is persisted (`@tanstack/react-query-persist-client` on `expo-sqlite/kv-store`) for what site staff need without signal:
  - my sites, each site's latest materials page with its types and suppliers;
  - labour weeks and defaults;
  - my requirements;
  - company settings.
- It is cleared on sign-out and kept per user.
- Screens show "Offline · last updated 10:42" when serving cached data.

### The outbox

A table in the phone's SQLite database:

| Column | Meaning |
|---|---|
| `id` | UUID, created on the phone |
| `user_id` | Owner. Only the owner's session ever sends or sees it |
| `kind` | `materials` or `labour_week` |
| `project_id`, `week_start` | Context |
| `payload` | JSON, validated with Zod when written and read |
| `photos` | Local file paths (receipts, if DB-5 is approved) |
| `status` | `pending`, `sending`, `sent`, `needs_attention` |
| `attempts`, `next_attempt_at`, `last_error_code`, `last_error_message` | Retry state |
| `created_at`, `updated_at` | |

### Recording materials offline

- The "Add materials" sheet is built for the phone, not the web's spreadsheet:
  - the site is already chosen from context;
  - type and supplier are picked from the site's recent ones;
  - "Repeat last" fills the previous entry;
  - quantity, unit and cost use a numeric keypad;
  - an optional receipt photo.
- **Saving puts the batch in the outbox at once.** The sheet closes with "Saved. Sending…" or "Saved on your phone. Will send when you're back online."
- **Each material gets a `clientRef`** (a UUID) when it is created on the phone. It never changes, through every retry.

### Submitting a labour week offline

- The week opens from the cached week (or the cached defaults for an unreported week), with each day's workers and daily pay.
- The cached week's `version` is kept (an opaque value from the API: `"0"` when not yet reported; see A9).
- Submitting puts `{ weekStart, days, note, expectedVersion }` in the outbox. Only one pending submission per project and week: a newer edit replaces a pending one that hasn't been sent.

### Duplicate prevention

| Case | Protection |
|---|---|
| **Materials sent twice** (a lost response, then a retry) | The server keeps `client_ref` per material (DB-3). If a material with the same `clientRef` already exists for the caller, it returns that material instead of creating another, without a new event or notification. A batch where every item exists already changes nothing |
| **Labour week sent twice** | `PUT` replaces the week, so the result is the same. If the stored days and note already equal the submission, the server changes nothing and sends no event or notification (A9). Today it re-notifies the managers on every resubmission |
| **The same action submitted twice on the phone** | One outbox row per batch; tapping again while it is pending does nothing. A labour week has at most one pending row |
| **Photos uploaded twice** | An upload whose response is lost leaves an unattached file; the API's existing cleanup deletes it after a day |

### Conflicts

- **Labour.** If someone else changed or submitted the week after the phone loaded it (`expectedVersion` differs and the days differ), the server answers `409 labour_week_changed`. The record shows "Someone changed this week", with both versions, and two choices:
  - **Use mine:** resend against the new version.
  - **Keep theirs:** discard mine.
- **Materials** have no conflicts on creation. A material can only be refused:

  | Refusal | Cause |
  |---|---|
  | `422 project_locked` | The site was completed or archived meanwhile |
  | `403` | The permission was removed |
  | `404` | The site is no longer visible |
  | `400` | Invalid; shouldn't happen, since the sheet validates the same shape |

  The record becomes "Needs attention", with the API's message, and can be discarded (or, for a locked site, its values copied into a new entry on another site).
- **Editing and deleting** materials and weeks needs a connection in V1.

### Being visible

- Every pending record shows on its site and in More → Pending records, with its state:
  - **Waiting for connection**
  - **Sending**
  - **Sent** (kept for 7 days, then removed)
  - **Needs attention** (with the reason)
- Today shows a banner when anything is pending or needs attention. A sent record links to the saved material or week.

### Signing out with unsent records

Sign-out first shows:

> 3 records haven't been sent yet.

- **Send now** (online only): sends them, then signs out.
- **Sign out and delete them:** asks a second time to confirm.
- **Cancel.**

A session that ends without the person choosing (an admin ends it, or it expires) keeps the records on the phone, owned by that person (next point).

### When the session ends while offline

- The records stay and keep their owner.
- When the phone is online and the refresh is refused, the sign-in screen appears. The outbox pauses; it never sends with someone else's session.
- **Signing back in as the owner** resumes it.
- **Another person signing in on the phone** sees none of it. Records left by someone else are deleted after 30 days. Phones are normally personal; shared phones are the exception.

### The date of an offline material: decision 8

`added_at` is the moment the **server** saves a material. That is "today" for live use, but for a material recorded on Monday and sent on Wednesday it is Wednesday. The date matters for the site's week-by-week cash and the exchange rate used. Options:

- **(a)** Keep the server's time (no change). Simple, but offline materials land on the day they sync.
- **(b)** Accept an optional `recordedAt` from the phone, bounded by the server: not in the future, at most 7 days back, and never before the current company month (like work entries' closed months). Used as `added_at`.

(b) is more accurate but trusts a client-supplied date for money. This needs your decision; (b) needs no schema change.

## 11. Synchronisation strategy

### Outbox sync engine (`src/offline/sync.ts`)

- **When it runs:**
  - right after a record is saved;
  - when the network returns (NetInfo);
  - when the app comes to the foreground;
  - on a timer while records are waiting.

  Later, background runs through `expo-background-task` (iOS and Android run these opportunistically, at most every 15 minutes or so).
- **How it runs:** one record at a time, oldest first, per owner, and only with the owner's session.
- **Before each send,** the access token is refreshed if needed, through the single `TokenManager`.
- **Materials with a photo:** upload the photo (`POST /api/files`), then send the batch with the file id (DB-5).
- **Each outcome:**

  | Outcome | What happens |
  |---|---|
  | `2xx` | Marked sent; the site's materials and labour queries are invalidated |
  | Network error, timeout, `5xx` | Stays pending; backoff of 5 s, 30 s, 2 min, 10 min, then every 10 min |
  | `429` | Waits for `Retry-After` |
  | `401` after a refresh attempt | The whole queue pauses until sign-in |
  | `400`, `403`, `404`, `409`, `422` | Needs attention; never retried automatically |

- **Pure and tested.** The state machine is a pure function (record + outcome → next state), unit-tested on its own.

### Server data (React Query)

- **Fresh after a change.** Each mutation invalidates its fixed list of queries.
- **Live signals** (`notifications`, `messages`) invalidate the badge, the lists and the open chat while the app is in the foreground.
- **Returning to the foreground** refetches stale queries (`focusManager` on `AppState`); `onlineManager` on NetInfo pauses queries offline and resumes them online.
- **Pushes:**
  - A push received in the foreground invalidates the matching queries.
  - The app does not try to sync data in the background from pushes in V1.

### Phone and web together

- The server is the single source of truth. Both apps read it.
- A change made on the web shows on the phone at the next live signal, return to the foreground, or refetch, and the other way round.
- What isn't shared:
  - the **timer**, which is per device (section 16);
  - **board layouts**, which the phone doesn't use;
  - **theme and sounds**, which are per device.

## 12. File and photo strategy

### Taking photos

- `expo-image-picker` for the camera or the photo library, with the OS's camera and library permissions requested when first needed.
- Before every upload, photos are processed with `expo-image-manipulator`:
  - resized to at most 2048 px on the long side;
  - re-encoded as JPEG at 0.8.

  Re-encoding drops EXIF, so location data never leaves the phone.
- **Videos** (messages only) are uploaded as they are, within the 100 MB limit. A warning appears on mobile data above 20 MB.

### Uploading

- `POST /api/files`, multipart field `file`, then attach the returned id.
- Upload progress is shown; a failed upload can be retried or removed.

### Where photos are used

| Phase | Photos |
|---|---|
| Phase 2 | Work-entry photos (one per entry, exists); chat photos (up to 10, exists); profile photo (exists); material receipts (DB-5, if approved) |
| Later | Site progress photos and requirement evidence. They need new attachment tables and a product decision on who sees them; not proposed now |

### Showing protected files

- `expo-image` with `source={{ uri, headers: { Authorization } }}` and its disk cache, keyed by file id.
- The API sends `no-store`. Phase 2 confirms that the image cache honours the id key regardless; if it doesn't, files are downloaded with `expo-file-system` into the cache directory.
- The cache is cleared on sign-out.

### PDFs and shares (Phase 4)

`expo-file-system` downloads the PDF with the bearer header into the cache, then `expo-sharing` opens the share sheet. Recording a WhatsApp or download delivery stays the existing endpoint.

## 13. State management strategy

| State | Where |
|---|---|
| Server data | React Query only. No copies in other stores |
| Session (user, permissions, tokens) | `SessionProvider` (React context). The access token in memory; the refresh token in the secure store |
| Lock state, theme | Small contexts |
| Timer | A small store (`useSyncExternalStore`, like the web's) backed by the SQLite key-value store, per user |
| Offline outbox | SQLite, read through hooks |
| Persisted query cache | SQLite key-value store, per user |
| Screen state (forms, sheets) | Local component state in smart components; forms with Zod |

No global state library: the needs are small, and the web manages without one too.

## 14. API integration strategy

- **Types:**
  - `npm run api:types` generates `src/api/schema.d.ts` from the development API's `/openapi/v1.json` (the web's script, ported). The generated file is committed.
  - New mobile endpoints appear there once built.
  - Named aliases live in `src/api/types.ts`.
- **Client:**
  - one axios instance with the base URL from config, JSON, and arrays as repeated keys (as ASP.NET expects);
  - a bearer interceptor, and a 401 interceptor that calls `TokenManager`;
  - a 30-second timeout; uploads and Proton get their own.
- **Errors:** every failure becomes an `ApiError` with `status`, `code`, `message`, `fieldErrors` and `traceId`, ported from the web. Screens branch on `code`.
- **Hooks:** one per endpoint, per feature, with one query-key scheme per feature (`["sites", projectId, "materials", filters]`) and fixed invalidation lists.
- **Company settings** (time zone, 24-hour clock, week start) load before any signed-in screen, as on the web. All formatting goes through `src/format`, which always uses the company's time zone (`Asia/Beirut`) and never the phone's. Tests run with a different `TZ` to prove it.
- **Money** is only ever formatted, never calculated.
- **No aggregation endpoints in V1.** Today is built from the existing `/me/day`, `/me/schedule`, `/me/work-summary`, `/me/requirements` and `/projects/site-summary`. A combined endpoint is only added if measuring shows Today is too slow on mobile networks.

## 15. Permission and role strategy

- **Port `permissionsOf(user)` from the web:** `has`, `hasAny`, `hasAll`, `canSeeDomain`, `isAdmin`, `isSuperAdmin`, `homeDomain`, `visibleDomains`, `hasCompanyArea`. The input is always `/auth/me`, never token claims.
- **One screen table** (`src/permissions/screens.ts`) lists every route, the permission rule it needs, and its tab or menu place. The tab bar, the guards, the deep-link checks and More all read it.

  | Screen | Needs |
  |---|---|
  | Work, Log work, Timer | `work_entry:create` + `work_entry:view_own` (Design employees), and `timerEnabled` for the timer |
  | My pay | `work_entry:view_own` |
  | Sites, Add materials | `material:create` or `material:manage` |
  | Labour week | `labour_report:create` or `labour_report:manage` |
  | My requirements | `requirement:view` |
  | Projects | `project:view` |
  | Meetings | `project:view`; create with `meeting:create` |
  | Messages, Alerts, Profile | Signed in |
  | Admin and super-admin screens | As on the web, added in Phases 3–4 |

- **Smart components check permissions and pass booleans down** (`canEdit`, `canComplete`). Dumb components never see permission codes.
- **Money never appears without `financial:view`.** The API already leaves it out of responses. The app doesn't render money fields for anyone in Phases 1–3.
- **Tested per persona,** like the web's `permissionMatrix.test.ts`: super admin, Design admin, Execution admin, Design employee, Execution employee, and a person with custom grants. Each is checked for what every screen does: open, hidden, or "not available".

## 16. Timer strategy

The timer is a start time, not a running process. That makes it survive everything a phone does.

### State

`{ userId, projectId, description, startedAt }`, saved in the phone's local store as soon as it starts. The display is always now − `startedAt`.

| Situation | Behaviour |
|---|---|
| **Background, killed, reopened** | Still right: the time is computed, not counted |
| **Phone restart** | The state is on disk. The ongoing notification is cleared by the reboot and posted again at the next app start |
| **Network loss** | Starting and stopping need no network. Logging the time does: the stopped run stays saved as a "time to log" card until it is logged or discarded |
| **Two devices** | Each has its own timer (below) |

### Stopping and logging

- Stopping opens the log sheet, filled in with the date, start and end, the project, and the description typed at start.
- The overtime preview comes from `POST /api/me/overtime-preview`, as on the web. Logging is `POST /api/work-entries`.
- The web's rules carry over: minimum 5 minutes, at most a day; a run past midnight keeps its evening part.
- **If the log's response is lost:** the retry gets `422 entry_overlaps`. The app then reads `/me/day` and treats an identical entry (same project, start and end) as already saved.
  - With `allowOverlap` on, a duplicate is possible but visible, and can be deleted.
  - A `client_ref` for work entries could close this later; it is not proposed now.

### On the lock screen and in notifications (V1)

- **Starting the timer posts a local notification:** "Timer running since 9:05 · Villa Haddad", with a **Stop** action.
  - On Android it is **sticky** (can't be swiped away) while the timer runs.
  - On iOS it is an ordinary notification; iOS has no persistent notifications outside Live Activities.
  - **Stop** opens the app (after the lock) on the filled-in log sheet.
- **A reminder after 4 hours** ("Your timer is still running"). The log sheet caps a run at what the server accepts (16 hours).
- **A live ticking counter on the lock screen** needs native code:
  - an Android foreground-service notification with a chronometer;
  - an iOS Live Activity with a widget extension.

  That is Phase 5 ("lock-screen timer").

### Web and phone timers are not synchronised

- The web's timer lives in the browser; the phone's lives on the phone.
- Someone who starts on the web can't stop on the phone. If they log the same time twice, the server refuses the overlap (unless the domain allows overlaps).
- **A shared server timer would need:**
  - a `running_timers` table and endpoints;
  - **a web change** so the web uses it too.

  Without the web change, the two would still disagree.
- So it is **not proposed now**. If wanted later, it gets its own proposal: schema, endpoints, the web change, and how a timer left running on another device is shown.

### Settings

- The timer shows only when the domain's `timerEnabled` is on and the person holds `work_entry:create`.
- The "log your hours" reminder follows `logReminder` (section 8).

## 17. Messaging strategy

### Screens

- **Conversation list:** team chats, then direct chats; unread counts, "@" for mentions, last message, time; search over contacts.
- **Thread:** cursor-paged history (`?before=`, 50 a page) in an inverted list, so it opens at the newest message with no scroll jump. The latest page is cached so it shows instantly.
- **Composer:**
  - text with @mentions (member picker) in team chats;
  - up to 10 photos or videos from the camera or library, uploaded as they are picked;
  - send.
- **Task-comment messages** render as a card, as on the web.

### Sending

- **Optimistic.** The message appears at once as "Sending…" and is confirmed by the response.
- **On failure:** "Not sent · Tap to retry". Messages are not queued offline in V1. A retry after a lost response can duplicate a message (no idempotency key exists). That is rare and visible; a `client_ref` on messages could come later.

### Read state and badge

- **Read state:** opening a thread, and each new message while it is open, calls `…/read`, as on the web.
- **Badge:** `GET /api/messages/badge` drives the Messages tab badge, and is part of the app icon badge (section 8).

### Live updates and reconnecting

- The SignalR connection (`/hubs/live`, bearer header) is open **only in the foreground**. It closes in the background, where the OS would kill it anyway.
- It reconnects on foreground and after the 15-minute token expiry (with the ahead-of-time token from `TokenManager`).
- Every reconnect invalidates the badge, the list and the open thread, so history catches up without gaps.

### Pushes

- Every message pushes to the chat's other members (section 8).
- In the foreground, a push for the open thread is not shown; others show as an in-app banner.
- Tapping a push opens the conversation.

### Presence

Online dots are polled every 60 seconds, only while Messages is on screen. A phone in the background shows its owner as offline, which is correct.

### Later

Voice messages, reactions, read receipts ("seen by"), typing indicators, and editing or deleting messages. Most need API and database work.

## 18. Error, loading and empty states

- **Loading:** skeletons shaped like the content (list rows, cards, the today summary). Pull to refresh on every list.
- **Errors:**
  - an inline error text next to what failed, with "Try again";
  - a full-screen error only when the whole screen can't load;
  - an error boundary per screen, so one failure keeps the tabs working.
- **Offline:** a thin banner, "You're offline. Showing what was loaded at 10:42." Actions that need the network are disabled with a reason, except the offline-capable ones.
- **Toasts** only for the outcome of an action the person just took ("Logged 2h 15m on Villa Haddad", with Undo where the API supports it). They are drawn in the web's inverted style.
- **Empty states:** the web's illustrations, ported to SVG, with what is missing and what to do ("No requirements assigned to you. Enjoy the quiet.").
- **API codes become words.** Known codes get specific messages (`project_locked`, `edit_window_closed`, `month_closed`, `entry_overlaps`, `rate_limited`). Anything else shows the API's own safe message with its trace id under "Details".
- **Accessibility:**
  - every touch target at least 44 pt;
  - labels on icon buttons;
  - Dynamic Type and font scaling respected (tested at 130%);
  - contrast from the web's tokens;
  - reduced motion respected.

## 19. Testing strategy

### Mobile (Jest with `jest-expo`, React Native Testing Library, MSW in Node)

| Area | What is tested |
|---|---|
| **Security** | `TokenManager`: only one refresh at a time (many concurrent 401s, exactly one refresh call); the token is persisted before use; what happens on network error, 429, 5xx and 401; sign-out clears everything; a user switch clears caches |
| **Sync** | The outbox state machine; backoff; error classification; `clientRef` kept across retries; a pending labour week replaced, not duplicated; owner isolation; the sign-out guard; pausing on 401 |
| **Permissions** | Each persona against every screen and tab; deep-link targets refused when not allowed |
| **Formatting** | Company time zone with the test process in another `TZ`; durations and money match the web's outputs |
| **Timer** | Elapsed time across a kill, a restart and midnight; the minimum and maximum rules |
| **Components** | Dumb components with plain props; smart screens with mocked API responses, for each persona |

### End to end (Phase 2)

[Maestro](https://maestro.mobile.dev) flows on the Android emulator, against the local API with seeded data: sign in, log work, add materials offline, then sync.

### Backend (in the API repo, following its CLAUDE.md)

- **Unit tests:**
  - `MobileRefreshRules`, every case in section 5: normal, retry inside the window, repeated retries, stale replay, two holders, superseded presented, signed out;
  - push text privacy for every kind;
  - quiet-hours timing;
  - push targets;
  - labour no-op and conflict rules.
- **Integration tests:**
  - mobile login, refresh, logout and change-password;
  - that web sessions are unchanged;
  - multiple devices;
  - device registration and moving a token to another user;
  - idempotent materials;
  - labour `409` and no-op;
  - pushes through a fake provider, including the permission recheck and dead sessions.

### Running tests on the laptop

The shared rules apply:
- check that no other session is testing first;
- 2 cores, low priority;
- Jest with `--maxWorkers=2`;
- integration runs only when asked, filtered where possible.

### Verification at each milestone

Type check, lint, unit tests, and an Android development build run on the Samsung phone.

## 20. Development environment

What to install on the Windows PC, once. Phase 1's first session walks through it step by step.

| Tool | Why | Notes |
|---|---|---|
| **Node.js 24 LTS** (comes with npm) | Runs Expo and the tooling | The web pins 24 (`.nvmrc`); this PC has 24.14 |
| **Git** | Already installed | |
| **VS Code** + the Expo Tools and ESLint extensions | Editing | |
| **Android Studio** | The Android SDK, `adb`, the emulator, and the bundled Java 17 | Install the SDK Platform for the SDK's target API, Platform-Tools and the Emulator, plus one Pixel system image. Set `ANDROID_HOME` and `JAVA_HOME`, and add `platform-tools` to `PATH` |
| **An Expo account** (free) | EAS cloud builds, push credentials | expo.dev |
| **EAS CLI** | Builds and store submissions | `npm install -g eas-cli`, then `eas login` |
| **Samsung USB driver** | Only if `adb devices` doesn't see the phone | |
| **A tunnel** (`cloudflared`) | Lets a phone reach the laptop's API over HTTPS | Mostly for the iPhone (section 22) |

- **No Mac is needed.** iOS apps are built in Expo's cloud (section 22).
- **Running the API for the phone:**
  1. Start it with the `http` profile, listening on the network: `dotnet run --launch-profile http --urls http://0.0.0.0:5164`.
  2. Allow port 5164 (and Metro's 8081) through Windows Firewall on private networks.
  3. Set `EXPO_PUBLIC_API_URL`:

     | Device | API URL |
     |---|---|
     | Android emulator | `http://10.0.2.2:5164` |
     | Physical phone on the same Wi-Fi | `http://<PC's LAN IP>:5164` |
     | iPhone | The tunnel's HTTPS address |

  The mobile endpoints need no cookie, so plain HTTP is fine in development.
- **Sample data:** the web's `scripts/seed-dev.mjs` already fills the development database. Its accounts (`dev-accounts.local`) work in the app too.
- **Expo Go vs a development build:**
  - **Expo Go** is a ready-made app that runs JavaScript projects. It can't receive push notifications on Android, and can't load custom native code.
  - **A development build** is our own app with Expo's developer tools inside. We use development builds from the start, built once and reinstalled only when native configuration changes. Day-to-day code changes reload instantly over Wi-Fi.

## 21. Android testing

1. **Emulator:** Android Studio → Device Manager → a Pixel device. `npx expo run:android` builds and installs the development build locally (no cloud build needed for Android).
2. **The Samsung phone:**
   1. Settings → About phone → Software information → tap **Build number** 7 times to enable Developer options.
   2. Developer options → **USB debugging** on.
   3. Connect by USB and accept the prompt. `adb devices` should list it.
   4. `npx expo run:android --device` installs the development build. Alternatively, an EAS `development` build can be installed from a link or QR code, no cable needed.
   5. Then `npx expo start` on the PC; the app on the phone connects to it over the same Wi-Fi and reloads on every save.
3. **Testing builds for others** (`preview`): an APK built by EAS, installed from a link. No store needed.
4. **Push on Android** needs a Firebase project. Expo's push service sends through Google's FCM. Its server key is uploaded to Expo once (`eas credentials`), and its `google-services.json` is given to the build through an EAS file variable, not the repo.

## 22. iOS testing

- **Building iOS apps needs macOS**, so EAS builds them in Expo's cloud.
- **An Apple Developer Program membership ($99 a year)** is needed for:
  - installing our own development or preview build on a real iPhone (ad-hoc distribution);
  - push notifications (an APNs key);
  - TestFlight;
  - the App Store.
- **Before having the membership,** Expo Go on an iPhone can show the JavaScript parts of the app (screens, navigation, the API), but not push or the parts that need our native configuration.
- **With the membership:**
  1. `eas device:create` registers the iPhone (open a link on the phone).
  2. `eas build --profile development --platform ios` builds the app.
  3. Install it from the link.
  4. `npx expo start` with a tunnel (`--tunnel`), and the API through its HTTPS tunnel.
- **TestFlight:** `eas build --profile production --platform ios`, then `eas submit -p ios` uploads it to App Store Connect. Testers install it through the TestFlight app; internal testers (team members) get it within minutes, without review.
- **An organisation account** (rather than a personal one) shows the company as the publisher and needs a **D-U-N-S number**. Apply early; it can take days.

## 23. Build and release strategy

### Build profiles (`eas.json`)

| Profile | What it is | Who uses it | API |
|---|---|---|---|
| `development` | Debug build with developer tools; reloads from the PC | Developers | Local |
| `preview` | Release build, internal distribution (APK / ad-hoc) | Testers in the company | Decision 9 |
| `production` | Store build, signed for the stores | Everyone | Production |

### How a release goes

1. A branch is finished, checked locally, merged through a PR.
2. **Native change** (new native module, permission, SDK upgrade): `eas build --profile production` for both platforms, then `eas submit` to Google Play **internal testing** and TestFlight. After testing, promote to production in each store.
3. **JavaScript-only change:** **EAS Update** can publish it over the air to installed apps on the matching runtime version (`fingerprint` policy), without a store review. Use it for fixes and small changes; anything touching native code goes through the stores.
4. Versions:

   | Field | How it's set |
   |---|---|
   | `version` (semver) | By hand for each release |
   | Build numbers | Automatically by EAS |

### Distribution for an internal company app

| Platform | Options |
|---|---|
| **Apple** | Apple discourages internal-only apps in the public App Store. **Unlisted distribution** (only people with the link can find it) or **Custom Apps through Apple Business Manager** fit an internal app. Either way, App Review needs a demo account. |
| **Google** | A public listing that requires sign-in, a **private app through Managed Google Play** (needs a Google Workspace or device management), or staying on a testing track for a small team. New **personal** developer accounts must run a closed test with several testers for two weeks before going to production; **organisation** accounts (D-U-N-S) are exempt. |

Decision 10: which route, and whether to open organisation developer accounts. Store rules change; check them when we get there.

### Credentials and where they live

| Credential | Where |
|---|---|
| Android upload keystore | Generated and stored by EAS (encrypted). A backup is downloaded once into the company password manager. Google Play App Signing holds the final key |
| iOS distribution certificate, provisioning profiles | Generated and stored by EAS |
| App Store Connect API key (for `eas submit`) | EAS credentials |
| Google Play service account key (for `eas submit`) | EAS credentials / file variable, never the repo |
| APNs key (iOS push) | Uploaded to Expo |
| FCM V1 service account key (Android push) | Uploaded to Expo |
| Expo push access token (server sending) | The API's secrets (user secrets in development, environment variable in production) |
| Production API URL | `eas.json` / EAS environment variables. Not a secret |

Nothing secret is ever committed or put in the app bundle.

### Accounts and costs

| Account | Cost |
|---|---|
| Apple Developer Program | $99 a year |
| Google Play Console | $25 once |
| Expo | Free to start. The free plan has limited, slower cloud builds; a paid plan only if build volume needs it |

### CI

GitHub Actions minutes are limited and pushes currently use `[skip ci]`. Phase 1 adds a small lint, type-check and test workflow that runs only on pull requests, never on every push. Cloud builds are started by hand.

## 24. Required backend changes

All in the API repo, on `MR-…` branches, following its CLAUDE.md: thin controllers, FluentValidation, services, pure business rules, tests and docs.

| # | Change | Phase | Database |
|---|---|---|---|
| A1 | `MobileAuthController`: login, refresh, logout, change-password, returning `MobileAuthResponse` | 1 | DB-1 |
| A2 | Mobile sessions: `MobileSession` options (30 days, 5-minute replay grace), `MobileRefreshRules`, `sid` claim on mobile access tokens, revoke reasons recorded on every revoke path | 1 | DB-1 |
| A3 | Push devices: `PUT /api/me/devices`, `DELETE /api/me/devices/current`, daily dead-session cleanup | 2 | DB-2 |
| A4 | Push pipeline: `IPushQueue` (staged and flushed like live signals), `PushDispatcher`, `IPushProvider` + `ExpoPushProvider`, receipts job, `PushText` (privacy-safe templates), `PushTarget`, badge count, quiet-hours delivery | 2 | — |
| A5 | Push hooks in `NotificationSender` (3 methods), `WorkLogNotifier`, `MessagingService` | 2 | — |
| A6 | Push-only reminders: log your hours, labour week | 2 | — |
| A7 | Notification settings: `GET` and `PUT /api/me/notification-settings` | 2 | DB-4 |
| A8 | Materials: optional `clientRef` per item; an existing `(caller, clientRef)` returns the existing material with no event or notification | 2 | DB-3 |
| A9 | Labour weeks: `version` on `GET` (opaque: `"0"` when unreported, otherwise from `updated_at` or `submitted_at`); optional `expectedVersion` on `PUT` (`409 labour_week_changed` when the week changed and the days differ); an identical resubmission is a no-op, with no event and no notification. The web sends no `expectedVersion`, so it behaves as today, except that an identical resubmission no longer re-notifies the managers | 2 | — |
| A10 | Optional `recordedAt` on materials, if decision 8 is (b) | 2 | — |
| A11 | Material receipts: attach a receipt photo to a batch | 2 (if approved) | DB-5 |
| A12 | Universal links: serve `apple-app-site-association` and `assetlinks.json` from Caddy | 5 (or earlier) | — |
| A13 | Proton: no change. Its navigation commands are semantic and map onto app screens; requests from the app send `page` context with the app's own screen names, already allowed by the existing shape | 3 | — |

Nothing on the web changes. No existing endpoint changes shape except additive optional fields (A8, A9, A10), which the web ignores.

## 25. Required database changes

Proposals only. Each needs explicit approval before any entity, configuration or migration is written. Only **DB-1** is needed for Phase 1. The rest are presented now so the whole picture can be judged, and will be confirmed again before their phase.

All follow the API's conventions: snake_case names, `BIGINT` ids, `DATETIME(3)` UTC, snake_case enum strings limited by named CHECK constraints, RESTRICT foreign keys.

### DB-1: mobile sessions on `refresh_tokens` (Phase 1)

```sql
ALTER TABLE refresh_tokens
  ADD COLUMN client        VARCHAR(10) NOT NULL DEFAULT 'web',
  ADD COLUMN session_id    CHAR(36)    NULL,
  ADD COLUMN revoke_reason VARCHAR(20) NULL,
  ADD CONSTRAINT ck_refresh_tokens_client
      CHECK (client IN ('web', 'mobile')),
  ADD CONSTRAINT ck_refresh_tokens_revoke_reason
      CHECK (revoke_reason IS NULL OR revoke_reason IN ('rotated', 'superseded', 'signed_out', 'revoked'));
CREATE INDEX ix_refresh_tokens_session_id ON refresh_tokens (session_id);
```

| | |
|---|---|
| **Entity** | `RefreshToken` gains `Client` (enum `RefreshTokenClient { Web, Mobile }`), `SessionId` (`Guid?`), `RevokeReason` (enum, nullable) |
| **Why** | The mobile session needs its own lifetime and replay rules without touching the web. That requires knowing which tokens are mobile, which tokens form one phone's session, and why each token stopped being valid (section 5) |
| **Feature** | 30-day mobile sessions, the lost-response grace window, per-device sign-out, tying push devices to a session (DB-2) |
| **Migration** | Additive. Existing rows become `client = 'web'`, `session_id` and `revoke_reason` null; the web logic ignores the new columns. New web rows also get a `session_id` (harmless, useful later). Revoke paths start writing reasons; old rows stay null. No data rewrite; one small index |
| **Rollback** | The migration's `Down` drops the index, the constraints and the columns. Mobile sessions would stop working (the app must sign in again once A1 is rolled back). Web sessions are unaffected either way |
| **Alternatives** | (a) Read the cookie by hand in the app: rejected in the plan. (b) A separate `mobile_sessions` table pointing at tokens: more joins, duplicates expiry and revocation. (c) Raise the global 30-second rule for everyone: weakens the web too, and still signs people out everywhere after a longer offline gap. (d) Store the raw successor token to return it again on retry: storing usable tokens is worse than storing reasons |

### DB-2: push devices (Phase 2)

```sql
CREATE TABLE user_devices (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT       NOT NULL,
  session_id   CHAR(36)     NOT NULL,
  provider     VARCHAR(10)  NOT NULL,
  push_token   VARCHAR(255) NOT NULL,
  platform     VARCHAR(10)  NOT NULL,
  app_version  VARCHAR(32)  NULL,
  created_at   DATETIME(3)  NOT NULL,
  updated_at   DATETIME(3)  NOT NULL,
  CONSTRAINT fk_user_devices_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT ck_user_devices_provider CHECK (provider IN ('expo')),
  CONSTRAINT ck_user_devices_platform CHECK (platform IN ('ios', 'android')),
  UNIQUE KEY ux_user_devices_push_token (push_token),
  KEY ix_user_devices_user_id (user_id),
  KEY ix_user_devices_session_id (session_id)
);
```

| | |
|---|---|
| **Why** | Pushes need to know where to send |
| **Feature** | Every push (section 8) |
| **Details** | `session_id` ties a device to the phone's session (DB-1), so a device is used only while its session is alive. `provider` allows FCM/APNs later without a new table. The unique token moves to whoever signs in on that phone |
| **Migration** | New table, nothing existing touched |
| **Rollback** | Drop the table; pushes stop, everything else works |
| **Alternatives** | (a) A device column on `users`: only one phone per person. (b) Keeping tokens only in Expo: Expo doesn't store them for us |

### DB-3: duplicate-safe materials (Phase 2)

```sql
ALTER TABLE project_materials
  ADD COLUMN client_ref CHAR(36) NULL,
  ADD UNIQUE KEY ux_project_materials_added_by_client_ref (added_by_id, client_ref);
```

| | |
|---|---|
| **Why** | An offline batch that was saved but whose answer was lost would be created again on retry. The phone's `clientRef` lets the server recognise it |
| **Feature** | Offline materials (section 10) |
| **Details** | MySQL allows many `NULL`s in a unique key, so materials added from the web (no ref) are unaffected. Scoped to the person who added it, so one person's refs can't collide with or reveal another's |
| **Migration** | Additive column and index; existing rows stay `NULL` |
| **Rollback** | Drop the index and column; the API ignores `clientRef` again (retries could duplicate) |
| **Alternatives** | (a) A generic `idempotency_keys` table storing responses for any request: more general, but more to build and store, and it needs response replay. (b) Detecting duplicates by comparing values (same name, cost, minute): unreliable, since two identical deliveries are legitimate. (c) The client checks the list before retrying: races and can't tell identical deliveries apart |

### DB-4: notification settings (Phase 2)

```sql
CREATE TABLE user_notification_settings (
  user_id          BIGINT      NOT NULL PRIMARY KEY,
  quiet_from_min   SMALLINT    NULL,
  quiet_to_min     SMALLINT    NULL,
  updated_at       DATETIME(3) NOT NULL,
  CONSTRAINT fk_user_notification_settings_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT ck_user_notification_settings_quiet
    CHECK ((quiet_from_min IS NULL AND quiet_to_min IS NULL)
        OR (quiet_from_min BETWEEN 0 AND 1439 AND quiet_to_min BETWEEN 0 AND 1439))
);

CREATE TABLE user_notification_mutes (
  user_id   BIGINT      NOT NULL,
  category  VARCHAR(20) NOT NULL,
  muted_at  DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, category),
  CONSTRAINT fk_user_notification_mutes_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT ck_user_notification_mutes_category
    CHECK (category IN ('work', 'requirements', 'projects', 'meetings', 'sites', 'money', 'people', 'messages'))
);
```

| | |
|---|---|
| **Why** | Per-person quiet hours and muted categories. Nothing personal exists today, only domain-wide switches |
| **Feature** | Quiet hours and preferences (section 8) |
| **Details** | No row means the defaults (decision 6). Quiet hours are minutes after midnight, company time; a range may cross midnight. Later privacy settings (for example "show money details on the lock screen") become columns of the settings table |
| **Migration** | Two new tables |
| **Rollback** | Drop both; everyone gets the defaults |
| **Alternatives** | (a) Company-wide quiet hours in configuration, no table: simpler, but nobody can choose their own. A smaller V1 if preferred: then only the default applies, and DB-4 waits. (b) One JSON column of settings: loses the CHECKs and strict typing. (c) Android channels only: no help on iOS |

### DB-5: material receipts (Phase 2, only if wanted)

```sql
CREATE TABLE material_receipts (
  id           BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id   BIGINT      NOT NULL,
  file_id      BIGINT      NOT NULL,
  added_by_id  BIGINT      NOT NULL,
  added_at     DATETIME(3) NOT NULL,
  CONSTRAINT fk_material_receipts_projects FOREIGN KEY (project_id)  REFERENCES projects (id) ON DELETE RESTRICT,
  CONSTRAINT fk_material_receipts_files    FOREIGN KEY (file_id)     REFERENCES files (id)    ON DELETE RESTRICT,
  CONSTRAINT fk_material_receipts_users    FOREIGN KEY (added_by_id) REFERENCES users (id)    ON DELETE RESTRICT,
  UNIQUE KEY ux_material_receipts_file_id (file_id)
);

ALTER TABLE project_materials
  ADD COLUMN receipt_id BIGINT NULL,
  ADD CONSTRAINT fk_project_materials_material_receipts
      FOREIGN KEY (receipt_id) REFERENCES material_receipts (id) ON DELETE RESTRICT;
```

| | |
|---|---|
| **Why** | One receipt usually covers several materials bought together. A receipt row links one photo to the batch's materials. Files can only be attached once, so the same file can't sit on each material |
| **Feature** | Receipt capture when adding materials (section 10) |
| **Details** | Whoever can see the project's materials sees the receipt (the same rule as the materials, enforced in `FileService`) |
| **Migration** | New table and a nullable column |
| **Rollback** | Drop the column, then the table; the receipt files become unattached and the cleanup job removes them |
| **Alternatives** | (a) `receipt_file_id` on each material: breaks the attach-once rule for batches. (b) Sending the receipt into the site's team chat: no new tables, but the receipt isn't linked to the materials. A possible zero-schema first step |

### Changes considered and not proposed

| Change | Why not |
|---|---|
| A push outbox table | In-memory delivery after commit is enough for V1; the notification itself is never lost (section 8) |
| A server-side running timer | Needs a web change to be useful (section 16) |
| `client_ref` on work entries and messages | The overlap check covers work entries; message duplicates are rare and visible |
| A sent-reminder log | Hourly reminder checks may repeat once after a restart; accepted |

## 26. Security implications

| Area | Implication | Mitigation |
|---|---|---|
| Refresh token in the body | The app holds a long-lived token | Keychain / Keystore, this-device-only, never logged or put in URLs; rotated on every refresh; 30-day idle expiry; biometric lock on the app; admins can end sessions |
| 30-day session | A lost, unlocked phone stays signed in longer | Biometric lock with a timeout; phone passcode; "End sessions" by a super admin; password change ends every session |
| Replay grace (5 minutes, mobile only) | A stolen token whose successors were never used can be exchanged within 5 minutes | Detection still happens at the phone's next refresh (section 5); outside the window a replay only ends that session; everything is logged under the security category |
| Login from carrier networks | Many phones share an IP; the `auth` limit is 10 a minute per IP | Monitor. If needed, a mobile login limit partitioned by IP and a hash of the email (a later, separate change) |
| Push content | Passes through Expo, Apple and Google | No money, client names or pay in text; only ids in the data payload; Expo access token on the server |
| Shared phones | A push token or offline record could reach the wrong person | Tokens move to whoever signs in; records are owner-only; pushes for another account are ignored |
| Deep links | A crafted link could try to trigger something | Links only open screens, after the lock, with permission checks |
| Data at rest | Cached lists and offline records on the phone | OS encryption (iOS Data Protection, Android file-based encryption); cleared on sign-out; no money for employees. SQLCipher (supported by `expo-sqlite`) can be switched on if wanted |
| Photos | Location data in images | Re-encoded on the phone before upload |
| App bundle | Anything in it is public | No secrets in the app; all keys stay server-side or in EAS |
| Transport | | HTTPS only in preview and production; no certificate pinning (Let's Encrypt rotation would break installed apps) |

## 27. Risks and trade-offs

| Risk | Impact | Response |
|---|---|---|
| React Native can't set the fonts' width axis | The condensed numbers and widened headings look wrong | Bundle static font instances at the exact widths and weights, made from the variable fonts with `fonttools` (OFL allows it). Checked on both platforms in Phase 1 |
| iOS can't keep a timer on the lock screen without native code | The iOS timer is less visible than Android's in V1 | Live Activities in Phase 5 |
| Web and phone timers are separate | Someone could start on one and expect it on the other | Explained in the app; a server timer later needs a web change |
| Ported web code drifts | Wording, formatting or permissions differ between web and phone | `docs/ported-from-web.md` lists each ported module; compare when the web changes. A shared package later needs a web change |
| Single API instance | In-memory push queue and presence; pushes in flight are lost on restart | Accepted for V1; the notification rows survive |
| Expo push service down | No pushes for a while | In-app lists still work; the provider abstraction allows moving to FCM/APNs |
| Offline materials dated by sync day | Site cash charts shift | Decision 8 |
| Labour conflicts offline | Two people edit one week | Version check with a clear choice (section 10) |
| No staging server | Preview builds test against production or the laptop | Decision 9 |
| App store rules for internal apps | Review delays or rejection | Unlisted / custom apps (Apple), private or testing tracks (Google); organisation accounts early |
| Learning curve | Slower first phases | Teaching built into Phase 1; each step explained as it is done |
| Notification noise for admins | `work_logged` pushes for every entry | Categories can be muted; the domain's `notifyEntry` digest option; tuned in Phase 3 |

## 28. Phase 1 implementation breakdown

Phase 1 builds the foundation: no product features beyond signing in and an empty, permission-aware shell. Each step is a branch with regular commits, merged through a PR, and pushed once when finished and checked.

| Step | Repo | What | Done when |
|---|---|---|---|
| **1.1 Set up the PC** | — | Guided install (section 20): Node, Android Studio, emulator, Expo account, EAS CLI; enable USB debugging on the Samsung | `adb devices` shows the phone; the emulator starts |
| **1.2 Scaffold** | mobile | `create-expo-app` on SDK 57 with TypeScript and Expo Router; strict TS; ESLint and Prettier; Jest (`jest-expo`, RNTL, MSW); the folder structure (section 2); `app.config.ts` variants; `eas.json`; the PR-only CI workflow | The app opens on the emulator and the phone in a development build |
| **1.3 Theme and UI kit** | mobile | Tokens (light, dark), static font instances, the ported icons and avatars; dumb primitives: Text, Button, IconButton, Card, ListRow, Badge, Field, Sheet, Toast, Skeleton, EmptyState, ErrorText, Avatar, ScreenHeader; a development-only gallery screen | The gallery matches the web's look in light and dark, with 44 pt targets |
| **1.4 API layer** | mobile | Axios client, `ApiError`, generated types, query client (AppState and NetInfo), company settings bootstrap, ported formatting with time-zone tests | Calls to the local API work from the phone |
| **1.5 Mobile sessions in the API** | API | **After DB-1 is approved:** migration, `MobileRefreshRules`, `MobileAuthController`, `MobileSession` options, `sid` claim, revoke reasons; unit and integration tests; `docs/authentication.md` updated | Every case of section 5 is tested; web sign-in unchanged |
| **1.6 Sign-in in the app** | mobile | `TokenManager` (secure store, one refresh at a time, persist before use), sign in, session restore, sign-out, change password (including `mustChangePassword`), forgot password, session-ended handling | Signed in on the phone, killed, reopened: still signed in; refresh tests pass |
| **1.7 Biometric lock** | mobile | Opt-in, lock on start and after the timeout, privacy cover, fallback | Lock works on the phone (and the emulator's simulated fingerprint) |
| **1.8 Permissions and navigation** | mobile | Ported `permissionsOf`, the screen table, tabs per person with placeholder screens, guards, "not available" screen; persona tests | Each persona sees the right tabs |
| **1.9 Docs** | mobile | `docs/setup.md` (the PC and phone setup as actually done), `docs/architecture.md`, `docs/ported-from-web.md`, README | A new developer can run the app from the docs |

Phase 1 ends with a demo: sign in on the Samsung, see your own tabs, lock and unlock with a fingerprint, kill the app and come back still signed in.

## Later phases

- **Phase 2: employee and site-staff V1.**
  - Today, Work, the timer, log work, the week;
  - sites, materials (offline), labour weeks (offline), requirements, projects (read);
  - meetings, messages, Alerts, profile;
  - push (A3–A9), camera.

  DB-2, DB-3 and DB-4 (and DB-5 if wanted) are confirmed before it starts. A device calendar "Add to calendar" for meetings and deadlines is a small optional item here.
- **Phase 3: admin.**
  - Today for admins;
  - project status changes, requirement management and completion, meetings, activity;
  - client contact actions (call, WhatsApp, email);
  - admin notifications, Proton (mapping its commands to app screens; voice input through the phone's keyboard dictation).
- **Phase 4: super admin.**
  - Company headline figures, money alerts, recording payments;
  - sending invoices and statements, sharing PDFs;
  - ending sessions, Proton;
  - first widgets.
- **Phase 5: native enhancements.**
  - lock-screen timer (Live Activities, foreground service), home-screen widgets;
  - notification action buttons;
  - richer offline, device management;
  - voice, receipt scanning, deeper calendar integration;
  - universal links.

  Location, check-in and attendance only with explicit product and privacy approval.

## Decisions needed

1. **App name and bundle id.** Store name "ID InDetails"? Base id, for example `com.indetails.app`. The id can't change after publishing.
2. **DB-1** (needed for Phase 1): approve as proposed? DB-2 to DB-5 will be confirmed again before Phase 2, but early feedback is welcome.
3. **Mobile session:** 30 days idle with no absolute cap, or add a cap (for example 180 days)? Replay grace 5 minutes, with a stale replay ending only that session (section 5)?
4. **Project titles in non-money pushes:** allowed ("…on Villa Haddad"), or generic ("…on a project")?
5. **Message pushes:** show sender and a preview, or only "New message from Rana"?
6. **Default quiet hours:** 22:00–07:00 company time, silent delivery? Per-person settings (DB-4) in V1, or company-wide only at first?
7. **Reminders:**
   - Log your hours: in the hour before the person's day ends?
   - Labour week: Saturday at 15:00, to whom? Proposed: Execution people with `labour_report:create` who recorded anything on a site in the last 4 weeks whose week isn't reported yet.
8. **Date of offline materials:** the server's time (a) or the phone's recorded time within bounds (b)? Section 10.
9. **Preview builds:** point at production (real accounts, real data) or at a staging API (would need a server set up)?
10. **Store distribution:**
    - Apple: unlisted or custom app.
    - Google: public-with-sign-in, private, or a testing track.
    - Open organisation developer accounts (D-U-N-S)?
11. **Biometric relock timeout:** 5 minutes in the background?
12. **Theme:** follow the phone's light/dark setting by default (with a choice in the app), or light by default like the web?
13. **Material receipts (DB-5):** wanted in Phase 2, or start with sending receipt photos to the site chat?
