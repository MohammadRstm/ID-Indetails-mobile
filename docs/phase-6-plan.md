# Phase 6: catching up with the website (Proton and project pages)

What changed in the API and the website since the phone app was merged (8 to 13 Oct 2026), what the phone should do about each change, and the plan to build it. Written on 13 Oct 2026 from two read-only audits:

| Repo | Range audited |
|---|---|
| API | `master` from `5f197d3` (the mobile API merge) to `8845537`: 78 commits |
| Website | `main` from `4cd10cd` (the state the phone was ported from) to `a6ab622`: 65 commits |

**Status: waiting for approval.** Nothing here is built yet.

## Contents

1. [What changed](#1-what-changed)
2. [Where the phone stands now](#2-where-the-phone-stands-now)
3. [Verdict per change](#3-verdict-per-change)
4. [Implementation phases](#4-implementation-phases)
5. [API and database](#5-api-and-database)
6. [Risks](#6-risks)
7. [Decisions needed](#7-decisions-needed)
8. [Problems found (not fixed)](#8-problems-found-not-fixed)

---

## 1. What changed

Almost everything is Proton, the company assistant. Its main reference is the API's `docs/proton.md`, with decisions in `docs/proton-stage-5-plan.md`.

| Change | API | Website |
|---|---|---|
| **Streaming answers.** `POST /api/proton/messages/stream` answers as server-sent events (`status`, `delta`, `done`, `error`, a ping every 10 s), with a 120 s timeout. Stop aborts the answer and nothing of it is kept | e798129 | c58b2e5 |
| **Greeting, briefing, quick replies, suggestions.** `GET /proton/briefing` needs no model call. Replies carry `quickReplies` and `suggestions`, and the request can answer with `reply` or `suggestion` instead of text. `rolledOver` says when an old chat was continued | ✓ | 62d2a55 |
| **Opening anything.** New command types: `open_surface` (20 forms and dialogs), `fill_form` (8 forms, never submitted) and `set_preference` (theme or sounds). More pages and project sections can be opened | 28f9b99, 694a912 | 37bdf06, a953f18 |
| **Action engine.** Up to 3 cards (`pendingActions[]`). `preview.confirm` is `standard`, `two_step` or `typed` (the typed phrase is sent on confirm). Strong cards show `area`, `reach` and `irreversible`. `GET /proton/actions` restores card statuses. Families beyond Core (lifecycle, deletes, access, company rules, pay rules, money, messaging) are **off by default** | 6a93110, 6a92590, dc4df34 | 380c134 |
| **Messages sent as the user.** `MessageResponse.viaProton`; the website writes "with Proton ·" before the time | 8761750 | cbd3cf7 |
| **Memory.** `GET`, `POST` and `DELETE /proton/memories`, for preferences only (300 characters, 20 per person) | 70bebc7 | 23fd66a |
| **Voice.** GPT-Live over WebRTC: `POST /proton/voice/sessions` with an SDP offer, returning the provider's answer; 10 minutes at most; off by default | 15a6bf9 | f7ae0a2 |
| **Saved chats.** `GET`, `PATCH` and `DELETE /proton/conversations(/{id})`, deleted after 90 untouched days; a chat whose owner lost access reads as hidden | bbafc74 | ac77f93 |
| **Charts, tables, KPIs.** `blocks[]` on replies (chart: bar, columns, line or composition; table: up to 100 rows; KPIs: up to 6), with units, `partial` and source notes | bbafc74, 75a11dc | ac77f93 |
| **Employees get Proton.** `proton:use` is now an employee default (seed migration), with cards for their own work and the pages `my_work`, `my_pay` and `my_profile` | ca5491a | 96946e7 |
| **Design project page split** into Financials, Overview, Analytics, Contributors, Requirements, Timeline (now a calendar) and Meetings, each gated by permission | — | 5bb53ff, a465c21 |
| **Site cost totals.** `materialCost` and `groundLabour` on `/projects/site-summary` are now `null` without `financial:view` | b2ab96b | d782098 |
| Also: overdue billing link (`?overdue=1`), chart accessibility labels, person search in the project history, weekly report bars counting whole weeks | ✓ | ✓ |

**Database:** 5 migrations, none from the phone side:
- `MessagesViaProton`
- `EmployeesUseProton` (seed)
- `ProtonMemories`
- `ProtonVoiceUsage`
- `ProtonSavedChats`

**Unchanged:** none of the phone's own endpoints changed (mobile sign-in, devices, notification settings, push, materials `clientRef`, labour `version`). Commit 7d3da0c only marks them as never reachable by Proton.

## 2. Where the phone stands now

Nothing is broken, but the phone is behind:

1. **Old types.** `src/api/schema.d.ts` is the 8 Oct one: no `viaProton`, `pendingActions`, `blocks`, `quickReplies`, `confirm`/`phrase`, the new command types, or nullable site money.
2. **Strong cards can't be confirmed.** The phone's `ActionCard` always sends `{ conversationId }`, so a `typed` card fails with `422 proton_phrase_mismatch`. It is dormant while the strong families stay off in production, but goes live the moment one is switched on. **This is the only correctness issue.**
3. **One card only.** The phone shows only the last card (`pendingAction`), so with several waiting the earlier ones are invisible.
4. **New commands are ignored.** `open_surface`, `fill_form`, `set_preference` and the employee pages fall back safely to "That couldn't be opened here". A `team` ref may misroute.
5. **The wait.** The phone waits up to 55 s on the JSON endpoint behind a static bubble.
6. **No saved chats.** The phone's chat lives only while its screen is open.
7. **Employees.** They now get the Proton screen automatically (the rule is `proton:use`), but it is buried under More.

## 3. Verdict per change

The phone-first question applies: is a phone a better tool for this goal?

| Change | Verdict | On the phone |
|---|---|---|
| Card confirms, several cards, restored status | **Bring** | Port the web's `ActionCard` rules. `two_step` arms Confirm after a review tap. `typed` opens a bottom sheet with the keyboard. Strong cards get the "Check carefully" pill, a red stripe, area, reach and "This can't be undone". Show every waiting card; a newer one for the same target replaces its own card. Restore statuses from `GET /proton/actions` when a chat reopens |
| Streaming and Stop | **Bring** | The biggest improvement on a mobile network. `expo/fetch` streams; port `parseSse`; a live status line ("Reading the project…"); Stop replaces Send while waiting. The JSON endpoint stays the fallback |
| Greeting, briefing, quick replies, suggestions | **Bring** | The web's greeting wording as-is. Briefing items as tappable rows. Quick replies and suggestions as a row of chips above the keyboard, sending `reply` or `suggestion`, never text |
| Opening pages and forms, filling forms, drafts | **Bring what the phone has** | Map commands to the phone's screens (table below). Log work and message drafts are filled, never submitted, with a "Filled by Proton, check it, then save" note. Every other form is web-only: say "That couldn't be opened here" |
| `viaProton` marker | **Bring** (tiny) | "with Proton ·" before the time in the bubble, plus an accessibility label (touch has no hover tooltip) |
| Saved chats | **Bring** | A chat list in the Proton screen (search, swipe to delete, long-press to rename); reopen a chat with its cards and blocks; locked read-only chats say why |
| Charts, tables, KPIs | **Light** | Drawn inline at phone width with react-native-svg on the existing chart core. Tables show 5 rows plus "Show all" (a sheet). A missing value is a dash, never 0. Port `protonFigures.ts` (the Zod schema and the value wording) verbatim. Every chart gets an accessibility label and summary |
| Memory | **Light** | "Remember this" by long-pressing your own message; a "What I remember" sheet with Forget |
| Employees have Proton | **Bring** | Starters and cards for their own work; decision 2 below on how visible it is |
| Movable talking blob | **Light** | A floating draggable blob fights the thumb, the tab bar and the keyboard. Instead, a small mood blob in the Proton screen header and on its tab or button, animating only while thinking, working or talking, and still under reduced motion. Port `blobShape.ts`, `protonMood.ts` and the tokens as pure code |
| Voice (GPT-Live) | **Bring later** | A phone is the natural place to talk, but it needs a new native module (`react-native-webrtc`), a new development build, a microphone permission and audio-session handling. Until then, keyboard dictation already works. Decision 3 |
| Design project page tabs | **Light** | One scroll, ordered by permission: Money first (`financial:view`), then Overview and progress, then "Who worked" (contributors, `work_entry:view_all`), Requirements, Meetings. Analytics charts and the calendar Timeline stay on the web. Proton's project `section` scrolls to the matching part |
| Site money null | **Bring** (types) | Regenerate the types; any site money renders a dash when null |
| Overdue invoices link | **Light** | The invoice list accepts a `filter=overdue` parameter, so links and pushes can open it there |
| Command palette, history person search, Proton budget audit table | **Web-only** | Desktop tools |

**Proton command → phone screen:**

| Command | Phone |
|---|---|
| Page `my_work` | `/work` |
| Page `my_pay` | `/pay` |
| Page `my_profile` | `/profile` |
| Page `messages` | `/messages` |
| Page `notifications` | `/alerts` |
| Page `settings` | `/settings` |
| Pages `help`, `launcher`, `schedules`, `salaries`, `project_pay`, `proton_budget`, `company_settings`, `company_profile` | Web-only |
| Surface `log_work` | `/log-work` (with fill) |
| Surface `new_meeting` | `/meetings/new` |
| Surfaces `message_person` / `message_team` | The chat (with a draft) |
| Surface `record_payment` | `/billing/payments/new` |
| Surface `settings_section` | `/settings` |
| Every other surface | Web-only |
| `set_preference` theme | Switches the app's theme |
| `set_preference` sounds | Ignored (the phone has no sound setting) |
| Ref type `team` | `/messages/team/[teamId]` |

The web's rules carry over: never trust an address from the API; check the domain against what the person may see; at most 3 commands in order; one result line per unique outcome. The page context the phone sends grows: its own page names (`dashboard`, `my_work`, `my_pay`, `messages`), an open chat as person or team, and the project section.

## 4. Implementation phases

Each phase is one Sonnet agent on its own branch (`MR-Mobile-Phase-6x`) from `main`, one at a time, following `CLAUDE.md` and the heavy-run rules, and reporting back. Nothing is merged without your approval. Problems found along the way are listed, not fixed.

| Phase | What | Size |
|---|---|---|
| **6A Correctness** | Regenerate `schema.d.ts` from the merged API. Card confirms (`standard` / `two_step` / `typed` sheet, strong styling, `pendingActions[]`, status restore). `viaProton` marker. Nullable site money. `team` refs. Words for the new Proton error codes (`proton_phrase_mismatch`, `proton_action_limit`, `proton_too_many_pending`, `proton_actions_off`, `proton_memory_refused`, …) | Small |
| **6B Conversation** | Streaming with Stop and a live status line (JSON fallback). Greeting, briefing, starters, quick replies, suggestions, `rolledOver`. The command and surface mapping above, the log-work fill and message drafts with the "Filled by Proton" note, `set_preference` theme, the richer page context | Medium |
| **6C Saved chats, figures, memory** | Chat list, reopen, rename, delete, locked chats; inline charts, tables and KPIs; "Remember this" and "What I remember" | Medium |
| **6D Project screen and links** | Project sections ordered by permission (money, overview, contributors), Proton sections scrolling to them, the overdue invoice filter parameter, accessibility labels on every phone chart | Small |
| **6E Proton presence** | The mood blob (header and entry point) from the web's pure blob and mood code, and how Proton shows for employees (decision 2) | Small |
| **6F Voice** (after decision 3) | `react-native-webrtc` in a new development build, the voice bar (status, live caption, mute, end), audio session and interruptions, voice turns through the stream endpoint; speech never confirms a card | Large |

Order: 6A → 6B → 6C → 6D → 6E, then 6F if approved. 6A comes first because it fixes the only correctness issue and gives every later phase the new types.

## 5. API and database

**No API or database changes are needed for 6A–6E.** Everything uses endpoints already on `master`.

**Before Proton is useful in production**, these are server settings, not phone work:
- `Proton__Enabled` (off by default).
- The 5 Proton migrations applied. The dev database was last migrated on 9 Oct, before all of them, so **it needs the 5 new ones** before Proton works locally (decision 4).
- Voice keys (`PROTON_VOICE_ENABLED`, `PROTON_VOICE_API_KEY`), only for 6F.

## 6. Risks

| Risk | Response |
|---|---|
| Streaming in React Native | `expo/fetch` supports streamed responses on SDK 57; checked on a device in 6B. The JSON endpoint stays as the fallback |
| Typed confirm on a small screen | A full bottom sheet with the phrase shown and the keyboard; Confirm stays disabled until the phrase matches exactly |
| Proton cost from employees | The server's monthly per-person allowance and the company budget already cap it |
| Voice native module | It means a new development build and testing on both phones; it is kept to its own phase |
| Ported web code drifting again | Add the new ported modules (`protonFigures`, greeting, `uiCommands` rules, blob and mood) to `docs/ported-from-web.md` |

## 7. Decisions needed

1. **Approve phases 6A–6E** as described, built one at a time on Sonnet?
2. **Proton for employees:** keep it in More (as now), or give everyone with `proton:use` a Proton tab (replacing nothing, since tabs max out at 5: it would replace Alerts in the tab bar and move Alerts to the header bell)? Recommended: a Proton button in the Today header for everyone, keeping the tabs as they are.
3. **Voice (6F):** build it now as part of Phase 6, or later once 6A–6E are on phones? Recommended: later. It needs a native module and a fresh development build, and voice is off on the server by default.
4. **Dev database:** may I apply the 5 new Proton migrations to your dev database, so Proton can be tested from the phone?

## 8. Problems found (not fixed)

- **Docs:** `docs/authorization.md`, `docs/status.md` and `docs/notifications.md` in the API don't mention that employees now hold `proton:use`, or the new `Sensitivity` tag.
- **Proton budget page:** the website's budget page now has a "Changes Proton proposed" table (`GET /proton/actions/all`); the phone keeps the budget on the web.
- **Expo rewrote `tsconfig.json`:** running `npx expo start` reformatted the phone's `tsconfig.json` and dropped `.expo/types/**/*.ts` and `expo-env.d.ts` from `include`. The change is uncommitted in `Desktop/ID-Indetails-mobile`.
- **The EAS branch:** `MR-Mobile-Eas` (Expo project link and `expo-dev-client`) isn't pushed or merged yet. Without it, `main` can't make a development build.
