# ID-Indetails-mobile

The phone app for ID InDetails, the company's internal project, time and money platform. It is a new client of the existing ID InDetails API; the server and the website stay as they are.

React Native with Expo SDK 57, TypeScript (strict) and Expo Router.

## Install and run

You need Node 24 (`.nvmrc`) and, to run the app, an Android emulator or phone with a development build (phase-0-plan.md sections 20–22).

```bash
npm ci                      # install exactly what package-lock.json lists
cp .env.example .env        # then set EXPO_PUBLIC_API_URL to where the API runs
npm run android             # build and install the development build on the emulator or phone
npm start                   # afterwards: start Metro; the development build reloads on save
```

The API runs on the laptop (`dotnet run --launch-profile http --urls http://0.0.0.0:5164` in the API repo). From the Android emulator it is `http://10.0.2.2:5164`; from a phone on the same Wi-Fi, the PC's LAN address.

Builds for other people go through EAS (`eas.json`: `development`, `preview`, `production`). Preview and production builds need an `https://` API address, set as an EAS environment variable.

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Starts Metro for a development build |
| `npm run android` / `npm run ios` | Builds and installs the development build locally (iOS needs a Mac; use EAS instead) |
| `npm run lint` | ESLint with Prettier (`expo lint`) |
| `npm run typecheck` | TypeScript, no output |
| `npm test` | Jest (`jest-expo`), two workers |
| `npm run format` / `npm run format:check` | Prettier, writing or checking |
| `npm run api:types` | Regenerates `src/api/schema.d.ts` from the API's OpenAPI document (the API in Development) |

## Docs

| Topic | Doc |
|---|---|
| What the system is, how it looks, sign-in, permissions, and what the phone app adds | [docs/investigation.md](docs/investigation.md) |
| Phase 0: architecture and implementation plan | [docs/phase-0-plan.md](docs/phase-0-plan.md) |
| The answers to the plan's open questions | [docs/decisions.md](docs/decisions.md) |
| The contracts the phases build against | [docs/contracts.md](docs/contracts.md) |
| Modules copied from the web client, and their sources | [docs/ported-from-web.md](docs/ported-from-web.md) |
| Rules for working on this code | [CLAUDE.md](CLAUDE.md) |
