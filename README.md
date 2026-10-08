# ID-Indetails-mobile

The phone app for ID InDetails, the company's internal project, time and money platform. It is a new client of the existing ID InDetails API; the server and the website stay as they are.

React Native with Expo SDK 57, TypeScript (strict) and Expo Router.

## Install and run

You need Node 24 (`.nvmrc`) and, to run the app, an Android emulator or phone with a development build. [docs/setup.md](docs/setup.md) walks through all of it: the tools, the API, the emulator, the Samsung phone and an iPhone.

```bash
npm ci                      # install exactly what package-lock.json lists
cp .env.example .env        # then set EXPO_PUBLIC_API_URL to where the API runs (setup.md section 3)
npm run android             # build and install the development build on the emulator or phone
npm start                   # afterwards: start Metro; the development build reloads on save
```

The API runs on the laptop from its `MR-Mobile-Api` branch, with that branch's migrations applied to your development database (`dotnet run --project ID-Indetails.api --launch-profile http --urls http://0.0.0.0:5164` in the API repo). From the Android emulator it is `http://10.0.2.2:5164`; from a phone on the same Wi-Fi, the PC's LAN address.

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
| `python scripts/fonts.py <web client>` | Makes the static font files from the web's variable fonts (setup.md section 10) |

## Docs

| Topic | Doc |
|---|---|
| Setting up the PC and the devices, and running the app | [docs/setup.md](docs/setup.md) |
| How the app is built: folders, data, sign-in, the lock, permissions, navigation, theme | [docs/architecture.md](docs/architecture.md) |
| What the system is, how it looks, sign-in, permissions, and what the phone app adds | [docs/investigation.md](docs/investigation.md) |
| Phase 0: architecture and implementation plan | [docs/phase-0-plan.md](docs/phase-0-plan.md) |
| The answers to the plan's open questions | [docs/decisions.md](docs/decisions.md) |
| The contracts the phases build against | [docs/contracts.md](docs/contracts.md) |
| Modules copied from the web client, and their sources | [docs/ported-from-web.md](docs/ported-from-web.md) |
| Rules for working on this code | [CLAUDE.md](CLAUDE.md) |
