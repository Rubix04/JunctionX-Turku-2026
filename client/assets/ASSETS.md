# TassuVahti – Image assets

Drop this `assets/` folder into `client/` (it matches the folder structure in the README).

## App icons and splash

| File | Size | Use |
| --- | --- | --- |
| `images/icon.png` | 1024 × 1024 | App icon. Full-bleed square, no transparency: iOS rounds the corners itself. |
| `images/android-icon-foreground.png` | 1024 × 1024 | Android adaptive icon, foreground. Artwork stays inside the safe zone. |
| `images/android-icon-background.png` | 1024 × 1024 | Android adaptive icon, solid blue background. |
| `images/android-icon-monochrome.png` | 1024 × 1024 | Android 13+ themed icon (only the alpha is used). |
| `images/splash-icon.png` | 1024 × 1024 | Splash logo (light tile, blue shield), shown on a blue background. |
| `images/favicon.png` | 48 × 48 | Web favicon. |

`app.json`:

```json
{
  "expo": {
    "name": "TassuVahti",
    "icon": "./assets/images/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png",
        "backgroundColor": "#0B5AA0"
      }
    },
    "web": { "favicon": "./assets/images/favicon.png" },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 120,
          "resizeMode": "contain",
          "backgroundColor": "#0B5AA0"
        }
      ]
    ]
  }
}
```

## Brand (`images/brand/`)

Every logo comes as SVG (`svg/`, for slides, print and the web) and PNG (`png/`, for the app and documents). The wordmark text is converted to outlines, so no font is needed to open the files.

| Name | What it is | Use on |
| --- | --- | --- |
| `icon-primary` | Blue tile, light shield, orange toes | Light backgrounds. The main logo. |
| `icon-light` | Light tile, blue shield | Blue or dark backgrounds |
| `icon-dark` | Ink tile | Light backgrounds where blue clashes |
| `mark-blue` / `mark-white` | Shield and paw without a tile | In-app headers, small spaces |
| `mark-mono-ink` / `mark-mono-white` | One colour, paw cut out | Stamps, print, single-colour use |
| `wordmark-on-light` / `wordmark-on-dark` | "TassuVahti" text | Next to the mark, titles |
| `wordmark-mono-ink` / `wordmark-mono-white` | Text in one colour | Single-colour use |
| `logo-horizontal-on-light` / `-on-dark` | Icon + wordmark side by side | Headers, slides, report cover |
| `logo-stacked-on-light` / `-on-dark` | Icon above wordmark | Square spaces, posters |

Rules: keep clear space around the logo of at least half the icon's width, don't recolour or stretch it, and use the `-on-dark` versions on blue or dark backgrounds.

## Tab icons (`images/tabIcons/`)

`home`, `map`, `knowledge`, `alerts`, `account`. Each comes as `name.png`, `name@2x.png` and `name@3x.png` (24 pt). React Native picks the right density automatically. The icons are black on transparent so you can recolour them with `tintColor`:

```tsx
<Image
  source={require('<path-to>/assets/images/tabIcons/home.png')}
  style={{ width: 24, height: 24, tintColor: color }}
/>
```

The `.svg` files use `currentColor` if you prefer `react-native-svg`. In the app the tab bar uses `colors.primary` (active) and `colors.muted` (inactive) from `src/theme/colors.ts`.

Other UI icons in the mockups (back arrow, phone, camera, etc.) follow the same 24 × 24, 2 px stroke style as `lucide-react-native`, so use that library instead of exporting each one.

## Placeholders (`images/placeholders/`)

Default pet pictures, shown until the owner adds a photo: `pet-cat`, `pet-dog`, `pet-small-animal` (512 × 512 PNG + SVG).

## Illustrations (`images/illustrations/`)

| File | Use |
| --- | --- |
| `onboarding-pets` | Welcome screen hero (342 × 180 pt, PNG at @3x) |
| `empty-no-pets` | Empty state on Home before the first pet is added |

## Colours and fonts

The source of truth is `src/theme/colors.ts`; this table lists the brand colours used in the logo files.

| Token | Value |
| --- | --- |
| Vahti blue (primary) | `#0B5AA0` |
| Tassu orange (accent) | `#EE9B5A` |
| Ink (text) | `#1B2733` |
| Warm off-white (background) | `#FAF8F5` |
| Green / Yellow / Red | `#1F7A4A` / `#F4C542` / `#B3261E` |

Fonts: **Sora** (headings, ExtraBold for the logo) and **Figtree** (body). Install with `npx expo install @expo-google-fonts/sora @expo-google-fonts/figtree`.
