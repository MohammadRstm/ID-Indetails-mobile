# Native features

What the phone-only enhancements do, how to check each one, and what they need. Everything here is optional:
if a native part is missing (Expo Go, an old build, a permission refused) the app works and the feature is
quietly off.

## What needs an EAS build

Expo Go cannot run any of the native parts below. Use a development build (`APP_VARIANT=development`) or a
preview build. Changing the plugins in `app.config.ts` changes the native code, so the build must be redone
(the runtime version uses the fingerprint policy, so an over-the-air update will not reach an older build).

| Feature | Needs a native build | Notes |
|---|---|---|
| Devices screen | No | Plain API calls |
| Add to calendar | Yes | `expo-calendar` and its permission texts |
| Notification action buttons | Yes | Real pushes need a build with push set up; categories are registered at start |
| Background sync | Yes | `expo-background-task` plus `expo-task-manager` |
| Android home-screen widget | Yes | `react-native-android-widget` |
| iPhone widget and Live Activity | Yes | `expo-widgets` adds a widget extension target and an App Group (`group.<bundle id>`) |
| Universal links | Yes | Associated domains and verified intent filters are native; also needs the two `.well-known` files |

## Devices (Settings > My devices)

Lists the phones that receive the person's pushes (`GET /api/me/devices`), marks "This phone", and signs
another phone out after a confirmation (`DELETE /api/me/devices/{id}`). Check: sign in on two devices, open
the screen, sign the other one out; it should stop receiving pushes and disappear from the list.

## Add to calendar

`AddToCalendarButton` puts a meeting or a requirement deadline into the phone's calendar.

- Times from the API are instants and stay the same instant on the phone.
- An all-day deadline is a date in the company's time zone and stays that date whatever zone the phone is in.
- The permission is asked on first use. iOS 17+ asks only to add events; Android asks for calendar access
  and uses a calendar the app creates when no writable one exists.

Check: add a meeting, open the phone's calendar and compare the time with the app. Add a deadline, change the
phone's time zone, and confirm the all-day date has not moved. Refuse the permission once: the button should
explain instead of failing.

## Notification buttons

Categories are registered by `registerNotificationCategories()`. The ids `requirement` and `message` do not
clash with the app's own `timer` category. Every action opens the app and, on iPhone, needs the phone
unlocked; the app then passes its own lock and calls the API with the signed-in session.

| Button | Category | Does |
|---|---|---|
| Mark done | `requirement` | `POST /projects/{pid}/requirements/{rid}/done` |
| Reply (text input) | `message` | Sends the typed text to that team or direct conversation |

**The API must send `categoryId` with each push** (the field the phone matches to a category): `requirement`
for `requirement_assigned`, `requirement_due_soon` and `requirement_overdue` pushes whose target is a
requirement; `message` for `message` pushes whose target is a conversation; none for anything else. The rule
is `categoryForPush` in `src/push/categories.ts`. Without it the push still arrives and opens its screen,
just without buttons. A push for a different account than the signed-in one is ignored.

Check: send a requirement push to a signed-in test device, long-press (iPhone) or expand (Android) it, tap
Mark done, unlock, and see the requirement ticked.

## Background sync

`registerBackgroundSync(run)` registers one task (`idi-outbox-sync`) that sends the offline outbox. The phone
decides when it runs: at best about every 15 minutes, often much less, and iOS may skip it entirely. It does
nothing without a stored session and logs failures without any message or payload. Check on Android with
`adb shell cmd jobscheduler run -f <package> <job id>`; on iPhone use Xcode's "Simulate Background Task".
Nothing runs in Expo Go.

## Lock-screen timer

- iPhone: a Live Activity (`expo-widgets`) shows the project, the description and a running clock counted from
  the start time (the OS draws the clock; the app does not update it).
- Android: nothing here; Phase 2's ongoing notification is the lock-screen timer.

Check on iPhone: start a timer and lock the phone; stop it and the activity disappears.

## Home-screen widgets

One widget, "Today's hours", on both platforms: today's hours and links that open the app on Today (start the
timer), Log work and Add materials (`idindetails://today`, `idindetails://log-work`,
`idindetails://materials/add`). Links only open screens.

The widget never calls the API and holds no token. The app writes a small cache (the company day, minutes,
whether a timer runs) with `publishTodayHours()` whenever it learns today's hours and clears it on sign out
with `clearWidgets()`. A cache from an earlier day shows "Open the app to refresh" instead of old hours.

- Android: long-press the home screen, Widgets, "Today's hours". The widget task handler must be registered
  when the JavaScript bundle loads: call `registerWidgets()` from the app's start-up code.
- iPhone: long-press the home screen, plus, "Today's hours".

## Universal links

Links to the company's website open the app when `EXPO_PUBLIC_WEB_DOMAIN` is set at build time (for example
`app.example.com`). When it is unset, no associated domain or intent filter is added. `routeForUniversalLink`
maps `/projects/{id}`, `/projects/{id}/requirements|materials|labour`, `/meetings`, `/meetings/{id}`,
`/notifications` and `/today`. Invitation and password-reset links (`/accept-invitation`, `/reset-password`)
return null and keep opening the website. The screen still checks the person's permissions.

The website's domain must serve these two files over HTTPS with no redirect, as `application/json`. Caddy in
the API repo's `deploy/` can serve them without touching the website.

`/.well-known/apple-app-site-association` (no file extension):

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<TEAM_ID>.com.indetails.app"],
        "components": [
          { "/": "/projects/*" },
          { "/": "/meetings*" },
          { "/": "/notifications" },
          { "/": "/today" }
        ]
      }
    ]
  }
}
```

`/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.indetails.app",
      "sha256_cert_fingerprints": ["<SHA256_FINGERPRINT_OF_THE_SIGNING_KEY>"]
    }
  }
]
```

Replace `<TEAM_ID>` with the Apple Developer Team ID and the fingerprint with that of the key that signs the
release build (`eas credentials`, or the Play Console's app signing page when Play signs the app). Only the
production app id is listed; the dev and preview apps have their own ids (`.dev`, `.preview`) and are not
opened by website links.

Check: `adb shell am start -a android.intent.action.VIEW -d "https://<domain>/projects/1"` opens the app, and
`adb shell pm get-app-links com.indetails.app` shows the domain as verified. On iPhone, paste a link into
Notes and long-press it; the app should be offered.

## Prerequisites

- An Apple Developer account (widget extension, App Group, associated domains, push).
- `EXPO_PUBLIC_WEB_DOMAIN` set in the EAS environment for builds that should open website links.
- The API sending `categoryId` on pushes (above).
