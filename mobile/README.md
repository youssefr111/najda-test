# NAJDA — Mobile

The Expo/React Native companion to the NAJDA web console, covering the two
roles that work from a phone: **Citizens** (report an emergency, track its
response) and field **Responders** — Ambulance Crew, Police, Firefighter,
First Responder (manage shift, work missions). Dispatcher, Hospital Staff,
and Admin are desk roles handled by the web console; those accounts still
work here, dropped into the citizen experience rather than blocked.

Talks directly to the same Spring Boot backend and Firebase project as the
web app. Postgres remains the single source of truth for roles and
permissions; Firebase is identity only.

## Features

- **Authentication** — email/password, Google Sign-In, passwordless email
  registration (with a live email-availability check as you type), forgot
  password, in-app password change
- **Registration hand-off** — the sign-in link opens the app directly via
  Universal Links / App Links when installed and configured, falling back
  to the browser otherwise (see [Deep linking](#deep-linking))
- **Emergency reporting** — a two-stage flow (large SOS button, then
  category/description/injured-count confirmation) with a live map for
  dropping or confirming the incident location
- **Responder tools** — shift start/join/leave/end, a live crew roster for
  the current unit, mission accept/reject/en-route/arrived, and a live
  driving-route map from unit to incident
- **Account management** — inline profile editing, email change,
  phone number change with test-number SMS verification, password change,
  light/dark/system theme, language switcher
- **Bilingual** — English and Arabic, with per-field direction control
  (see [Internationalization](#internationalization))
- **Support** — About, Privacy Policy, Terms & Conditions, and a Support
  contact form

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 57, Expo Router (file-based routing) |
| Language | TypeScript |
| Styling | NativeWind v4 (Tailwind classes on native components) |
| Auth | Firebase JS SDK |
| Server state | TanStack Query |
| Client state | Zustand |
| Real-time | STOMP over WebSocket (`@stomp/stompjs`) |
| Maps | MapLibre GL JS, hosted in a WebView (native) / iframe (web) bridge |
| Location | `expo-location` |
| i18n | `react-i18next` |

## Getting started

```bash
npm install
npx expo install --fix   # aligns exact versions to your installed Expo SDK
cp .env.example .env     # fill in every value -- see below
npx expo start -c
```

Scan the QR code with **Expo Go** (iOS/Android), or press `a` / `i` for an
emulator. No native build is required for local development — Google
Sign-In uses `expo-auth-session`, which works in Expo Go.

For a downloadable build (`.apk`) or App Store/TestFlight distribution, see
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

### Environment variables

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Spring Boot backend host. Use your machine's LAN IP, not `localhost`, when testing on a physical device or in Expo Go. |
| `EXPO_PUBLIC_WS_URL` | STOMP-over-WebSocket endpoint exposed by the backend. |
| `EXPO_PUBLIC_WEB_APP_URL` | The deployed web app's URL — used as the target for the registration email link. |
| `EXPO_PUBLIC_FIREBASE_*` | Same Firebase project as the web app. |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | OAuth client ID, **iOS** type, bundle ID `com.najda.mobile`. |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | OAuth client ID, **Android** type, package `com.najda.mobile`, matched to your build's signing SHA-1. Google rejects a Web-type client ID here for any build outside Expo Go — see the note in [Authentication](#authentication). |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | OAuth client ID, **Web** type — used as the audience for the resulting ID token. |
| `EXPO_PUBLIC_EMAILJS_*` | Same EmailJS account as the web app, powering the Support screen's contact form. |

For a cloud build via EAS, these need to be set as [EAS environment
variables](https://docs.expo.dev/eas/environment-variables/) as well — a
local `.env` is never uploaded to or read by a cloud build. See
`DEPLOYMENT.md`.

## Project structure

```
mobile/
├── app/                    Expo Router routes -- thin, just wires a screen to a URL
│   ├── (auth)/              login, register, check-email
│   ├── (app)/               guarded (auth + profile-complete), then splits by role
│   │   ├── citizen/          tabs: Home · Account (My Reports lives on Account)
│   │   └── responder/        tabs: Missions · Shift · Account
│   ├── complete-signup.tsx   Universal Link handler for the registration email
│   └── about.tsx, privacy.tsx, terms.tsx, support.tsx
├── src/
│   ├── api/                 fetch wrapper -> Spring Boot, Bearer token, typed errors, timeouts
│   ├── firebase/             Firebase app + Auth (RN persistence)
│   ├── ws/                   STOMP client factory
│   ├── store/                 Zustand: auth session, language, theme
│   ├── hooks/                  one folder per resource (auth, incidents, shifts, missions, units, users)
│   ├── screens/                screen implementations rendered by app/ routes
│   ├── components/             ui/ (generic), auth/, account/, emergency/, map/
│   ├── theme/                  native-prop color lookups (icons, indicators) -- see Styling below
│   ├── i18n/                   en.json / ar.json + bootstrap
│   ├── lib/                    auth helpers, locale helpers, location hooks, cross-platform confirm dialog
│   └── types/                  mirrors the backend contract 1:1 with the web app
├── deep-linking/              Universal Link / App Link setup files and instructions
├── eas.json                  EAS Build profiles
└── DEPLOYMENT.md              build, distribution, and release instructions
```

## Architecture

### Authentication

There is no session cookie: the web app's httpOnly cookie (`/api/session`)
is a Next.js-specific concept. This app keeps the Firebase ID token in
memory via the SDK's own persistence and sends it as `Authorization:
Bearer <token>` on every request (`src/api/client.ts`) — the same token
your Spring filter already verifies.

Google Sign-In requires platform-specific OAuth client IDs. A build running
in Expo Go can use a Web-type client ID, but any standalone build (EAS
Build, TestFlight, Play Store) redirects through the app's own custom URL
scheme, which Google's servers only permit for Android/iOS-type client
IDs — using a Web-type client ID there fails with `Custom scheme URIs are
not allowed for 'WEB' client type`. The Android client ID must be
registered with the app's package name and the SHA-1 fingerprint of
whichever certificate actually signs the build (`eas credentials` shows
this for an EAS-managed build).

### WebSocket authentication

For the same reason, the STOMP client can't rely on a cookie handshake —
`src/ws/client.ts` sends the Bearer token as a STOMP `CONNECT` header
instead. If the backend's WebSocket security only checks the cookie, add a
`ChannelInterceptor` that also accepts `Authorization` on `CONNECT`.

### Maps

`src/components/map/MapLibreView.tsx` bridges to a WebView (native) or an
`<iframe>` (web — `react-native-webview` has no web support at all) hosting
a static HTML page that boots MapLibre GL JS on the same free style the web
app uses (`https://tiles.openfreemap.org/styles/liberty`), with the two
sides talking over `postMessage`. Two screen-specific wrappers consume it:

- `LocationPickerMap` — the report screen's pin picker
- `MissionRouteMapView` — the responder mission detail's live route, via
  the same public OSRM routing server the web app calls

The camera only moves on an explicit command (locate-me, reset, recenter);
panning, zooming, or a marker update never yanks it back, matching the web
app's own map behavior. Marker icons are simplified relative to the web
app's exact icon set — a generic pin shape and single-letter unit/facility
markers — everything else (style, colors, dark-mode tile inversion, marker
pulse animation, route styling) is a close port.

Screens embedding a map inside a scrollable container (the report screen)
temporarily disable the outer scroll for the duration of any touch that
starts on the map, handing pan/zoom gestures to the map instead of the
surrounding `ScrollView` — see `Screen.tsx`'s `scrollEnabled` prop.

### Deep linking

The registration email link
(`https://<EXPO_PUBLIC_WEB_APP_URL>/complete-signup?...`) opens the native
app directly when it's installed and Universal Links / App Links are
configured, and falls back to the browser otherwise — the URL never
changes; the OS decides based on domain verification files hosted on the
web app's own domain.

`app/complete-signup.tsx` + `src/screens/CompleteSignupScreen.tsx`
replicate the web app's `/complete-signup` page logic natively
(`isSignInWithEmailLink` → retrieve the email saved locally by
`RegisterScreen` → `signInWithEmailLink` → `registerCitizenBootstrap`),
skipping only `establishSession()`, which is the web-only cookie step.

Setup instructions, including where to find your Apple Team ID and Android
signing fingerprint, are in [`deep-linking/README.md`](./deep-linking/README.md).
`associatedDomains` (iOS) and `intentFilters` (Android) are native
configuration and only take effect in a development or production build,
not Expo Go.

### Styling

Every component uses NativeWind `className`s — the same utility names as
the web app's Tailwind config (`bg-slate-50`, `text-slate-900`,
`dark:bg-slate-950`, etc.) — instead of `StyleSheet`. The one exception is
a handful of native props that only accept a raw color value and can't
take a class: `<Ionicons color>`, `<ActivityIndicator color>`,
`placeholderTextColor`, and the tab bar's tint colors. Those pull from
`src/theme/index.ts`, a light/dark hex lookup kept in sync with the
Tailwind classes used alongside it.

Theme (light/dark/system) is a manual, persisted override — not just the
OS setting — via `src/store/theme-store.ts` and NativeWind's own
`colorScheme` API (`tailwind.config.js`'s `darkMode: "class"`). Both
`src/theme/index.ts` and the map's dark-tile inversion read from
NativeWind's `useColorScheme`, not React Native's built-in one, so they
stay in sync with the manual override.

### Internationalization

Language switches are instant — no reload. The app's overall chrome (tab
bar, back button, navigation) always stays left-to-right, regardless of
language. Content that should follow the current language's reading
direction does so explicitly, per component, via two small tools:

- `useDirection()` (`src/lib/locale/useDirection.ts`) — returns the
  current language's direction (`"ltr" | "rtl"`)
- `<Directional dir={...}>` (`src/components/ui/Directional.tsx`) — applies
  that direction to one element's subtree, the same job web's `dir`
  attribute does

```tsx
const dir = useDirection();
<Directional dir={dir}>
  <Text>{t("about.description")}</Text>
</Directional>
```

This mirrors the web app's own `dir={dir}` pattern rather than mirroring
the whole screen: pass it explicitly to whatever you want it applied to.
Supported languages and their metadata live in `src/lib/locale/config.ts`
and `languages.ts`, mirroring the web app's `lib/locale/` structure.

### Phone number verification

Firebase's phone-auth verification normally requires a `RecaptchaVerifier`,
which needs a real DOM element to attach to — React Native has none.
`src/firebase/client.ts` sets
`appVerificationDisabledForTesting = true`, Firebase's own documented
escape hatch, which allows the verification flow to complete for phone
numbers registered as **test numbers** in Firebase Console →
Authentication → Sign-in method → Phone. Real numbers still require a
genuinely solved reCAPTCHA challenge, so they aren't supported yet — that
needs either `@react-native-firebase/auth` (a native module, incompatible
with Expo Go) or a custom WebView-hosted reCAPTCHA bridge.

## Known limitations

- **Phone verification** supports Firebase test numbers only (see above) —
  not gated behind or unlocked by the Firebase billing plan; it's a client
  capability, not a billing one.
- **No media attachments** on incident reports (photo/video/audio).
- **No hospital transfer workflow** on the responder side (hospital picker,
  transfer panel, vitals log). The map primitive it would need already
  exists.
- **No "Become a Responder" application flow** for citizens.
- **No in-app chat** on an incident.
- **No MFA** — blocked by the same DOM-dependent reCAPTCHA constraint as
  phone verification.

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for building a downloadable Android
APK, distributing it via GitHub Releases, and free options for testing on
iOS.
