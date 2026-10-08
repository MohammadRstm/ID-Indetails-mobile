# CLAUDE.md — Mobile App Development Rules

These rules apply to all work on the ID InDetails phone app. When a rule conflicts with speed or convenience, the rule wins.

The app is a new client of the existing ID InDetails API (`ID-Indetails`). What the system is, how it looks, how sign-in and permissions work, and what the app needs from the server are in [docs/investigation.md](docs/investigation.md).

## Contents

1. [Core principles](#1-core-principles)
2. [Code style: clean and readable](#2-code-style-clean-and-readable)
3. [Smart and dumb components](#3-smart-and-dumb-components)
4. [Git: branches and commits](#4-git-branches-and-commits)
5. [It looks like the web app](#5-it-looks-like-the-web-app)
6. [Server data](#6-server-data)
7. [Permissions](#7-permissions)
8. [Loading, errors and feedback](#8-loading-errors-and-feedback)
9. [Security](#9-security)
10. [The server and the website](#10-the-server-and-the-website)
11. [Testing](#11-testing)
12. [Documentation](#12-documentation)
13. [Change discipline](#13-change-discipline)
14. [Do not make assumptions](#14-do-not-make-assumptions)
15. [Definition of done](#15-definition-of-done)

---

## 1. Core principles

- Clear structure and separation of responsibilities.
- Consistent folder and file organisation.
- Secure by default.
- Readability and maintainability over cleverness.
- Small, focused changes.
- No unnecessary dependencies or upgrades.
- Existing behaviour is not changed casually.

When requirements, business rules or behaviour are unclear, **ASK BEFORE IMPLEMENTING**. Don't invent requirements or silently choose behaviour.

## 2. Code style: clean and readable

Code is written to be read and reviewed by a person.

- **Proportional design.** Build what the requirement needs, nothing more. No speculative features, generic frameworks or abstractions "for later". Plain code beats clever code.
- **Reuse before adding.** Extend existing components, hooks and patterns instead of creating parallel ones.
- **Small and focused.** A component, hook or function has one clear responsibility. Split it when it stops being easy to follow.
- **Strict typing.** TypeScript in strict mode. Use the API's generated types, unions and named types, never `any`, loose objects or magic strings. Fix warnings; don't suppress them.
- **Clear naming** over explanatory comments.
- **Concise comments.** No comments that restate the code. A short note only where a business rule, a security decision or a non-obvious constraint needs explaining.
- **No unrelated changes.** Don't refactor, reformat or rename outside the task's scope.
- **Lint and format** with the project's configured tools before committing.

## 3. Smart and dumb components

Every screen is split into **smart** (container) components and **dumb** (presentational) components.

### Smart components

- Fetch and change data through the area's hooks.
- Read permissions, the session and navigation.
- Hold screen state and decide what to show.
- Pass plain data and callbacks down.
- Contain little or no styling or layout of their own.

### Dumb components

- Receive everything through props and render it.
- Report actions through callback props (`onSave`, `onSelect`).
- Never fetch data, call the API, read the session or permissions, or navigate.
- May hold purely visual state (an open menu, a pressed state).
- Are reusable and testable on their own with plain props.

### Rules

- A dumb component never imports API hooks, the HTTP client, the session or the navigator.
- Permission checks happen in smart components, which pass booleans down (`canEdit`), never permission codes.
- Shared UI kit pieces (buttons, inputs, cards, badges, tables, charts, modals) are dumb.
- Name them so the split is visible, following the folder layout once it is set up (for example a `ProjectScreen` that renders a `ProjectView`).

## 4. Git: branches and commits

- **Never commit to `main`.** All work happens on a branch, merged through a pull request.
- **Commit regularly**, one logical step at a time. Don't let a day's work pile up in one commit.
- **Every file that is added, edited, deleted or moved is committed** as part of its change. Don't leave work uncommitted.
- **Every commit message says what changed and why**:

  ```text
  feat: add the notification list screen

  Shows the signed-in person's notifications, newest first, so they
  can read and open them from the phone.
  ```

  Avoid messages like `update`, `changes`, `fix`, `stuff`, `misc`.
- Keep commits logically scoped; don't mix unrelated changes.
- Never rewrite, squash or alter existing commits unless explicitly asked.
- **Don't push until asked.**

Before finishing a task, inspect:

```bash
git status
git diff
```

Then commit the intended changes and check `git status` again: nothing unintended should be left.

## 5. It looks like the web app

- **The web app's design is the design system.** Colours, type, radii, borders, motion and icons come from its tokens (`src/styles/hourline.css` in the web client), defined once in the app's theme and used by name. No hard-coded colours or sizes in components.
- Light and dark themes, both from the same tokens. Light is the default.
- **Fonts:** Archivo and Martian Mono, the variable versions with the width axis.
- **Icons:** the web's own 24×24 stroke icons, ported as-is.
- **Avatars:** DiceBear "notionists", generated from the person's name exactly as on the web, so the same person has the same face. An uploaded photo wins.
- **Reusable components.** Every pattern the web repeats (tables, filter bars, KPI strips, pills, pickers, pagers, person chips, sheets, charts) is one shared component. Screens compose them.
- Keep the web's proportions, but give touch targets at least 44pt and follow platform conventions for navigation, sheets and gestures.
- **Formatting** follows the web: dates and times in the **company's** time zone (from `GET /api/company/settings`), never the device's; the same duration and money formats.

## 6. Server data

- **One hook per endpoint**, grouped by area, with one query-key scheme per area (React Query or the chosen equivalent).
- Mutations invalidate a fixed, known list of queries.
- **The app never calculates money, overtime, pay or access.** Every figure and every rule comes from the API. If the app needs a number the API doesn't give, ask for an endpoint instead of working it out.
- API types are generated from the API's OpenAPI document, not written by hand.
- Errors are the API's uniform error body (`{type, code, message, errors, traceId}`); branch on `code`, never on message text.
- Live updates come from `/hubs/live` and only say what to reload.

## 7. Permissions

- Every screen, tab, action and money figure is gated by the permission codes from `GET /api/auth/me`. Take role, domain and permissions from there, not from the token's claims.
- Screens declare what they need in one table, read by both navigation and the screen guard.
- Hiding something is a convenience, not security: the API enforces every rule. Never rely on the app to protect data.
- Handle `403` and `404` from the API gracefully: a record in a domain the person can't see reads as `404`.

## 8. Loading, errors and feedback

- Skeletons where content is on its way, shaped like the content.
- Small inline error texts next to what failed, with a retry where it helps.
- Toasts only for the outcome of an action the person just took.
- Empty states say what is missing and, where possible, what to do.

## 9. Security

- **Tokens:** the access token is kept in memory only. Any long-lived token is kept only in the platform's secure storage (Keychain / Keystore), never in plain storage or logs.
- **One refresh at a time, app-wide.** Re-using a replaced refresh token can sign the person out on every device, so refreshes never overlap, and the new token is stored before it is used.
- Never log tokens, passwords, personal data or money figures.
- Never commit secrets: API keys, signing keys, push credentials, store credentials. Use the project's configuration and secret management.
- Never put tokens or personal data in URLs, deep links or analytics.
- Validate deep links and notification payloads before acting on them; they open screens, never perform actions.
- Clear all cached data, files and push registration on sign-out.
- Photos are shrunk and stripped of location data before upload.

## 10. The server and the website

- **The server stays the same.** New endpoints may be added to the API when the app needs them, following the API's own `CLAUDE.md` (its architecture, tests, docs and commit rules).
- **Any database change in the API needs explicit approval first**: what changes, why, the tables affected, the migration impact and the risks. Never create or apply a migration without approval.
- **The website is not changed.** Read it to copy its look and behaviour; don't edit it.

## 11. Testing

- Every feature gets appropriate tests:
  - dumb components with plain props;
  - smart components and hooks against a mocked API;
  - permission behaviour as each kind of person (super admin, Design and Execution admins and employees): what they can and can't see or do.
- Bug fixes get a regression test where practical.
- Run the build, type check, linter and tests before calling a feature done. Don't claim tests passed unless they ran.
- Keep test runs light on the development laptop (limited workers, CPU and memory caps on any local containers).

## 12. Documentation

- Update `docs/` when a feature changes behaviour future developers need to understand: screens and their permissions, auth and session handling, notifications, configuration, build and release.
- Use an existing doc before creating a new one. No docs for trivial internal changes.

## 13. Change discipline

1. **Inspect** the existing code, conventions and docs before changing anything.
2. **Scope** the files to change, new files, affected behaviour, tests, docs, and whether the API or its database is involved.
3. **Database check.** If an API database change is needed: **stop** and ask for approval (section 10).
4. **Implement** the smallest appropriate change, on a branch.
5. **Test.**
6. **Document.**
7. **Verify:** build, type check, lint, tests.
8. **Review** `git diff` and `git status` for accidental changes, debug code, security issues and missing tests or docs.
9. **Commit** with a message that says what and why.
10. **Final check:** `git status` is clean.

## 14. Do not make assumptions

Ask before proceeding when:

- a business rule or the API contract is unclear;
- several implementations would behave differently;
- an API or database change is needed;
- authorization or security implications are unclear;
- requested behaviour conflicts with the web app's or the API's;
- a major structural decision is needed.

A clarification question is better than implementing the wrong behaviour.

## 15. Definition of done

- [ ] Smart and dumb components are separated (section 3).
- [ ] The code is proportional, typed and readable; no comment clutter.
- [ ] The look comes from the shared tokens and components.
- [ ] Server data goes through hooks; the app calculates no money or access.
- [ ] Permissions gate every screen and action; the API remains the authority.
- [ ] Loading, error and empty states are handled.
- [ ] No tokens or secrets are stored insecurely, logged or committed.
- [ ] API database changes, if any, were approved.
- [ ] Tests are added or updated and were run.
- [ ] Docs are updated.
- [ ] Work is on a branch, never `main`, committed in regular steps with clear messages.
- [ ] `git status` is clean.

When in doubt: **do not guess.** The priority is:

```text
Security
    ↓
Correctness
    ↓
Clear structure
    ↓
Testability
    ↓
Maintainability
    ↓
Implementation speed
```
