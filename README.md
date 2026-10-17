# TassuVahti

Group Gabagoolers

TassuVahti ("PawGuard") is a pet health app for an insurance company. It turns the information from a vet visit into a personal care plan, tells the owner what to watch for at home, and makes it clear when it is time to contact a vet.

Built with **React Native**, **Expo Router** and **TypeScript**.

- **Design mockups:** https://claude.ai/artifact/YTMRtqRmMMjpkMBSAiRFrp
- **Languages:** English, Finnish, Swedish

## Main Features

- **Symptom tracking:** a watch list based on the pet's diagnosis, a 30-second daily log and a green / yellow / red traffic light.
- **Care plan:** the vet's notes in plain language, medication reminders and follow-up visits.
- **Diet and weight:** diet recommendations, weight tracking and a portion calculator.
- **Health passport:** vaccinations, medication, allergies, surgeries and visits, shareable with a vet or pet care.
- **Emergency mode:** a red Emergency button on every screen, quick assessment and first aid guides. Works without signing in.
- **Maps:** contracted vets and emergency clinics, and stores that sell vet-recommended products.
- **Knowledge base:** dangerous foods, plants and substances, with species-specific risk levels.
- **Seasonal alerts:** tips by season and location.
- **Multiple pets:** one page per pet, separate dog and cat content, shared with the family account.
- **Sign-in:** online banking the first time, then face recognition, fingerprint or PIN.

## Project Structure

```
tassuvahti/
├── client/ <-- frontend
│   ├── src/
│   │   ├── app/                      # Expo Router pages
│   │   │   ├── (auth)/               # Unauthenticated flow
│   │   │   │   ├── welcome.tsx       # Welcome + language switch
│   │   │   │   ├── bank-auth.tsx     # Online banking sign-in (first time)
│   │   │   │   ├── set-lock.tsx      # Choose face / fingerprint / PIN
│   │   │   │   ├── unlock.tsx        # Returning user unlock
│   │   │   │   └── _layout.tsx       # Stack layout for auth screens
│   │   │   ├── (tabs)/               # Tab navigation group
│   │   │   │   ├── (home)/           # Home tab
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   └── index.tsx
│   │   │   │   ├── (map)/            # Map tab: vets and emergency clinics
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   └── index.tsx
│   │   │   │   ├── (knowledge)/      # "Is it safe?" tab: knowledge base
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   └── index.tsx
│   │   │   │   ├── (alerts)/         # Seasonal alerts tab
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   └── index.tsx
│   │   │   │   ├── (account)/        # Account tab
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   ├── index.tsx     # Settings
│   │   │   │   │   └── insurance.tsx # Insurance and claims
│   │   │   │   └── _layout.tsx       # Tab layout
│   │   │   ├── pet/                  # Pet-specific pages
│   │   │   │   └── [petId]/          # Route param: pet id
│   │   │   │       ├── index.tsx     # Pet page
│   │   │   │       ├── log.tsx       # Daily log
│   │   │   │       ├── log-result.tsx # Traffic light result
│   │   │   │       ├── trends.tsx
│   │   │   │       ├── care-plan.tsx
│   │   │   │       ├── reminders.tsx
│   │   │   │       ├── diet.tsx
│   │   │   │       ├── passport.tsx
│   │   │   │       ├── share-passport.tsx
│   │   │   │       └── photo.tsx     # Crop profile picture
│   │   │   ├── emergency/            # Emergency mode, no sign-in required
│   │   │   │   ├── index.tsx         # Stage 1: quick assessment
│   │   │   │   ├── first-aid.tsx     # Stage 2: first aid topics
│   │   │   │   └── [topic].tsx       # Route param: first aid guide, e.g. cpr
│   │   │   ├── clinic/
│   │   │   │   └── [id].tsx          # Clinic card
│   │   │   ├── substance/
│   │   │   │   └── [id].tsx          # Knowledge base entry
│   │   │   ├── ate-this.tsx          # "My pet ate this", full-screen modal
│   │   │   ├── find-in-store.tsx     # Map of stores for a product
│   │   │   ├── add-pet.tsx           # Add a pet, full-screen modal
│   │   │   ├── add-visit.tsx         # Add a vet visit, full-screen modal
│   │   │   ├── _layout.tsx           # Root layout
│   │   │   └── +not-found.tsx        # 404 page
│   │   ├── components/               # Reusable UI components
│   │   │   ├── ui/                   # Basic UI elements
│   │   │   └── features/             # Feature-specific components
│   │   ├── screens/                  # Screen UI (app/ files only re-export these)
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── map/
│   │   │   ├── knowledge/
│   │   │   ├── alerts/
│   │   │   ├── account/
│   │   │   ├── pet/
│   │   │   ├── emergency/
│   │   │   ├── clinic/
│   │   │   ├── substance/
│   │   │   ├── ate-this/
│   │   │   ├── find-in-store/
│   │   │   ├── add-pet/
│   │   │   └── add-visit/
│   │   ├── services/                 # API calls and external services
│   │   ├── utils/                    # Helper functions
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── context/                  # React Context providers
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── theme/                    # Design system (colors, fonts)
│   │   ├── constants/                # App-wide constants
│   │   └── i18n/                     # Localization
│   │       ├── index.ts              # i18n setup
│   │       └── locales/
│   │           ├── en.json           # English
│   │           ├── fi.json           # Finnish
│   │           └── sv.json           # Swedish
│   ├── assets/                       # Images and app icons
│   │   └── images/
│   │       ├── icon.png              # App icon
│   │       ├── splash-icon.png       # Splash screen logo
│   │       ├── android-icon-*.png    # Android adaptive icon
│   │       ├── favicon.png           # Web favicon
│   │       ├── brand/                # Logo versions
│   │       ├── tabIcons/             # Bottom tab icons
│   │       ├── illustrations/        # Onboarding illustrations
│   │       └── placeholders/         # Default pet pictures (cat, dog, small animal)
│   ├── .env                          # Local values, NOT committed (in .gitignore)
│   └── .env.example                  # Variable names only, committed
├── server/ <-- backend
│   └── (empty for now)
```

Each screen folder in `screens/` holds one file per screen, named `<name>-screen.tsx`, e.g. `screens/pet/daily-log-screen.tsx`.

### Routing rules

- **Emergency first:** everything under `emergency/` must open without signing in. Keep it outside any auth guard in the root `_layout.tsx`.
- **Emergency button:** the red Emergency button is shown on every screen. Use the shared component from `components/features/`, don't build a new one per screen.
- **Pet pages:** use the `[petId]` route param. Show dog or cat content based on the pet's species.

## Design System

The full design is in the [mockups](https://claude.ai/artifact/YTMRtqRmMMjpkMBSAiRFrp). Colors and fonts live in `src/theme/`. Don't hard-code them in screens.

| Token        | Value     | Use                                            |
| ------------ | --------- | ---------------------------------------------- |
| `primary`    | `#0E5A63` | Vahti teal, buttons, logo                      |
| `accent`     | `#F2A33A` | Tassu amber, paw toes                          |
| `text`       | `#14232B` | Ink, main text                                 |
| `muted`      | `#56656C` | Secondary text                                 |
| `background` | `#F5F7F6` | Mist, screen background                        |
| `border`     | `#DDE3E0` | Card borders                                   |
| `green`      | `#1F7A4A` | Traffic light: as usual                        |
| `yellow`     | `#F4C542` | Traffic light: keep an eye                     |
| `red`        | `#B3261E` | Traffic light: contact a vet, Emergency button |

- **Fonts:** Sora for headings, Figtree for body text and UI.
- **Traffic light:** always pair the color with an icon and a word, so it works without color vision.
- **Touch targets:** at least 44 × 44 px.

## Getting Started

```bash
cd client
npm install
cp .env.example .env   # then fill in your own values
npx expo start
```

## Coding Conventions

- **Function declarations:** Use arrow function expressions assigned to `const`, not the `function` keyword.

```tsx
// ✅ Preferred
const MyComponent = () => {
  return <View />;
};

// ❌ Avoid
function MyComponent() {
  return <View />;
}
```

- **Route files:** Files in `app/` only re-export the matching screen from `screens/`, e.g. `export { default } from '@/screens/home/home-screen';`. All UI code goes in `screens/`.
- **Translations:** No hard-coded user-facing text. Add every string to `en.json`, `fi.json` and `sv.json`.
- **Medical content:** First aid, knowledge base and seasonal alert texts come from vet-reviewed content. Don't write or change them in code. Always show the "does not replace a vet" note where the design has it.

# Feature branches

In this project we use feature branches. This is the naming convention for our branches.

## Basic Rules

- **Naming schema:** `category/description-in-kebab-case`
- **Lowercase and hyphen-separated:** Use lowercase letters and hyphens between words, e.g. `feature/daily-log-screen` or `bugfix/header-styling`.
- **Allowed characters:** Only a–z, 0–9 and hyphens. No spaces, underscores, dots or other punctuation.
- **No continuous hyphens:** `feature--daily-log-screen` is hard to read.
- **No trailing hyphens:** Don't end a branch name with a hyphen, e.g. `feature/daily-log-screen-`.
- **Descriptive:** The name should describe the work, not the person doing it. GitLab already records the author of every commit.
- **One task per branch:** Create the branch from `dev`, use it for one task, and open a merge request when it's done.
- When your branch gets accepted, it will be [squashed](https://www.geeksforgeeks.org/git-squash/), merged into `dev` and then deleted.

## Categories for branch naming

| Category        | Use it for                                                  | Examples                                                                   |
| --------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `feature/`      | A new screen, component or functionality                    | `feature/daily-log-screen`, `feature/emergency-mode`, `feature/clinic-map` |
| `bugfix/`       | Fixing something that doesn't work as expected              | `bugfix/traffic-light-color`, `bugfix/reminder-not-saved`                  |
| `style/`        | Visual changes only: colours, spacing, fonts, layout tweaks | `style/pet-page-spacing`, `style/logo-toes`                                |
| `refactor/`     | Restructuring code without changing what it does            | `refactor/extract-pet-card`, `refactor/auth-service`                       |
| `test/`         | Adding or updating tests                                    | `test/auth-context`, `test/portion-calculator`                             |
| `docs/`         | README, report and other documentation                      | `docs/update-readme`, `docs/ai-usage-report`                               |
| `chore/`        | Maintenance: updating packages, config files, `.gitignore`  | `chore/update-expo-sdk`, `chore/eslint-config`                             |
| `structure/`    | Project setup and folder structure                          | `structure/project-structure`, `structure/i18n-setup`                      |
| `experimental/` | Trying out an idea that may not be merged                   | `experimental/voice-first-aid`, `experimental/plant-photo-search`          |
| `release/`      | Preparing the app for publishing                            | `release/v1-0-0`, `release/demo-build`                                     |
| `hotfix/`       | An urgent fix on `main` that can't wait                     | `hotfix/app-crash-on-start`                                                |

If a change fits more than one category, pick its main purpose. For example, a new screen that also adds translations is still `feature/`.

### Experimental

These branches don't have to be merged. If the idea works out, move the code to a `feature/` branch and open a merge request from there.

### Release

Use it when getting a version ready for the demo or submission: version number in `app.json`, app icon, splash screen and build settings. Merge it into `dev` first, then `dev` into `main`. Version numbers use hyphens instead of dots, e.g. `release/v1-0-0`.

### Hotfix

Only for urgent problems on `main`, e.g. the app crashes right before the demo, and only after the team agrees. This is the one exception to "only `dev` is merged into `main`": the hotfix is merged into `main` and then also into `dev`, so the fix isn't lost.

## Merge conflicts

If your branch has conflicts with `dev`, resolve them on your own branch:

```bash
git switch dev
git pull
git switch feature/your-branch
git merge dev
```

Fix the conflicts in VS Code, then commit and push. The merge request updates automatically.

## Merge Requests

- Always mark yourself as assignee

- Always select the following Merge options
  - "Delete source branch when merge request is accepted"
  - "Squash commits when merge request is accepted."

- Always set the target branch to `dev`. Only `dev` is merged into `main` (see Hotfix for the only exception).

- A merge request needs 3 👍 from other team members before it can be merged.

- Don't merge your own merge request. Another team member merges it after review.

- Only commit on your own branch, so everyone's contributions stay visible after squashing.
