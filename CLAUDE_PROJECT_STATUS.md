# TassuVahti — Redesign handover

_Last updated: 2026-10-18 · Hackathon deadline: 2026-10-18 07:00_

TassuVahti is a pet health and pet insurance companion app (JunctionX Turku 2026). This document covers the **frontend redesign of `client/`**. Only the frontend is in scope; all data is mock.

## ⚠️ Current state: dev is broken until the last changes are committed

PR #38 (`feature/redesign-polish`) only contained the **staged** files: the tab folder renames and the deleted files. The edits that go with them are **still uncommitted in the working tree on `dev`**: 22 modified files plus 2 new files.

Because of that, `dev` on GitHub does not run. `src/app/(tabs)/_layout.tsx` still points at `(explore)`, `(pets)` and `(profile)`, but those folders are now named `explore`, `pets` and `profile`.

Fix it first:

```
git checkout -b feature/redesign-polish-2
git add -A client
git commit -m "Step 6: pet records & digital passport, recovery page, back buttons, tab fixes, cleanup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feature/redesign-polish-2
```

Then open a PR into `dev` and merge it.

## Working rules

- **Git:** the user handles all git work. Each step goes on its own branch cut from `dev`, named `feature/redesign-<name>`. The assistant writes code but never runs `git add` or `git commit`. It hands over a ready-to-paste commit message and push command. Use `git add -A client` so modified files are included, not only staged ones.
- **Commit trailer:** `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **Verify:** in `client/`, run `npx tsc --noEmit` and `npx expo lint`.
  - Lint errors that existed before the redesign: tab icon display-name, `use-async` set-state-in-effect, a stale "merge conflict marker" in `icon.tsx`, and i18n named-export warnings.
- **Typed routes:** after adding or renaming a route, run `npx expo start` briefly so `.expo/types` updates, then run `tsc`.
- **Checking on the simulator:** the user's Metro runs on port 8081 with Expo Go.
  - Open a screen: `xcrun simctl openurl booted "exp://127.0.0.1:8081/--/<path>"`
  - Take a screenshot: `xcrun simctl io booted screenshot <file>.png`
- **Code style:**
  - Keep the colors in `src/theme/colors.ts`.
  - Single quotes. Functional components with `StyleSheet`.
  - **Don't run prettier**: it switches the code to double quotes.
  - The user prefers simple, uncluttered screens. Visual references: Lassie, Agria, If, ManyPets.
- **i18n:** i18next with `en` / `fi` / `sv` in `src/i18n/locales/*.json`.
  - Every key must exist in all 3 files.
  - Mock content uses `Localized` (`{ en, fi, sv }`) with `localize()`.
- **Gotchas:**
  - **React Compiler is off** (`app.json` → `experiments.reactCompiler: false`). It cached `currentLanguage()` and `router.canGoBack()`, so screens showed stale values.
  - Don't use `<Link asChild>` when the child gets an array style: expo-router crashes ("passing an array of styles to a child of <Slot>"). Use `Pressable` with `router.push` instead.
  - Tab folders are plain `explore/`, `pets/` and `profile/`, so their URLs are `/explore`, `/pets` and `/profile`. Only `(home)` is a group, so `/` always opens Home. Don't turn the others back into `(groups)`.
- **Removed on purpose, don't re-add:** emergency mode, PIN / Face ID, seasonal tips, quick actions on Home, "Log today" on Home.

## 1. Done

| Step | Status | What |
|---|---|---|
| 0 Cleanup | ✅ merged | Removed PIN / Face ID and emergency mode. 4 tabs: Home · Pets · Explore · Profile. |
| 1 Auth | ✅ merged | Video landing page with a language switcher, BankID mock, email sign-in and sign-up mock (`demo@tassuvahti.fi` / `demo1234`). |
| 2 Home | ✅ merged | Details below. |
| 3 Pets | ✅ merged | Details below. |
| 4 Explore | ✅ merged | Details below. |
| 5 Profile | ✅ merged | Details below. |
| 6 Polish | 🟡 partly merged (#38), rest uncommitted (see above) | Details below. |

### Step 2: Home (`src/screens/home/home-screen.tsx`)

- **Header:** pet switcher and a settings button that opens Profile.
- **Pet card:**
  - Policy section: plan name, "Active", cover left this year with a bar, and a **Submit a claim** button that opens `/add-visit`.
  - Health status section: traffic-light badge and "Recovering from … Day x of y". Tapping it opens **`/pet/[id]/watch-list`**.
- **Today's reminders:** only shown when something is due.
- **"Talk to a vet" cards:** price, waiting time or next slot, and a mock Book button. Data is in `services/vet-services.ts` and `services/mock/vet-services.ts`.

### Step 3 + 6: Pets

- **Pets list:** `src/screens/pets/pets-screen.tsx`.
- **Pet page:** `src/screens/pet/pet-screen.tsx`, with 3 tabs:
  - **Overview:** status card (opens the watch list), "Log today", then care plan, medication, diet and trends.
  - **Records:** a structured medical timeline, newest first, with filter chips: allergies, conditions, surgeries, long-term medication, lab reports (blood, urine, ultrasound, X-ray) and visits.
  - **Passport:**
    - Facts: 15-digit ISO microchip, markings, pedigree registration, sex, birth date and owner.
    - Vaccinations with valid / due soon / expired status.
    - "Share with a vet · QR code", which opens the existing `share-passport` screen with an expiry such as 24 h.
    - "Export travel summary", which sends the summary through the share sheet.
    - A link to the full passport screen.
- **Watch list:** `src/screens/pet/watch-list-screen.tsx` shows the recovery progress, the latest log answers, what to do now and when to call a vet.
- **Data:** `Passport` now also has `markings`, `registration`, `conditions[]` and `labReports[]` (`src/types/passport.ts`, `services/mock/passport.ts`).

### Step 4: Explore (`src/screens/explore/`)

- A `SegmentedControl` switches between Vets (clinic map), "Is it safe?" (knowledge base and "My pet ate this"), and Quizzes.
- **Quiz page:** `/quiz/[id]`. A short lesson, then scenario questions with instant feedback and an explanation, then the score.
  - 3 quizzes, 10 questions, in en/fi/sv.
  - Best scores are kept in memory only.
- `?mode=emergency` opens the Vets section.

### Step 5: Profile (`src/screens/profile/`)

- **Main screen:**
  - My account row.
  - Insurance & claims, and language.
  - About us: Vets and advisors, FAQ, Customer service, Accessibility statement.
  - Refer a friend through the share sheet.
  - Sign out, version and disclaimer.
- **Sub-screens:** `/profile/account`, `/profile/team`, `/profile/faq`, `/profile/support`, `/profile/accessibility`, `/profile/insurance`.
- **Placeholder data:** the team names, support phone `+358 800 123 456` and `support@tassuvahti.fi` are made up.

### Step 6: Polish and fixes

- **Crash fixed:** the pet page crashed because of the `Link asChild` issue above.
- **Home is the default tab.** The selected tab now shows a sand pill behind its icon.
- **Back button everywhere:** `ScreenHeader` always shows it. When there is no previous screen, it goes to Home.
- **Language switcher:** now highlights the current language.
- **Loading screen:** blue with the logo (`LoadingScreen` in `src/app/_layout.tsx`), shown for **at least 3 s** (`minSplashMs`). Fonts, language and the saved session load during that time.
- **Cleanup:**
  - Removed unused files: seasonal content, `chip`, `placeholder-screen`, `step-header`, `constants/banks.ts`.
  - Removed 41 unused i18n keys. en/fi/sv have identical keys.
  - Replaced placeholder demo values (`[POLICY NO.]` and similar) with realistic mock data. Store names are fictional.

## 2. Open tasks

- [ ] **Commit the remaining Step 6 changes and merge** (see the top section). This is required: `dev` doesn't run without them.
- [ ] Tap through the whole demo on the simulator:
  - Sign in → Home → Submit a claim → back
  - Pet page tabs: Records and Passport (not yet checked visually)
  - Explore quizzes
  - Profile sub-screens and the language switch
- [ ] Optional: have a vet review the quiz content and the medical mock data.
- [ ] Optional: replace the placeholder team and support contact details with real ones.

## 3. Structure and key dependencies

```
client/
  app.json                    Expo config (typedRoutes on, reactCompiler off, splash = blue + logo)
  src/app/                    Expo Router routes (each file is a screen that re-exports from src/screens)
    _layout.tsx               root Stack, LoadingScreen (3 s), auth guards (Stack.Protected)
    (auth)/                   landing, bank-id, sign-in, sign-up
    (tabs)/_layout.tsx        bottom tabs: (home), pets, explore, profile
    (tabs)/(home)/            "/"
    (tabs)/pets/              "/pets"
    (tabs)/explore/           "/explore"
    (tabs)/profile/           "/profile", plus account, team, faq, support, accessibility, insurance
    pet/[petId]/              pet page, watch-list, log, log-result, care-plan, diet, reminders, trends, passport, share-passport, photo
    clinic/[id], substance/[id], quiz/[id], add-pet, add-visit, ate-this, find-in-store
  src/screens/                screen implementations
  src/components/ui/          AppText, Button, Card, IconTile, Pill, ListGroup/ListRow, SegmentedControl, Screen, Note, …
  src/components/features/    PetSwitcher, PetAvatar, TrafficLightBadge, ScreenHeader, LanguageSwitcher, AppLogo, SchematicMap, …
  src/services/ + mock/       async API layer, all mock today
  src/types/                  domain types
  src/i18n/locales/           en.json, fi.json, sv.json
  src/theme/                  colors, spacing, typography
server/                       backend (out of scope)
```

**Key dependencies:**
- Core: Expo SDK 58, `expo-router` 58, React 19.3, React Native 0.88
- i18n: `i18next` 26 + `react-i18next` 17, plus `expo-localization`
- Media: `expo-video`, `expo-image`, `expo-image-picker`
- Other: `expo-secure-store`, `expo-splash-screen`, `react-native-svg`, `react-native-qrcode-svg`, `react-native-reanimated` 4
- Fonts: Figtree and Sora

**Commands** (run in `client/`): `npx expo start` · `npx tsc --noEmit` · `npx expo lint` · `npx expo install <pkg>` (never `npm install`)

## 4. Next steps

1. Commit the uncommitted Step 6 work on a new branch, open a PR and merge it (top section).
2. `git checkout dev && git pull`, then restart Metro with `npx expo start -c`. The tab folders were renamed, so clear the cache.
3. Do a full demo run-through on the simulator and fix anything that looks off.
4. Optional polish if there's time: real team and support data, vet review of quizzes, and a quick check that the Records and Passport tabs look right with Rekku's data.
