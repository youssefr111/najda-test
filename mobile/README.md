# NAJDA — Mobile (Expo + React Native + TypeScript)

Companion app to the NAJDA web console, for the two roles that actually work
from a phone: **Citizens** (report an emergency, track it) and **field
Responders** — Ambulance Crew, Police, Firefighter, First Responder (manage
shift, work missions). Dispatcher, Hospital Staff, and Admin are desk roles;
if one of those accounts signs in here, it's dropped into the citizen
experience rather than blocked, exactly like a regular citizen.

Talks directly to your existing Spring Boot backend and the same Firebase
project as the web app — Postgres is still the only source of truth for
roles and permissions, Firebase is still identity-only.

## Stack

- **Expo SDK 57** + **Expo Router** (file-based routing, TypeScript)
- **NativeWind v4** (Tailwind CSS classes on native components — `className`, not `StyleSheet`)
- **Firebase JS SDK** for auth (email/password, Google, passwordless-link registration)
- **TanStack Query** for all server state, **Zustand** for small UI/session state
- **@stomp/stompjs** over a native WebSocket for live updates
- **react-native-webview** hosting MapLibre GL JS for live maps
- **react-i18next** for English/Arabic, with full RTL layout switching
- **expo-location** for one-shot report coordinates and continuous on-shift tracking

## Project layout

```
najda-mobile/
├── app/                     Expo Router routes only — thin, just wires a screen to a URL
│   ├── (auth)/              login, register, check-email
│   └── (app)/               guarded (auth + profile-complete), then splits by role
│       ├── citizen/         tabs: Report · My Reports · Account
│       └── responder/       tabs: Missions · Shift · Account
├── src/
│   ├── api/                 fetch wrapper -> Spring Boot, Bearer token, typed errors
│   ├── firebase/            Firebase app + Auth (RN persistence)
│   ├── ws/                  STOMP client factory
│   ├── store/                Zustand: auth session, language/RTL
│   ├── hooks/                 one folder per resource (auth, incidents, shifts, missions, units, users)
│   ├── screens/               actual screen implementations (what app/ routes render)
│   ├── components/            ui/ (generic), auth/, emergency/
│   ├── theme/                 colors, spacing, typography — light + dark
│   ├── i18n/                   en.json / ar.json + bootstrap
│   ├── lib/                    auth helpers, location hooks
│   └── types/                   mirrors the backend contract 1:1 with the web app
```

## Setup

```bash
npm install
npx expo install --fix   # aligns exact versions to your installed Expo SDK
cp .env.example .env     # fill in every value — see below
npx expo start -c
```

Scan the QR code with **Expo Go** (iOS/Android), or press `a` / `i` for an
emulator. No native build or `expo prebuild` needed for anything in this
scaffold — Google Sign-In here uses `expo-auth-session`, which works in
Expo Go.

### Environment variables (`.env`)

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Your Spring Boot host. Use your machine's **LAN IP**, not `localhost`, when testing on a real device or in Expo Go. |
| `EXPO_PUBLIC_WS_URL` | Your STOMP endpoint, `ws://` or `wss://`. |
| `EXPO_PUBLIC_WEB_APP_URL` | Your deployed web app's URL — see "Registration" below. |
| `EXPO_PUBLIC_FIREBASE_*` | Same Firebase project as the web app (`web/.env`'s `NEXT_PUBLIC_FIREBASE_*` values, same values, new names). |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | OAuth client IDs from Google Cloud Console, same project as Firebase. Create an **iOS**, an **Android**, and a **Web** client ID (the Web one also acts as `expo-auth-session`'s proxy client on Android). |

## Troubleshooting: stuck loading after login

Login itself only talks to Firebase (Google's servers), so it always
"works." The very next thing that happens is the **first call to your own
backend** (`GET /api/auth/me`), and that's almost always where a stall
traces back to. As of this scaffold, a failed/unreachable call now times
out after 15s and shows a real error screen with the message and a Retry
button (see `src/api/client.ts` and `app/(app)/_layout.tsx`) instead of
spinning forever — if you still see an infinite spinner, update to that
version first so the *next* debugging step actually shows you something.

Once you can see the error, check, in order:

1. **`EXPO_PUBLIC_API_BASE_URL` is a LAN IP, not `localhost`.** On a
   physical device or in Expo Go, `localhost` means the phone itself. Find
   your computer's LAN IP (`ipconfig getifaddr en0` on macOS, `ipconfig` on
   Windows) and use `http://<that-ip>:8080`.
2. **Phone and backend are on the same network**, and nothing (a firewall,
   a VPN, a "guest" WiFi that isolates clients) is blocking that port.
3. **The backend is bound to `0.0.0.0`, not `127.0.0.1`** — Spring Boot's
   default `server.address` is fine, but double check nothing overrides it.
4. **Plain `http://` gets blocked on a native build.** Android 9+ and iOS
   both block cleartext traffic by default; `app.json` already sets
   `android.usesCleartextTraffic` and `ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads`
   for this. Note these only take effect in a **development build**
   (`npx expo run:android` / `run:ios`, or an EAS dev client) — Expo Go
   ships its own shell and already allows arbitrary HTTP for exactly this
   reason, so if you're on Expo Go this specific setting isn't the culprit.
   Tighten or remove this before shipping a production build; a real
   backend should be on `https://` anyway.

## Common gaps that look like bugs but aren't (yet)

- **Account screen looks sparse / missing fields the web app has** — right
  now it only surfaces what's already in the `User` shape from `/api/auth/me`
  (name, email, role, facility, phone). Anything the web Account page shows
  beyond that hasn't been wired up on mobile yet.
- **No map** — deliberately deferred, see "What's not built yet" below.


## Architecture decisions worth knowing about

**Styling is Tailwind, via NativeWind.** Every component uses `className`
(the same utility names as your web app's Tailwind config — `bg-slate-50`,
`text-slate-900`, `dark:bg-slate-950`, etc.) instead of `StyleSheet`. The one
exception: a handful of native props that only accept a raw color value and
can't take a class at all — `<Ionicons color>`, `<ActivityIndicator color>`,
`placeholderTextColor`, and React Navigation's tab bar tint/`StatusBar`
style. Those pull from the small `useTheme()` hook in `src/theme/index.ts`,
which is just a light/dark hex lookup kept in sync with the Tailwind classes
used right next to it — not a parallel styling system. Dark mode follows the
OS setting automatically via Tailwind's `dark:` variant
(`darkMode: "media"` in `tailwind.config.js`).

**No session cookie.** The web app authenticates via an httpOnly cookie
(`/api/session`) issued by a Next.js API route, which only makes sense for a
browser. This app skips that entirely: it keeps the Firebase ID token in
memory (via the SDK's own persistence) and sends it as `Authorization:
Bearer <token>` on every request — see `src/api/client.ts`. Nothing extra
required on the backend; it's the same token your Spring filter already
verifies.

**WebSocket auth.** For the same reason, the STOMP client can't rely on a
cookie handshake either, so `src/ws/client.ts` sends the Bearer token as a
STOMP `CONNECT` header instead. If your backend's WebSocket security only
ever checked the cookie, you'll want a small `ChannelInterceptor` that also
accepts `Authorization` on `CONNECT` — a few lines next to whatever already
verifies the Firebase token on your REST filter.

**Registration works differently on mobile.** Firebase Dynamic Links (what
mobile passwordless sign-in traditionally relied on to reopen the app from
an email) were shut down in 2025. Rather than build custom Universal
Links/App Links plumbing, this app leans on the web app's **already-working**
`/complete-signup` flow: tapping "Continue with email" sends the sign-in
link pointing at `EXPO_PUBLIC_WEB_APP_URL + "/complete-signup"`. The person
finishes registration (and sets a password) in their phone's browser, then
comes back to the app and logs in with email + password. Google Sign-In, by
contrast, is fully native here — no browser hand-off needed.

**No forgot-password flow yet.** Deliberately left out of this pass to keep
scope honest — easy to add (`sendPasswordResetEmail`) whenever you want it.

## What's built now

Beyond the original core (auth, navigation, incident reporting, shifts,
missions), this pass added, to match the web app more closely:

- Forgot-password flow, in-app password change, resend email verification
- Inline profile editing on the Account screen (name, address, gender)
- Crew list on the Shift screen (who else is on this unit right now)
- Past missions section on the Missions screen
- About, Privacy Policy, Terms & Conditions, and Support (contact form via
  the same EmailJS account as web) — linked from Account
- Visual redesign to match the web app's actual brand: the real NAJDA logo,
  the warm red/cream SOS palette, the two-stage "big red button → confirm
  details" report flow, bold category cards, pill-shaped alert buttons
- **Live maps**, via a WebView hosting MapLibre GL JS on the exact same free
  style the web app uses (`https://tiles.openfreemap.org/styles/liberty`) —
  no API key, works in Expo Go, no native module. See "How the maps work"
  below.
  - The report screen's location picker (tap to drop a pin, "use my
    location", reset, zoom controls) replaces the old plain location card
  - A mission's detail screen now shows a live driving route (via the same
    public OSRM server the web app calls) from the responding unit to the
    incident

## How the maps work

`src/components/map/MapLibreView.tsx` is a small generic bridge: a
`react-native-webview` loads a static HTML page
(`src/components/map/mapHtml.ts`) that boots MapLibre GL JS, then the two
sides talk over `postMessage` — React Native sends marker/route updates and
camera commands in, the page sends taps and marker clicks back out. Two
screen-specific components wrap it:

- `LocationPickerMap` — the citizen report's pin picker
- `MissionRouteMapView` — the responder mission detail's route view

The camera only moves on an explicit command (locate-me, reset, mission
recenter) — panning or zooming freely, or just updating markers, never
yanks the camera back, matching how the web app's map behaves (React
StrictMode/`initialViewState` is uncontrolled after mount there too).

Icon fidelity is simplified versus web's exact Lucide icons — pins use a
plain inline SVG marker shape, unit/facility markers use a single letter —
since drawing the full icon set inside a WebView wasn't worth the added
complexity for this pass. Everything else (style, colors, dark-mode
inversion trick, marker pulse animation, route styling) is a close port.

## What's still missing for full parity

Roughly in the order it makes sense to build them:

1. **Hospital picker map** — the `MapLibreView` primitive already supports
   this (it's the same multi-marker pattern as everything above); it's not
   wired up because...
2. **Hospital transfer** (responder-initiated) itself isn't built yet —
   hospital picker, transfer panel, presumably a vitals log. Lives in the
   Responder module, not the Hospital Staff dashboard, so it's in scope.
3. **Media on incident reports** — photo/video/audio attachments, uploaded
   to the same private Supabase bucket the web app uses.
4. **Become a Responder** — citizen application flow with document upload.
5. **In-app chat** on an incident.
6. **Email change** (self-service, with a confirmation-email watcher).
7. **MFA** (SMS-based) — genuinely awkward on mobile: the web flow leans on
   an invisible reCAPTCHA verifier, which has no direct RN equivalent and
   would need a WebView-based workaround.

