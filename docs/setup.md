# Setting up and running the app

How to run the phone app on this Windows PC: on the Android emulator, on the Samsung phone, and on an iPhone. It is written for someone new to mobile development, one step at a time. Most of it is done once.

The background (why development builds, why no Mac) is in [phase-0-plan.md](phase-0-plan.md) sections 20–22. How the app is built inside is in [architecture.md](architecture.md).

## Contents

1. [How the pieces fit](#1-how-the-pieces-fit)
2. [Install the tools (once)](#2-install-the-tools-once)
3. [Get the app's code](#3-get-the-apps-code)
4. [Run the API for the phone](#4-run-the-api-for-the-phone)
5. [Development builds, not Expo Go](#5-development-builds-not-expo-go)
6. [The Android emulator](#6-the-android-emulator)
7. [The Samsung phone](#7-the-samsung-phone)
8. [An iPhone](#8-an-iphone)
9. [Everyday work](#9-everyday-work)
10. [Fonts](#10-fonts)
11. [When something doesn't work](#11-when-something-doesnt-work)

---

## 1. How the pieces fit

```text
 Windows PC                                     Phone or emulator
 ┌──────────────────────────────┐               ┌──────────────────────────┐
 │ API (dotnet, port 5164) ◄────┼── requests ───┤ ID InDetails (Dev)       │
 │ MySQL + Mailpit (Docker)     │               │ a development build:     │
 │ Metro (npx expo start, 8081) ┼── app code ──►│ our app + Expo's tools   │
 └──────────────────────────────┘               └──────────────────────────┘
```

- **The API** is the same server the website uses, run from the `MR-Mobile-Api` branch, which has the phone's endpoints.
- **Metro** is the JavaScript bundler. It sends the app's code to the phone and reloads it on every save.
- **The development build** is our own app with Expo's developer tools inside. It is installed once, and again only when native settings change (section 5).
- **`EXPO_PUBLIC_API_URL`** tells the app where the API is. The address differs per device (sections 6–8).

## 2. Install the tools (once)

| Tool | Why | How |
|---|---|---|
| **Node.js 24** (with npm) | Runs Expo and the tooling | nodejs.org, the LTS installer. The repo pins it in `.nvmrc`. Check with `node -v` |
| **Git** | The code | Already installed |
| **VS Code** with the *Expo Tools* and *ESLint* extensions | Editing | Extensions panel |
| **Android Studio** | The Android SDK, `adb`, the emulator and Java 17 | developer.android.com/studio |
| **An Expo account** (free) | Cloud builds, push credentials | expo.dev → Sign up |
| **EAS CLI** | Cloud builds and store uploads | `npm install -g eas-cli`, then `eas login` |
| **Samsung USB driver** | Only if `adb devices` doesn't list the phone | samsung.com → Android USB Driver for Windows |
| **cloudflared** | An HTTPS tunnel to the PC's API, for the iPhone | Only when testing on an iPhone (section 8) |

### Android Studio, step by step

1. Install it with the default options and open it once. The setup wizard downloads the SDK.
2. **More Actions → SDK Manager**:
   - **SDK Platforms:** tick the newest Android version (the one Expo SDK 57 targets).
   - **SDK Tools:** tick *Android SDK Build-Tools*, *Android SDK Platform-Tools*, *Android Emulator* and *Android SDK Command-line Tools*.
   - Apply.
3. Tell Windows where the SDK and Java are. In **PowerShell** (one time; then open a new terminal):

   ```powershell
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   [Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
   $path = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$path;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\emulator", "User")
   ```

4. In a **new** terminal, check: `adb version` and `java -version` both answer.

## 3. Get the app's code

```bash
git clone <the mobile repo>   # once
cd ID-Indetails-mobile
npm ci                        # installs exactly what package-lock.json lists
copy .env.example .env        # PowerShell: Copy-Item .env.example .env
```

`.env` is yours and is never committed. It holds:

| Variable | What | Example |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | The API, without `/api` | `http://10.0.2.2:5164` (emulator) |
| `EXPO_PUBLIC_WEB_URL` | The website, opened from the sign-in screen for invitation and reset links. Optional: without it, the API's address is used (in production both are one site) | `http://10.0.2.2:5173` |

Everything in `EXPO_PUBLIC_*` ends up inside the app, so never put a secret there.

## 4. Run the API for the phone

The API is the `ID-Indetails` repo. The phone needs its `MR-Mobile-Api` branch, which adds the mobile sign-in, push devices, notification settings and the duplicate-safe materials. Its own `docs/local-development.md` explains MySQL, Mailpit and the user secrets; this section only adds what the phone needs.

1. **Check out the branch** in the API repo: `git checkout MR-Mobile-Api`.
2. **Start MySQL and Mailpit** as usual: `docker compose up -d`.
3. **Apply the branch's database migrations. This is your action, not the app's.**

   The branch adds four migrations (`MobileSessions`, `UserDevices`, `NotificationSettings`, `MaterialClientRef`). They were approved with the plan (decisions.md, decision 2), but they change your development database, so apply them yourself when you are ready. Review the SQL first, then apply, in **cmd** from the API repo:

   ```bat
   set ASPNETCORE_ENVIRONMENT=Development
   dotnet ef migrations script --project ID-Indetails.api
   dotnet ef database update --project ID-Indetails.api
   ```

   Without them the phone's sign-in answers a server error. They never need to be applied to anyone else's database from here.

4. **Start the API listening on the network**, not only on the PC itself:

   ```bat
   dotnet run --project ID-Indetails.api --launch-profile http --urls http://0.0.0.0:5164
   ```

   `0.0.0.0` means "every network card", so the emulator and the phone can reach it. Plain `http` is fine in development: the phone's sign-in carries no cookie.

5. **Let it through Windows Firewall** (once). In **PowerShell as administrator**:

   ```powershell
   New-NetFirewallRule -DisplayName "ID InDetails API (dev)" -Direction Inbound -Protocol TCP -LocalPort 5164 -Action Allow -Profile Private
   New-NetFirewallRule -DisplayName "Expo Metro (dev)" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
   ```

   The rules only apply on networks Windows calls **Private**. Check yours: Settings → Network & internet → Wi-Fi → your network → *Private network*.

6. **Find the PC's address on the Wi-Fi** (for a real phone): `ipconfig`, the *IPv4 Address* of the Wi-Fi adapter, such as `192.168.1.23`.
7. **Check from the phone:** open `http://192.168.1.23:5164/health` in the phone's browser. It should answer `Healthy`.

**Accounts to sign in with.** The web client's `scripts/seed-dev.mjs` fills the development database with a sample company, and writes its accounts to `dev-accounts.local` in the web client's folder. They work in the app too.

## 5. Development builds, not Expo Go

| | Expo Go | A development build (what we use) |
|---|---|---|
| What it is | A ready-made app from the store that runs any Expo project's JavaScript | Our own app, with Expo's developer tools inside |
| Push notifications | No (not on Android) | Yes |
| Our native settings (Face ID text, secure store backups, notification channels, fonts) | No | Yes |
| When it is installed again | Never | Only when native settings or packages change |

So: build and install the development build once per device; after that, `npx expo start` and every save reloads the app on the device.

The development build is called **ID InDetails (Dev)** and installs next to the preview and production apps without replacing them.

## 6. The Android emulator

1. **Create an emulator** (once): Android Studio → **More Actions → Virtual Device Manager → Create device** → a Pixel phone → the newest system image (*Google Play* or *Google APIs*) → Finish. Start it with ▶.
2. **Point the app at the PC.** The emulator reaches the PC as `10.0.2.2`. In `.env`:

   ```env
   EXPO_PUBLIC_API_URL=http://10.0.2.2:5164
   ```

3. **Build and install the development build** (the first time takes several minutes):

   ```bash
   npx expo run:android
   ```

   It builds the Android app on the PC (no cloud build needed), installs it on the running emulator, starts Metro and opens the app.
4. **Afterwards**, day to day: start the emulator, then `npx expo start` and press `a`.

**Trying the fingerprint lock on the emulator:**

1. In the emulator's Android *Settings → Security*, set a PIN, then add a fingerprint. When it asks you to touch the sensor, open the emulator's **⋯ (Extended controls) → Fingerprint** and press **Touch the sensor**.
2. Sign in to the app and accept "Unlock with fingerprint?".
3. Close the app fully and open it again: it asks for the fingerprint. Use **Touch the sensor** again to unlock.

## 7. The Samsung phone

1. **Developer options** (once): Settings → About phone → Software information → tap **Build number** 7 times, and enter the phone's PIN.
2. **USB debugging:** Settings → Developer options → **USB debugging** on.
3. **Connect the cable**, and on the phone accept *Allow USB debugging?* (tick *Always allow from this computer*).
4. **Check** that the PC sees it: `adb devices` lists one device as `device`. If it says `unauthorized`, accept the prompt on the phone; if nothing is listed, install the Samsung USB driver and try another cable.
5. **Same Wi-Fi:** the phone and the PC must be on the same network, and it must be a *Private* network on the PC (section 4, step 5).
6. **Point the app at the PC** with its Wi-Fi address from `ipconfig`. In `.env`:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.23:5164
   ```

7. **Build and install:**

   ```bash
   npx expo run:android --device
   ```

   Pick the Samsung from the list. Afterwards the cable is no longer needed: `npx expo start`, and the app on the phone connects to Metro over the Wi-Fi.

**Without a cable**, an EAS development build can be installed from a link instead: `eas build --profile development --platform android`, then open the link it prints on the phone. It uses Expo's cloud build minutes.

**The emulator and the phone use different addresses.** Change `EXPO_PUBLIC_API_URL` when switching, then restart Metro with `npx expo start --clear` (the address is built into the code Metro sends).

## 8. An iPhone

iPhone apps can only be built on a Mac, so Expo builds them in its cloud. Two stages:

### Before the Apple Developer membership

**Expo Go** from the App Store can show the JavaScript parts: screens, navigation and the API. Not push notifications, the Face ID text, or anything needing our native settings. Start Metro with `npx expo start --go --tunnel`, and scan the QR code with the iPhone's camera.

### With the membership ($99 a year)

1. **Register the iPhone** (once): `eas device:create`, then open the link on the iPhone and install the profile it offers.
2. **Build:** `eas build --profile development --platform ios`. When it finishes, open its link on the iPhone and install.
3. **Give the iPhone an HTTPS way to the PC's API.** iPhones refuse plain `http` to a LAN address by default, so use a tunnel:

   ```bash
   cloudflared tunnel --url http://localhost:5164
   ```

   It prints an address such as `https://random-words.trycloudflare.com`. Put it in `.env` as `EXPO_PUBLIC_API_URL` while testing on the iPhone.
4. **Start Metro through a tunnel** too, so the iPhone reaches it from anywhere: `npx expo start --tunnel --clear`.

TestFlight, App Store and Google Play releases are in phase-0-plan.md section 23.

## 9. Everyday work

```bash
npx expo start          # Metro for the development build; a = Android, r = reload, j = debugger
npm run lint            # ESLint with Prettier, no warnings allowed
npm run typecheck       # TypeScript
npm test                # Jest, two workers
```

- A **JavaScript or TypeScript change** reloads by itself.
- A **change to `.env`**: restart Metro with `npx expo start --clear`.
- A **new native package or a change to `app.config.ts`** (plugins, permissions, icons): build and install again (`npx expo run:android`). Packages are only added through the orchestrator (contracts.md section 7).
- **The API's types changed:** `npm run api:types` while the API runs in Development, then commit `src/api/schema.d.ts`.

## 10. Fonts

The web uses Archivo and Martian Mono as variable fonts and sets their **width** (`font-stretch`). React Native can't set a font's width, so `assets/fonts/` holds static copies at exactly the widths and weights the app uses, made from the web's own font files:

| File | Width | Weight | Used for |
|---|---|---|---|
| `Archivo-400`, `-500`, `-600`, `-650` | 100% | 400–650 | Text, labels, buttons, card titles |
| `ArchivoWide-650` | 106% | 650 | Page titles and big figures |
| `MartianMono-400`, `-600` | 78% | 400, 600 | Numbers |

Both fonts are under the SIL Open Font License (`assets/fonts/*-OFL.txt`), which allows this. To make them again (for example after the web updates its fonts), with Python 3:

```bash
python -m venv .venv-fonts
.venv-fonts\Scripts\pip install fonttools brotli
.venv-fonts\Scripts\python scripts/fonts.py ..\Ident-Internal-Management-System-client
```

The last argument is the web client's folder (its `node_modules` must be installed). The script lists which widths and weights it makes; `src/theme/fonts.ts` loads the same files.

## 11. When something doesn't work

| What you see | Try |
|---|---|
| The app says the server can't be reached | Open `<EXPO_PUBLIC_API_URL>/health` in the device's browser. If that fails: is the API running with `--urls http://0.0.0.0:5164`? Is the firewall rule there, and the network *Private*? Is the phone on the same Wi-Fi? |
| Sign-in answers "Something went wrong" | The API's database probably lacks the branch's migrations (section 4, step 3). The API's console shows the error |
| The app still uses the old API address | Restart Metro with `npx expo start --clear` |
| `adb devices` lists nothing | Another cable or USB port; the Samsung USB driver; USB debugging on |
| `npx expo run:android` can't find the SDK or Java | `ANDROID_HOME` and `JAVA_HOME` (section 2), in a new terminal |
| The development build can't find Metro | The PC and phone on the same Wi-Fi, port 8081 allowed through the firewall; or `npx expo start --tunnel` |
| Fingerprint unlock isn't offered | The phone needs a screen lock and at least one fingerprint or face set up; then turn it on in More → Settings |
