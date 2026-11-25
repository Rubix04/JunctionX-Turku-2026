# TassuVahti: your vet's advice, turned into a daily care plan

> **TassuVahti turns every vet visit into a daily care plan, and tells you exactly when it's time to go back.**

Group Gabagoolers · JunctionX Turku 2026

**TassuVahti** ("PawGuard") is a pet health app for insurance customers. It turns the information from a vet visit into a personal care plan, tells the owner what to watch for at home, and makes it clear when it's time to contact a vet.

- **Design mockups:** https://claude.ai/artifact/YTMRtqRmMMjpkMBSAiRFrp
- **Languages:** English, Finnish, Swedish

## The problem

A vet visit lasts 20 minutes. Recovery lasts weeks.

- **Owners forget the instructions.** Diagnoses, doses and "watch out for…" lists are given verbally or on a printout that gets lost.
- **Owners don't know when to worry.** Is one vomit normal? Is drinking more a problem for a cat with kidney disease? Owners either panic and rush in, or wait too long.
- **Medicines get missed or given twice.** In a family, nobody knows whether the morning dose was already given.
- **Insurers only see the bill.** Problems caught late are more expensive to treat, and the customer only hears from their insurer when something has already gone wrong.

## The solution

TassuVahti stays with the pet between vet visits.

- **Care plan after every visit.** What was found, what to do at home and when the follow-up is, in plain language, with the vet's original notes kept alongside.
- **Vet documents read by AI.** Take a photo of the clinic's printout, pick a PDF or paste the text. Claude turns it into a draft care plan, medication reminders and a follow-up visit, and lists anything it could not read for sure. The plan stays a draft until the clinic checks it.
- **A quick daily log.** Appetite, energy, drinking, toilet, pain and vomiting, plus questions specific to the diagnosis. For example, after a urinary tract infection: water intake, litter box trips, straining.
- **A traffic light that knows the pet's history.** Green, yellow or red, with the reason given in plain words: *"The assessment is higher because Mirri has been diagnosed with kidney disease and has a poor appetite."* The same symptom is judged differently for a healthy young dog and an old cat with kidney disease. Emergency symptoms always override.
- **AI analysis of the vet's data and the daily logs together.** It compares what the vet expected with what the owner logs ("recovery slower than the vet expected"), gives the reasons by source, from the vet or from the logs, says what to watch and when to call the clinic, and writes a short summary for the vet.
- **Reminders the whole family shares.** Medication doses, follow-up visits and vaccinations, with a "Did you already give it?" mark so a dose is never given twice.
- **Health passport.** Vaccinations, medication, allergies, surgeries and visits in one place, shared with a vet or pet sitter through a time-limited link.
- **Diet and weight.** Diet suggestions based on the diagnosis, and portions from the food package's own feeding table.
- **"Is it safe?"** A searchable list of dangerous foods, plants and substances, with risk levels per species: lilies are an emergency for cats but not for dogs.
- **Seasonal alerts.** Ticks in spring, blue-green algae in summer, antifreeze in winter, matched to the pet's species, age and region.
- **Clinics.** Remote vet services, contracted clinics, 24-hour emergency clinics and direct payment, sorted by opening status and distance.
- **Insurance in the same app.** Remaining yearly cover and claims.

## Why insurers care

- **Earlier care costs less.** A yellow light today is cheaper than an emergency visit next week.
- **Treatment is actually followed.** Medication reminders and follow-up visits keep recovery on track.
- **Customers hear from their insurer every day,** not only when a bill arrives.
- **Contracted clinics with direct payment** are easy to find, steering care to partner clinics.

## Safety first

- **The app suggests; the vet decides.** The vet's own limits for a pet always take priority, and every assessment says that it does not replace a vet.
- **The rules decide the traffic light, the AI explains it.** The AI may raise the level up to "contact a vet" when the vet data and the logs together point to it, but never lower it. Emergencies are always decided by the rules.
- **The precautionary principle.** When too little is known about the pet, the app chooses the more serious level.
- **Medical content is kept separate from code.** It is versioned, carries sources and dates, and is marked as sample material until a veterinarian reviews it.

## Technology

| Layer | Stack |
|---|---|
| Mobile app | React Native, Expo SDK 58, Expo Router, TypeScript |
| Languages | Finnish, Swedish, English |
| Back-end | Node.js, TypeScript, Fastify 5, Zod validation |
| Database | SQLite with Drizzle ORM and versioned migrations |
| Sign-in | Online banking (simulated identity provider), rotating single-use refresh tokens, sessions per device |
| AI | Claude (Anthropic) on the back-end only, for reading vet documents and the analysis of visits and logs. Without an API key both answer with a built-in sample, so the demo works offline. |
| Notifications | Expo push notifications for reminders and seasonal alerts |
| Images | Server-side cropping and resizing; location data removed from photos |
| Quality | 234 automated back-end tests (Vitest), 31 app unit tests (Jest) |

**Privacy by design:**
- The national ID number is never stored, only a one-way keyed hash of it.
- Sharing the passport is an explicit, revocable consent.
- Location is used only to sort clinics and is never saved.

## Project Structure

```
tassuvahti/
├── client/                           # Mobile app (React Native + Expo)
│   ├── src/
│   │   ├── app/                      # Expo Router pages (only re-export screens)
│   │   │   ├── (auth)/               # Landing page, BankID, email sign-in and sign-up
│   │   │   ├── (tabs)/               # The four tabs
│   │   │   │   ├── (home)/           # Home: health status and AI summary, today's care, a seasonal tip
│   │   │   │   ├── pets/             # Pets list
│   │   │   │   ├── explore/          # Clinics: remote vet services and the vets map
│   │   │   │   └── profile/          # Account, insurance, team, FAQ, support, accessibility
│   │   │   ├── pet/[petId]/          # Pet page: log, care plan, reminders, diet, passport, trends
│   │   │   ├── clinic/[id].tsx       # Clinic card
│   │   │   ├── substance/[id].tsx    # Knowledge base entry
│   │   │   ├── safe.tsx              # "Is it safe?" knowledge base, opened from the pet page
│   │   │   ├── ate-this.tsx          # "My pet ate this"
│   │   │   ├── find-in-store.tsx     # Stores for a recommended product
│   │   │   ├── add-pet.tsx
│   │   │   └── add-visit.tsx
│   │   ├── screens/                  # Screen UI, one folder per area
│   │   ├── components/               # ui/ basic elements, features/ feature components
│   │   ├── services/                 # API calls; mock/ data when no API URL is set
│   │   ├── types/                    # TypeScript types
│   │   ├── theme/                    # Colors, fonts, spacing
│   │   ├── i18n/                     # Translations: en.json, fi.json, sv.json
│   │   ├── hooks/ utils/ context/ constants/
│   ├── assets/                       # Images, icons, video
│   ├── __tests__/                    # Jest unit tests (npm test)
│   └── .env.example                  # EXPO_PUBLIC_API_URL; leave empty for mock data
└── server/                           # Back-end (Node.js + Fastify)
    ├── src/
    │   ├── modules/                  # One folder per feature
    │   │   ├── auth/                 # Online banking sign-in, sessions, devices, demo data
    │   │   ├── pets/  pet-photos/    # Pets and profile pictures
    │   │   ├── passport/             # Health passport and share links
    │   │   ├── symptoms/             # Watch lists, daily log, severity assessment
    │   │   ├── care/                 # Care plans, medication schedules, reminders
    │   │   ├── visit-scan/           # Reading vet documents with AI into a draft care plan
    │   │   ├── insights/             # AI analysis of visits and daily logs together
    │   │   ├── diet/                 # Diets, portions, weight
    │   │   ├── knowledge/            # Dangerous substances, "My pet ate this"
    │   │   ├── alerts/               # Seasonal alerts and push notifications
    │   │   ├── emergency/            # First aid guides, quick assessment, vet summary
    │   │   └── clinics/              # Contracted vets and emergency clinics
    │   └── db/                       # Database schema and connection
    ├── content/                      # Medical content and sample registries (JSON, vet-reviewed)
    ├── drizzle/                      # Database migrations
    ├── test/                         # Vitest tests
    └── .env.example
```

Each screen folder in `screens/` holds one file per screen, named `<name>-screen.tsx`, e.g. `screens/pet/daily-log-screen.tsx`.

### Routing rules

- **Pet pages:** use the `[petId]` route param. Show dog or cat content based on the pet's species.
- **Route files:** keep pages in `app/` thin; the UI lives in `screens/`.

## Design System

The full design is in the [mockups](https://claude.ai/artifact/YTMRtqRmMMjpkMBSAiRFrp). Colors and fonts live in `src/theme/`. Don't hard-code them in screens.

| Token        | Value     | Use                                  |
| ------------ | --------- | ------------------------------------ |
| `primary`    | `#0B5AA0` | Deep blue: buttons, logo, headings   |
| `accent`     | `#EE9B5A` | Warm orange: paw toes, highlights    |
| `text`       | `#1B2733` | Ink, main text                       |
| `muted`      | `#5E6670` | Captions, labels                     |
| `background` | `#FAF8F5` | Warm off-white screen background     |
| `border`     | `#E6E1D9` | Card borders                         |
| `green`      | `#1F7A4A` | Traffic light: as usual              |
| `yellow`     | `#F4C542` | Traffic light: keep an eye           |
| `red`        | `#B3261E` | Traffic light: contact a vet         |

- **Fonts:** Sora for headings, Figtree for body text and UI.
- **Traffic light:** always pair the color with an icon and a word, so it works without color vision.
- **Touch targets:** at least 44 × 44 px.

## Getting Started

The app runs on its own with mock data. Start the server too to use real sign-in and saved data. With `DEMO_MODE=true` a new account gets the same demo pets and history as the mock data (Mirri recovering from a urinary tract infection, Rekku), so the app looks the same either way. The history is written in the language the app signs in with (Finnish, Swedish or English).

**Server** (first terminal):

```bash
cd server
npm install
cp .env.example .env   # Windows: copy .env.example .env
                       # then set JWT_SECRET and IDENTITY_HASH_SECRET (32+ characters each)
npm run dev            # http://localhost:3000/health should answer {"status":"ok"}
npm test               # runs the back-end tests
```

**App** (second terminal):

```bash
cd client
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL, or leave it empty for mock data
npx expo start -c      # -c clears the cache, so a changed .env is read
npm test               # runs the app's unit tests (Jest, in __tests__/)
npm run lint           # ESLint, plus a check that the mock content matches server/content
```

`EXPO_PUBLIC_API_URL` depends on where the app runs: `http://localhost:3000` in a browser, `http://10.0.2.2:3000` in the Android emulator, or your computer's network address (e.g. `http://192.168.1.10:3000`, see `ipconfig`) on a phone. The phone must be on the same Wi-Fi, and Windows Firewall must allow Node.js.

With the server on, sign in with **online banking** (any bank; it is simulated). Email accounts are mock only.

**Tips**

- On Windows, Notepad may save the file as `.env.txt`. Expo and the server only read a file named exactly `.env`.
- The demo history is created when an account is first made. To start over, stop the server and delete `server/data/tassuvahti.db`.

**AI (optional)**

Add `ANTHROPIC_API_KEY=` to `server/.env` and restart the server. Then Claude reads scanned vet documents and writes the analysis of visits and logs. Without a key both use a built-in sample, marked as such in the app. The key stays on the server and is never put in the app. `VISIT_SCAN_MODE` and `INSIGHTS_MODE` (`auto`, `claude` or `mock`) force one or the other.

**What uses the back-end**

| With `EXPO_PUBLIC_API_URL` set | Always mock data for now |
|---|---|
| Sign-in (online banking), pets and photos | Email sign-in |
| Visits, care plans, scanning vet documents | Water intake chart (logs record less / usual / more, not millilitres) |
| Daily logs, traffic light, watch lists, trends | Clinics and stores |
| Reminders and the medication course | Insurance and remote vet services |
| Health passport, lab results and sharing | |
| Diet and weigh-ins | |
| Seasonal alerts, "Is it safe?", AI analysis | |

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
