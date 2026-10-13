# Ported from the web

The web client can't be changed, so there is no shared package: these modules were copied from it. When the web changes one of them, compare and copy the change here.

Web paths are in `Ident-Internal-Management-System-client`, as of its `MR-Proton-Navigation` branch (8 Oct 2026). The Proton card modules and the generated types are as of its `main` at `a6ab622` (13 Oct 2026).

| App module | Web source | How it differs |
|---|---|---|
| `src/api/schema.d.ts` | `src/api/schema.d.ts` | Unchanged (generated); copied from the web's `main` at `ac77f93` (13 Oct 2026). Regenerate with `npm run api:types` |
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
| `src/navigation/targets.ts` (`routeForProtonCommand`, `routeForProtonSurface`), `src/features/proton/runCommands.ts` | `src/domains/shared/proton/uiCommands.ts` (`stepOf`, `useRunProtonCommands`), `surfaces.ts` | Same rules (never an address, the domain and permissions checked, at most 3 commands in order, each different result line once), mapped onto the phone's screens: the person's own pages, settings, log work, new meeting, chats, record payment; reports, company expenses and every other form stay on the web. A theme switch changes the app theme; message sounds are ignored. What a screen needs on arrival (log-work values, a chat draft) is left before it opens |
| `src/features/proton/cards.ts` | `src/domains/shared/proton/ActionCard.tsx` (`ARM_MS`, `stateOf`, the phrase and Confirm rules), `ProtonThread.tsx` (`sameChange`, which card a newer one replaces) | The same rules as pure functions so they can be tested alone; the same words, "Medium risk" and "Low risk" included |
| `src/features/proton/components/ActionCard.tsx`, `screens/ProtonActionCard.tsx` | `src/domains/shared/proton/ActionCard.tsx` | Split into a dumb card and a smart container. The same Review step (Confirm waits 600 ms), "Check carefully" pill, area, reach and "This can't be undone." The red stripe is the left border in `--now`. A wrong phrase from the API keeps the card waiting and says so in the sheet; a `proton_action_not_pending` closes the card so it reads its status from `GET /api/proton/actions` |
| `src/features/proton/components/PhraseSheet.tsx` | `src/domains/shared/proton/ActionCard.tsx` (the phrase input) | A bottom sheet with the phrase shown above a keyboard field instead of an inline input; Confirm is in the sheet |
| `src/features/proton/chat.ts` | `src/domains/shared/proton/protonChat.ts` (`ActionState`, `ProtonTurn`) | Only the types the phone uses; the chat is not kept across restarts, and there are no blocks yet |
| `src/features/proton/api.ts` | `src/domains/shared/proton/protonApi.ts` (`useDecideAction`, `useMyProtonActions`, `useProtonBriefing`) | Same requests; the phone has the question (JSON fallback), briefing and card hooks only |
| `src/features/proton/sse.ts`, `stream.ts` | `src/domains/shared/proton/protonStream.ts` | `parseSse` verbatim; the stream reads through `expo/fetch` (the HTTP client can't read a body as it arrives), with the bearer from the token manager and one refresh on a 401 as `src/api/http.ts` does it. Failing before anything arrives falls back to the JSON endpoint |
| `src/features/proton/useProtonChat.ts`, `screens/ProtonScreen.tsx` | `useProtonConversation.ts`, `ProtonThread.tsx` | Stop replaces Send while an answer is written; the same Stopped, rolled-over and chat-ended wording; quick replies and suggestions are a chip row above the composer, sent as `reply` / `suggestion`, never as text |
| `src/features/proton/greeting.ts`, `briefing.ts`, `components/ProtonWelcome.tsx` | `greeting.ts`, `ProtonWelcome.tsx` | The greeting by the company's time of day; starters for the phone's pages; briefing items as tappable rows opening the project |
| `src/features/proton/pageContext.ts` | `useProtonPageContext.ts` | Proton is its own screen, so the opener passes the record, project section or phone page as route parameters; an open chat is a person or team record on `messages` |
| `src/features/proton/components/FilledNote.tsx`, `drafts.ts` | `FilledNote.tsx`, `formFill.ts` (`setDraft`) | The log-work form takes Proton's values through `requestLogWork`; a message draft waits per chat until the chat opens. Neither is ever saved or sent |
| `src/features/proton/errorWords.ts` | — (the web shows the API's message) | The phone words the new Proton codes itself, in the web's voice; other failures keep the API's message |
| `src/features/proton/refs.ts` | `src/domains/shared/proton/ProtonProvider.tsx` (`linkOf`) | A `team` ref opens that team's chat through the push target `conversation`; a project ref in a domain the person can't see has no link |
| `src/features/messages/components/MessageBubble.tsx` (`viaProton`) | `src/domains/shared/messages/Thread.tsx` | "with Proton ·" before the time, italic; the tooltip becomes the accessibility label, since touch has none |
| `src/features/proton/blob/blobShape.ts`, `protonMood.ts` | `src/domains/shared/proton/blob/blobShape.ts`, `protonMood.ts` | Logic verbatim (only the indentation differs); the blob's own size, wobble, springs and mood names are the web's |
| `src/features/proton/blob/ProtonBlob.tsx`, `blobMotion.ts`, `useBlobPath.ts` | `BlobFigure.tsx`, `useBlobMotion.ts` | Same figure and eyes in `react-native-svg`. The blurred glow (an SVG filter) is a radial gradient; the outline is redrawn about 30 times a second only while thinking, working or talking, never under reduced motion or in the background; while talking it breathes steadily instead of following the arriving words. There is no draggable floating blob: Proton opens from buttons and from its screen |
| `src/features/proton/blob/conversationMood.ts`, `useConversationMood.ts` | `ProtonHost.tsx`, `protonStore.ts` (`talkingUntil`, `errorUntil`, `happyUntil`) | The mood of the Proton screen's header from its own state: thinking, then working after 3 s, talking while text arrives, proposing while a card is open, error and happy for a few seconds after a failure or a confirmed change, asleep when Proton can't answer |
| `src/features/proton/components/AskProtonButton.tsx`, `slots/ProtonEntry.tsx` | `ProtonHost.tsx` (the blob button) | A small blob with "Ask Proton" in the Today headers, the blob alone on My work, My pay, Messages and Alerts; only for people with `proton:use`; it opens Proton with the page it was pressed on |
| `src/format/time.ts` | `src/shared/format/time.ts` | Unchanged |
| `src/format/money.ts` | `src/shared/format/money.ts` | Unchanged |
| `src/format/periods.ts` | `src/shared/format/periods.ts` | Unchanged |
| `src/format/phone.ts` | `src/shared/format/phone.ts` | Unchanged |
| `src/theme/tokens.ts` | `src/styles/hourline.css` (`:root` and the dark theme) | Every token, values verbatim, named in camelCase (`--surface-2` → `surface2`) | 
| `src/theme/tokens.ts` (`protonLight`, `protonDark`, `protonMoodColors`) | `src/styles/client.css` (`--proton-*`) | The blob's colours, values verbatim, kept apart from the theme's; the asleep, error and happy overrides |
| `src/ui/icons.ts` | `src/shared/icons/icons.ts` | Unchanged; `src/ui/Icon.tsx` turns `class="f"` into a fill for react-native-svg |
| `src/ui/avatars.ts` | `src/shared/components/Identity/avatars.ts` | Same seed, hash, tints and options on DiceBear 9; returns the SVG text instead of a data URI |
| `src/ui/toast.ts` | `src/shared/components/Feedback/toast.ts` | No hover or focus hold and no exit animation state |
| `src/ui/EmptyState.tsx` | `src/shared/components/Feedback/Empty.tsx` | The four illustrations, drawn with react-native-svg in the theme's colours |
| `src/ui/charts/core.ts` | `src/shared/components/Charts/core.ts` | The drawing helpers only (`barPath`, `niceMax`, `clamp`) |
| `src/ui/charts/DayRuler.tsx` | `src/shared/components/Charts/DayRuler.tsx` | No hover tooltip |
| `test/personas.ts` | `src/test/personas.ts` | Adds `customGrants`, a Design employee who also records materials |
| `src/features/notifications/words.ts` | `src/domains/shared/notifications/notificationWords.ts` | The web's words; each notification names its target instead of a web address, which the phone opens if the reader's permissions allow |
