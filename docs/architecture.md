# Architecture

How the phone app is built, as it is now. The reasons behind the choices are in [phase-0-plan.md](phase-0-plan.md); the agreements between the phases (endpoints, shared modules, file owners) in [contracts.md](contracts.md); the rules for writing code in [CLAUDE.md](../CLAUDE.md).

## Contents

1. [The stack](#1-the-stack)
2. [Folders](#2-folders)
3. [Smart and dumb components](#3-smart-and-dumb-components)
4. [Data from the API](#4-data-from-the-api)
5. [Sign-in and the session](#5-sign-in-and-the-session)
6. [The biometric lock](#6-the-biometric-lock)
7. [Permissions](#7-permissions)
8. [Navigation](#8-navigation)
9. [Theme and fonts](#9-theme-and-fonts)
10. [Tests](#10-tests)

---

## 1. The stack

React Native with **Expo SDK 57**, **TypeScript** (strict), **Expo Router** (routes are files), **TanStack React Query** for server data, **axios** for HTTP, **Zod** for forms, `expo-secure-store` for the refresh token, `expo-local-authentication` for the lock, and `expo-sqlite`'s key-value store for small things kept on the phone. No global state library.

## 2. Folders

```text
app/                    Routes. Thin files that read the route's parameters and render a feature's screen.
  _layout.tsx           Fonts, providers (theme, query client, session, lock), the lock overlay
  +native-intent.tsx    Where a link that opens the app goes
  (auth)/               sign-in, forgot-password, change-password
  (app)/                everything signed in, behind the guards
    (tabs)/             the tab bar, built per person
src/
  api/                  http client, ApiError, generated schema.d.ts, the query client
  auth/                 session, token manager, sign-in screens, the lock (lock/)
  config/               env: the API and website addresses, the build variant
  permissions/          permission codes, permissionsOf, the screen table
  navigation/           route parameters, push and Proton targets, universal links
  theme/                tokens (light, dark), typography, fonts, ThemeProvider
  ui/                   the dumb UI kit and charts
  format/               dates, times, money and phones in the company's time zone
  features/<area>/      api.ts (hooks), screens/ (smart), components/ (dumb), model.ts (pure logic)
  offline/ push/ live/  the outbox, push notifications, live updates (Phase 2)
assets/fonts/           static font instances and their licences
scripts/                api-types.mjs (types from the API), fonts.py (font instances)
test/                   MSW server and handlers, personas, renderWithProviders
```

Which phase owns which files is in contracts.md section 7.

## 3. Smart and dumb components

- **Smart** (`screens/`, route files, providers): read the session, permissions and server data, navigate, hold the screen's state.
- **Dumb** (`src/ui/`, `features/*/components/`, `auth/components/`): props in, callbacks out. ESLint refuses an import of the API, the session, permissions or the router in `src/ui` and `features/*/components`.

A screen usually renders one dumb view with plain values: `SettingsScreen` reads the theme, the lock and the permissions, and hands `SettingsView` a theme, a lock setting and the callbacks for the links it may show.

## 4. Data from the API

```text
screen ─► feature hook (useQuery / useMutation) ─► http (axios) ─► API
                                                   │  Bearer access token
                                                   │  401 → tokenManager.refresh() → repeat once
                                                   └► every failure → ApiError { status, code, message, fieldErrors, traceId }
```

- **One hook per endpoint**, in the feature's `api.ts`, with one query-key scheme per area.
- **`http`** (`src/api/http.ts`) adds the access token, sends arrays as repeated keys, and on a `401` repeats the request once with a fresh token: the one a refresh that finished meanwhile already got, or a new refresh.
- **The query client** (`src/api/queryClient.ts`) has the web's retry rules (no retry on a `4xx`, two on network and server failures). Coming back to the foreground counts as "focus" and refetches stale data, after refreshing an access token about to run out. In the background nothing new starts. Offline pauses queries (NetInfo).
- **Errors** are always `ApiError`; screens branch on `code`, never on the message.
- **The company's settings** (time zone, clock, week start) load before any signed-in screen, because every date is formatted in the company's time zone.

## 5. Sign-in and the session

```text
sign in ─► POST /api/mobile/auth/login ─► refresh token → secure store (first)
                                          access token  → memory
                                          the person    → session (and /auth/me cache)

request ─► 401 ─► tokenManager.refresh()  one at a time, app-wide
                    1. read the refresh token from the secure store
                    2. POST /api/mobile/auth/refresh (no answer → up to 3 more tries, same token)
                    3. store the NEW refresh token   ◄─ before anything else
                    4. use the new access token, and the person in the answer
```

**`src/auth/tokenManager.ts`** holds the tokens. The access token lives in memory only; the refresh token only in the secure store (Keychain / Keystore), this device only, never in backups and not behind biometrics, so background work can refresh without the person present.

| A refresh that… | What happens |
|---|---|
| Got no answer (network, timeout) | Tried again after 1, 3 and 9 s with the same token. The API accepts a replayed token for 5 minutes, in case the answer was lost. Then the request fails and the session is kept |
| Got `429` or `5xx` | The request fails at once; the session is kept |
| Got `401` | The session has ended (below) |
| Couldn't store the new token | The session ends: the phone can't carry on with a token it couldn't keep |

Requests that failed with an old token after a refresh finished are repeated with the new token, without another refresh. A refresh that finishes after the person signed out is dropped.

**`src/auth/session.tsx`** (`SessionProvider`, `useSession`, `useCurrentUser`):

- **At start** it restores the stored session. When the person is known from last time (kept in the key-value store), the app opens at once with them, even offline, and the refresh runs behind. Otherwise it waits for the refresh; if the API can't be reached it says so on the sign-in screen and keeps the stored token.
- **The person stays current.** Every refresh's answer carries the person; `/auth/me` is also read every 5 minutes while open and on every return to the foreground. A permission change reaches the tabs and the guards that way.
- **When the session ends** without the person choosing (the refresh is refused): the tokens, the query cache, toasts, the image caches, the remembered person and everything registered with `onSignOut` are cleared, and the sign-in screen says "Your session ended. Please sign in again."
- **Signing out** sends `POST /api/mobile/auth/logout` (5-second limit) and signs out locally whatever the answer: on a phone the intent to leave wins, and the token dies on its own after 30 days. Then the same clearing.
- **`onSignOut(cleanup)`** (`src/auth/signOutCleanup.ts`) is how other parts drop what they keep per person. The cleanup gets `"signedOut"` or `"sessionEnded"`.
- **Changing the password** (`POST /api/mobile/auth/change-password`) returns new tokens, which are stored the same way. A temporary password (`mustChangePassword`) has to be changed first: the API refuses everything else until then.
- **Forgotten passwords** ask `POST /api/auth/forgot-password` and always show the same neutral answer. Invitations and reset links finish on the website; the sign-in screen opens it (`EXPO_PUBLIC_WEB_URL`).

## 6. The biometric lock

A local lock, not sign-in (`src/auth/lock/`). The server session is the refresh token; the lock only decides whether this person may look at the app now.

- **Offered once** after a password sign-in on a phone with biometrics set up, and switched on or off in Settings. Switching it on asks the phone to confirm its owner. The choice is kept per person on the phone.
- **Locks** when a stored session is restored at start, and on returning after **5 minutes** or more in the background (decision 11). The phone's prompt opens by itself once per lock.
- **Unlocks** with Face ID, the fingerprint, or the phone's passcode (the platform's own fallback). After two unlocks that didn't work, "Sign out" is offered; a phone with no screen lock left can only sign out.
- **Covers** the app with the mark whenever it isn't in the foreground, so the app switcher's snapshot shows nothing.
- **Drawn above everything** by `LockOverlay` in the root layout, as a modal, so sheets and dialogs are covered too. The app underneath keeps its place.
- **Work that must wait for the unlock**, such as opening a tapped push's screen, goes through `afterUnlock(task)`: it runs now when unlocked, or right after the unlock, and is dropped if the person signs out.

## 7. Permissions

- The person and their permission codes come from `/auth/me` (and every refresh), never from the token's claims.
- `permissionsOf(user)` (`src/permissions/permissions.ts`, ported from the web) answers `has`, `canSeeDomain`, `isAdmin` and the rest.
- **One screen table**, `src/permissions/screens.ts`, lists every route with its rule, its title and its place in More. The tab bar, the route guard, More, deep links and push targets all read it, so they can't disagree.
- Smart components check permissions and pass booleans down. Hiding something is a convenience: the API checks every request again.

## 8. Navigation

- **`app/(auth)`**: signed out, or changing the password. Someone signed in is sent on to the app, or first to choose their own password while a temporary one is pending.
- **`app/(app)/_layout.tsx`**, the guards, in order: restoring → the boot screen; signed out → sign-in; a temporary password → change it; the company settings loading → the boot screen; a screen the person can't open → "Not available".
- **Tabs** are built per person from the screen table (`tabsFor`), and **More** lists the rest of what they can open.
- **Links.** `idindetails://` links name a route, and Expo Router opens it; https links to the company's domain go through `routeForUniversalLink` (`app/+native-intent.tsx`). The guards and the lock apply to whatever a link opens, and links only ever open screens. Push taps map their target with `routeForTarget` and wait for the unlock with `afterUnlock`.

## 9. Theme and fonts

- **Tokens** (`src/theme/tokens.ts`) are the web's `hourline.css` values, light and dark. `ThemeProvider` follows the phone's setting unless the person picks Light or Dark in Settings (decision 12).
- **Typography** (`src/theme/typography.ts`) is the web's type roles, a little larger for phones.
- **Fonts.** The web's Archivo and Martian Mono set their width axis, which React Native can't. `scripts/fonts.py` makes static instances at the exact widths and weights from the web's variable fonts (docs/setup.md section 10), `src/theme/fonts.ts` maps each face and weight to one, and the root layout loads them before hiding the splash screen.

## 10. Tests

- **Jest** with `jest-expo`, **React Native Testing Library** (`await render…`), and **MSW** as the API.
- `renderWithProviders(ui, { persona })` renders inside the theme, a fresh query cache and a signed-in session as one of the ported personas; `persona: null` starts signed out and restores from the (mocked) secure store.
- The secure store and the key-value store are in-memory stand-ins (`test/mocks`).
- The security-sensitive parts have the most: the token manager (one refresh at a time, persist before use, every refresh outcome, retries), the session (restore, end, sign-out clearing, foreground re-reads), and the lock (cold start, relock timing, failures, held work).
