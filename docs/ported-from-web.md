# Ported from the web

The web client can't be changed, so there is no shared package: these modules were copied from it. When the web changes one of them, compare and copy the change here.

Web paths are in `Ident-Internal-Management-System-client`, as of its `MR-Proton-Navigation` branch (8 Oct 2026).

| App module | Web source | How it differs |
|---|---|---|
| `src/api/schema.d.ts` | `src/api/schema.d.ts` | Unchanged (generated). Regenerate with `npm run api:types` |
| `scripts/api-types.mjs` | `scripts/api-types.mjs` | Unchanged |
| `src/api/errors.ts` | `src/api/errors.ts` | Keeps every message per field (`fieldErrors: Record<string, string[]>`), the `traceId`, and `isApiError`; `errorMessage` and `isStatus` aren't ported |
| `src/api/http.ts` | `src/api/http.ts` | Same interceptors and array format. The refresh goes through `src/auth/tokenManager.ts` and the mobile endpoints instead of the refresh cookie and a Web Lock; a request refused just after another refresh finished is repeated with the new token |
| `src/api/queryClient.ts` | `src/api/queryClient.ts` | Same retry rules; focus from `AppState` (after refreshing an access token about to run out), online state from NetInfo |
| `src/auth/session.tsx` | `src/app/session/SessionProvider.tsx` | Same `/auth/me` re-read every 5 minutes and on focus, and the same "Your session ended" notice. Restores from the secure store instead of the cookie (and opens offline with the person known from last time); signing out happens locally even when the API can't be reached; the web's `onSessionReset` is `onSignOut` (`src/auth/signOutCleanup.ts`) |
| `src/auth/passwordRules.ts` | `src/auth/passwordRules.ts` | Unchanged rules and words; adds `fieldErrorsOf` for the phone's forms |
| `src/auth/screens/SignInScreen.tsx` | `src/auth/SignInPage.tsx` | Same checks, words and error handling; adds a way to the website for invitation and reset links |
| `src/auth/screens/ForgotPasswordScreen.tsx` | `src/auth/ForgotPasswordPage.tsx` | Same neutral answer; the link opens the website |
| `src/auth/screens/ChangePasswordScreen.tsx` | `src/auth/ChangePasswordPage.tsx` | Same rules and words; uses the mobile endpoint, which keeps the phone's session |
| `src/auth/components/AuthLayout.tsx` | `src/auth/AuthLayout.tsx` | The same card: mark, product name, company name, heading |
| `src/auth/components/BrandMark.tsx` | `src/shared/components/Identity/Logo.tsx` | Same mark and logo URL, drawn with react-native-svg and expo-image |
| `src/auth/brandingApi.ts` | `src/shared/components/Identity/useBranding.ts` | Same query and key |
| `assets/fonts/*.ttf` | `@fontsource-variable/archivo`, `@fontsource-variable/martian-mono` (the web's `src/styles/fonts.css`) | Static instances at the widths the web sets with `font-stretch`, made by `scripts/fonts.py` (Latin and Latin Extended) |
| `src/api/types.ts` | `src/api/types.ts` | More named aliases |
| `src/permissions/codes.ts` | `src/app/permissions/codes.ts` | Unchanged |
| `src/permissions/permissions.ts` | `src/app/permissions/permissions.ts` | `accessLabel` isn't ported |
| `src/permissions/screens.ts` | `src/app/routing/routeTable.tsx` | The idea and the rules, rewritten for the phone's routes (one table, no domain in the path) |
| `src/navigation/targets.ts` (`routeForProtonCommand`) | `src/domains/shared/proton/uiCommands.ts` (`stepOf`) | Same checks, mapped onto the phone's screens; reports and company expenses stay on the web |
| `src/format/time.ts` | `src/shared/format/time.ts` | Unchanged |
| `src/format/money.ts` | `src/shared/format/money.ts` | Unchanged |
| `src/format/periods.ts` | `src/shared/format/periods.ts` | Unchanged |
| `src/format/phone.ts` | `src/shared/format/phone.ts` | Unchanged |
| `src/theme/tokens.ts` | `src/styles/hourline.css` (`:root` and the dark theme) | Every token, values verbatim, named in camelCase (`--surface-2` → `surface2`) |
| `src/ui/icons.ts` | `src/shared/icons/icons.ts` | Unchanged; `src/ui/Icon.tsx` turns `class="f"` into a fill for react-native-svg |
| `src/ui/avatars.ts` | `src/shared/components/Identity/avatars.ts` | Same seed, hash, tints and options on DiceBear 9; returns the SVG text instead of a data URI |
| `src/ui/toast.ts` | `src/shared/components/Feedback/toast.ts` | No hover or focus hold and no exit animation state |
| `src/ui/EmptyState.tsx` | `src/shared/components/Feedback/Empty.tsx` | The four illustrations, drawn with react-native-svg in the theme's colours |
| `src/ui/charts/core.ts` | `src/shared/components/Charts/core.ts` | The drawing helpers only (`barPath`, `niceMax`, `clamp`) |
| `src/ui/charts/DayRuler.tsx` | `src/shared/components/Charts/DayRuler.tsx` | No hover tooltip |
| `test/personas.ts` | `src/test/personas.ts` | Adds `customGrants`, a Design employee who also records materials |
