# NAJDA — Mobile (Flutter)

The companion app for the two roles that work from the field — **Citizen** (report, track) and **Responder** (shift, missions) — talking to the same Spring Boot backend and Firebase project as the web console. Dispatcher, Hospital Staff and Admin stay on the web.

Android APK is built by CI on every `v*` tag. iOS is not configured yet (the Dart code is platform-neutral; only the platform folder and signing are missing).

**Roles.** Citizens and responders get full experiences. Dispatcher, Hospital Staff and Admin accounts can sign in too, but their consoles live on the web: on mobile they get a *Home* tab that points to the web dashboard, plus *Account*, *Settings* and *Notifications*.

## Stack

| Concern | Choice |
|---|---|
| Framework | Flutter (stable ≥ 3.35, Dart ≥ 3.9) |
| State | Riverpod 3 (`Notifier` / `AsyncNotifier` / `StreamProvider`, no code generation) |
| Routing | go_router — `StatefulShellRoute` tabs, one `redirect` function owns every guard |
| Networking | Dio behind a small `ApiClient` (Firebase ID token, timeouts, `ApiException`) |
| Identity | `firebase_auth` + `google_sign_in`; Firebase initialised from the env file, no `google-services.json` |
| Maps | `maplibre_gl` (OpenFreeMap style) with **symbol markers drawn to PNG** (`core/map/map_markers.dart`): icon + colour per kind, like the web |
| Routing | OSRM public routers with a fallback (`core/routing/route_service.dart`) |
| Push | `firebase_messaging` (FCM, free on Spark) behind `PushNotificationService` |
| App lock | `local_auth` (isolated in `core/security/biometric_authenticator.dart`) |
| Live data | STOMP over WebSocket (`stomp_dart_client`) with a refetch on every push |
| Offline | on-disk report drafts + an idempotent outbox (see *Reports that survive a bad connection*) |
| i18n | `flutter_localizations` + ARB (English / Arabic), full RTL mirroring |
| Config | `flutter_dotenv`, one env file per **flavor**, only the matching one is bundled |

## Dependency pins that matter

| Package | Pin | Why |
|---|---|---|
| `firebase_core` / `firebase_auth` / `firebase_messaging` | `3.15.2` / `5.7.0` / `15.2.10` | They must be one family. An older `firebase_messaging` (e.g. 15.2.5) makes `pub` silently **downgrade** core/auth, and the app then dies at start-up with `PlatformException(channel-error ...)` from `FirebaseCoreHostApi.initializeCore`. After any `pub add`, check `flutter pub deps --style=compact \| grep firebase` |
| `local_auth` | `^2.3.0` | 3.x changed `authenticate()`; only `biometric_authenticator.dart` would need to change |

## Flavors and env files

| Flavor | Env file | Android id | Use |
|---|---|---|---|
| `local` | `.env.local` | `com.najda.mobile.local` | everyday development |
| `qa` | `.env.test` | `com.najda.mobile.test` | your own test APK, never released |
| `production` | `.env.production` | `com.najda.mobile` | the released app (same id as the old Expo app) |

> The test flavor is named `qa` because the Android Gradle Plugin rejects flavor names that start with "test". Its env file, application id and app label still say "test".

`FIREBASE_ANDROID_APP_ID` (per flavor) is required for push and for phone verification on real devices. All three env files are git-ignored. `.env.example` is the template (every key is documented in it). Missing values fail loudly on launch with a screen that names the keys, instead of a silent 404 later. Because `pubspec.yaml` declares each env file with a `flavors:` filter, **a production APK never contains the test or local configuration.**

## First-time setup

```bash
# 1. Install Flutter >= 3.35 and accept the Android licences (flutter doctor).
# 2. Generate the Android project and apply the flavor/signing overlay:
./scripts/setup_android.sh
# 3. Fill in the env file(s) you need:
cp .env.example .env.local          # then edit
# 3b. Native splash (red background + white logo, sized to match the in-app splash):
#     dart run flutter_native_splash:create   (re-run after changing assets/splash or the pubspec splash block)
# 4. Run it:
./scripts/run_local.sh                       # = flutter run --flavor local
```

Commit the generated `android/` folder afterwards (CI regenerates it only if it is missing).

Useful commands:

```bash
flutter gen-l10n                                  # regenerate translations after editing lib/l10n/arb/*.arb
flutter analyze
./scripts/build_test_apk.sh                       # your test APK -> build/app/outputs/flutter-apk/app-qa-release.apk
flutter build apk --release --flavor production   # signed with android/key.properties if present
```

## Project structure

```
lib/
  main.dart / bootstrap.dart        entry point, config + Firebase init
  app/                              app.dart (MaterialApp.router), location_prewarm, outbox_sync
  core/
    address/      governorates (en/ar), AddressValue + validation (the backend's rules)
    map/          map_markers.dart: marker images drawn to PNG, the shared colour palette
    push/         push_notifications.dart (interface + preference), fcm_push_service.dart, notification_routes.dart
    routing/      OSRM client with a fallback router
    security/     app lock (biometrics), lock screen, biometric_authenticator.dart
    status/       backend status pill
    config/       Flavor enum, typed AppConfig loaded from the flavor's env file
    network/      ApiClient (Dio), ApiException, JSON helpers, connectivity check
    router/       app_router.dart (every route + the single redirect), app_shell.dart (Home / Account bar; Home / Shift & Missions / Account for responders),
                  route_paths.dart (`areaOf(context)`: /citizen or /responder),
                  auth_transition.dart (login <-> register swipe)
    theme/        palette ThemeExtension, ThemeData, raw colours
    l10n/         locale + theme controllers, enum -> translated label functions
    location/     permission + fix, the "location sharing" setting and live readiness
    geo/          distance, GeoJSON boundary (point-in-polygon), radius ring
    layout/       responsive helpers (breakpoints, adaptive sizes)
    widgets/      UI kit: buttons, pill fields, cards, tabs, logo, consent text, dialogs, states
    utils/        validators, wire-enum mapping, request ids, error -> message mapping
  features/
    auth/         splash, login (autofill, remembered e-mail), register (email OTP), complete profile
    home/         citizen home (SOS) -- also every responder's Home tab, responder work tab (shift + missions), desk-role home, outbox banner
    incident/     report form, drafts, outbox, evidence viewer, tracking / detail, cancel sheet
    medical/      medical profile (form, view, onboarding), patient panel for responders
    account/      tabs: Account / Security / Medical
    settings/     app settings (location sharing, appearance, language, legal links, log out)
    notifications/ inbox (live, paged, read/unread) and the push device registration
    responder/    missions, mission detail + route map (destination follows incident -> hospital), shift (+ location sharing)
    handoff/      ambulance -> hospital transfer, vitals
    chat/         incident chat
    applications/ become a responder
    legal/ status/ map/
  l10n/arb/       app_en.arb, app_ar.arb  (generated Dart output is git-ignored)
test/             unit tests for the pure logic (geo, drafts/outbox models, medical profile, document rules)
```

Each feature folder is `data/` (repositories, the only code that knows URLs) -> `application/` (Riverpod providers/controllers) -> `presentation/` (screens, widgets) with plain Dart models in `domain/`.

## Behaviour worth knowing

- **The router is the only place that decides where you may be.** Signed out -> login; profile incomplete -> complete-profile; a newly registered citizen -> the one-time medical-profile step; then each role stays in its own area (`/citizen`, `/responder`, `/desk`). Legal pages are public.
- **Responders are also members of the public.** Their tabs are Home (identical to a citizen's: SOS, quick report, my reports) / Shift & Missions / Account. Everything in the report pipeline (draft, outbox, GPS pre-warm, the location setting) is gated on `Role.canFileReports`, **not** on `Role.citizen` (it once was, and a responder's report form spun forever). Screens shared by both build their links with `areaOf(context)` so a responder is never thrown into the citizen area. A unit is never assigned to a report filed by someone on its own crew (the backend refuses).
- **Roles.** `Role` mirrors the backend's role names (`enumFromWire` derives `FACILITY_MANAGER` from `facilityManager`); an unknown role string fails the profile load, so add new roles here the day the backend gets them. Desk roles (`isDesk`: dispatcher, hospital staff, facility manager, admins) get the web-dashboard page.
- **First responders** (one person, one unit) see a single *Start shift* / *End shift*: no lead/crew choice, no leave, no reset-to-facility. Other roles start a unit that has no lead, or join one that has.
- **Registration is verify-then-create**, identical to web: send a 6-digit code, verify it (one-time token), then one request creates the Firebase + database account. Continuing with Google *is* the agreement to the Terms and Privacy Policy (stated under the button); the e-mail form uses a checkbox. Both link to the in-app Terms / Privacy screens.
- **Staying signed in.** Firebase persists the session; the app waits for it to be restored (12 s ceiling) and never treats a slow restore as a sign-out. Android / iOS password managers can save and fill credentials, and the last e-mail is remembered. Each flavor has its own application id, so each keeps its own session.
- **Location rules mirror the backend** (`/api/config/incident-location`): the live GPS fix is required and taken automatically; it must be inside Egypt; the pin can only be moved if the server allows manual pins, and then only within the allowed radius (drawn on the map). The device position is always sent with the report. The rules are cached for offline use.
- **Completing a Google sign-up profile** asks for no password (these accounts sign in with Google): it saves the whole profile in ONE request (`PATCH /api/users/me/complete-profile`). Never send the profile and phone as separate concurrent calls: the server used to overwrite one with the other.
- **Addresses are structured** (governorate picker, city, street and building, optional landmark) through `AddressFields`; the forms send `addressDetails`. Users who only have the old single line get it prefilled into "street".
- **Account tab order.** Security = contact information (email, phone) first, then the password.
- **The keyboard.** `ScreenScaffold` makes room for the on-screen keyboard itself (inside a Scaffold that already resizes it is 0, so nothing is double-counted). Build new pages on `ScreenScaffold` and the chat input, last form field etc. stay reachable.
- **Splash.** The native splash (generated by `flutter_native_splash` from `assets/splash/`) is sized and offset to sit exactly where the Dart `SplashScreen` draws its logo (the Dart column is centred as a whole, so its logo is 49 dp above centre); `bootstrap.dart` shows that same `SplashScreen` from the first frame, so opening the app, loading Firebase and restoring the session look like one screen.
- **Live data** comes over STOMP: lists and detail screens refetch on every push, so there is no polling loop to tune.
- **Shift location sharing** starts when the shift screen is visible while on shift, is throttled to one update per 15 s, can be paused, and is foreground-only.
- **Biometric unlock** (Settings, off by default): when on, the app locks when opened with a saved login and after 2 minutes in the background, and unlocks with fingerprint / face or the device PIN. The lock screen always offers the emergency numbers and *Log out*, so it can never trap a bystander who needs to call for help. Manually logging in never shows it. All use of the `local_auth` plugin is isolated in `core/security/biometric_authenticator.dart`.
- **Notifications and push.** Every role has an inbox (`/notifications`, live over STOMP, paged, read/unread). Push goes through Firebase Cloud Messaging (free on the Spark plan; the backend sends via the Admin SDK). The device registers after sign-in and again when the language changes; sign-out unregisters it first. Pushes that arrive while the app is open show as an in-app banner; taps (even from a cold start) open the right screen via `core/push/notification_routes.dart`. The Settings switch registers/unregisters the device and reports when the OS is blocking notifications. Android channels `najda_urgent` (mission offers, new incidents) and `najda_updates` are created in `MainActivity.kt`.
- **Identity verification** (`features/kyc/`). The Account tab (citizens and responders) has an Identity card with the status badge; *Verify* asks the backend for a hosted Didit page and opens it in the phone's browser. The result never comes from that page: it comes back through the backend, and the app re-checks when it returns to the foreground and every few seconds while the provider is working. When the server requires verification (`GET /api/kyc/status` -> `required && !verified`) the SOS and quick-report buttons open the identity screen instead (with 122 / 123 / 180 on it) and the home screen shows a banner. The server still enforces the rule (403), so this is explanation, not security. A missing `/api/kyc/status` (older backend) simply hides all of it.
- **Maps.** Markers are symbols (not circle annotations: those swallow taps) with an icon and a colour per kind, the web's palette: incident = red pin, your unit = blue, your base = purple (a home marker when the base is a station), hospitals = selected blue / base purple / recommended green / other grey (base wins over recommended), each unit type its own colour on the citizen map (never the incident's red). The hospital picker draws only the recommended hospitals, your base, the selection and the incident, redraws only when that content changes, and flies to whatever you select (from the map or the list). A responder's route starts at **this phone's GPS** (`core/location/own_position.dart`), falling back to the unit's reported position; route states are honest (calculating / unavailable + retry / a lighter straight line). The mission map's destination follows the mission: the incident, then the chosen hospital.
- **Arrival estimate** for citizens (`incident/domain/responder_eta.dart`) uses the same model as the web (`lib/dispatch/eta.ts`): road circuity, speed by trip length, priority bonus, turnout minute. It is an estimate and presented as one.
- **Status pill.** When the backend is slow, degraded or unreachable (or the phone is offline), a small pill floats at the top of the app; it never pushes content down, and tapping it opens the System status page.
- **RTL is real**: switching to Arabic mirrors the whole app instantly. Digits (phone numbers, coordinates) stay left-to-right.
- **Responsive**: layouts adapt to small phones, large phones and tablets (content is centred up to 600 dp), and text scaling is capped at 1.3x so nothing breaks at the largest accessibility sizes.

### Reports that survive a bad connection

1. **Drafts.** The report form (category, text, injured count, who it is for, medical-sharing choice, photos / videos / recordings) is saved to disk as you type. Attachments are copied into the app's own storage, never the OS cache.
2. **Outbox.** Pressing *Send* first writes the report (and its media) to disk, then tries the network. No connection -> it is queued and a banner on the home screen shows its state with *Send now* / *Discard*.
3. **No duplicate reports.** Every report carries a random `clientRequestId`; the backend returns the original incident for a retry. Against an older backend, a `409` is reconciled against "my reports" before giving up. A `429` (caller-trust cool-down) is shown to the person, never retried on a timer.
4. **Fast.** As soon as dispatch HAS the report the form says "sent"; photos and recordings upload in the background (banner "Uploading your evidence"). It never claims "no connection" once the incident exists.
5. **Resumable uploads, no duplicate files.** Each attachment is three remembered steps: slot -> file into storage -> register. A retry resumes at the failed step; a file already in storage is never sent again. The register response is **never parsed** (a 2xx means done): parsing it used to throw after a successful upload, which the outbox mistook for a failure and re-uploaded forever. An unexpected (non-network) error gives up on that ONE attachment immediately; transient errors give up after 3 attempts. The report itself is never lost.
6. **Polite.** Retries run when the connection returns, when the app resumes, and on a 30 s timer with exponential backoff (30 s -> 5 min). A report older than 30 minutes asks before sending. Test builds show *why* it is waiting on the banner.

**Who is the report for?** The first question on the form is *Me / Someone else*. For someone else the reporter's medical profile is never shared (the server enforces it), and responders see a "reported for someone else" notice on the mission.

> **Backend dependency.** The idempotent submit (`V2`) and the media register returning a DTO and being idempotent by path are in the backend; keep them deployed before the app.

### Medical profile

Matches the web: date of birth, weight (1-500 kg, one decimal), blood type, allergies and conditions with an explicit *none known*, medications, notes, up to three emergency contacts (valid Egyptian mobile numbers), and standing consent to share with responders. It is offered once after registration (skippable), lives in *Account -> Medical*, is flagged for review after six months, and the report form lets a citizen withhold it for one report ("this is for someone else"). Responders see it for the incident they are treating; the server decides who may, and a 403 simply hides the panel.

### Evidence

Photos, videos and voice recordings can be attached before sending and previewed in full screen (zoomable photos, a scrubbable video player, a playable recording) both before and after they are uploaded.

## Release and CI

| Workflow | Trigger | Result |
|---|---|---|
| `release-mobile.yml` | push a tag `v*` | builds the **production** APK, attaches `najda-vX.Y.Z.apk` and a stable `najda-latest.apk` to a GitHub Release |
| `build-mobile-test.yml` | manual (Actions → Run workflow) | builds the **qa** APK, uploads it as a private artifact for 7 days — nothing is released |
| `mobile-ci.yml` | PRs touching `mobile/` | `flutter analyze` |

Repository secrets:

| Secret | Content |
|---|---|
| `MOBILE_ENV_PRODUCTION` | the full text of `.env.production` |
| `MOBILE_ENV_TEST` | the full text of `.env.test` |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 your-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | the keystore credentials |

**Keep the signing key.** Android only installs an update if it is signed with the same key as the installed app. To let people who installed the old Expo APK upgrade in place, reuse the EAS-managed keystore (`eas credentials` → Android → production → download keystore) as `ANDROID_KEYSTORE_BASE64`. If you sign with a new key, users must uninstall first.

`versionCode` is `GITHUB_RUN_NUMBER + 100`; raise the offset in `release-mobile.yml` if you ever published a higher code.

## Firebase / Google console checklist (per flavor application id)

1. **Google Cloud → Credentials**: for each application id you build (`com.najda.mobile`, `.test`, `.local`) create an *Android* OAuth client with that package name and the SHA-1 of the key that signs it (CI keystore for production; the debug key for `local`/`qa`). Google Sign-In fails with a developer error otherwise.
2. **Restrict `FIREBASE_ANDROID_API_KEY`** to those package names + SHA-1s (native Firebase calls present the app's signature, not a web referrer).
3. **Phone verification on real devices**: register each Android application id in the Firebase project (with its SHA-1 *and* SHA-256) and put the resulting App ID in `FIREBASE_ANDROID_APP_ID`.
4. `GOOGLE_WEB_CLIENT_ID` is the *web* OAuth client id (the audience Firebase verifies).

## Parity with the web app

Done: structured addresses · responder reporting (Home tab) with a Shift & Missions tab · e-mail-OTP registration with full profile · Google sign-in / sign-up · login / forgot password · account tabs (profile, e-mail change, phone change + native verification, password, medical profile) · app settings · notifications inbox + push (FCM) · SOS and quick reports with evidence capture, drafts, location rules and the offline outbox · my reports, live tracking with responder ETAs, injured-count edit, cancel with reason · incident chat · shift (start / join / leave / end, crew, pause + reset-to-facility) · missions (accept, reject, en route, arrived, complete, withdraw) with route map and teammates · ambulance hospital handoff with vitals · patient medical profile for treating crews · become a responder (document rules, history with reasons, draft) · about / privacy / terms / support / system status · English + Arabic.

Intentionally not on mobile: the Dispatcher, Hospital, Facility-manager and Admin consoles.

Roadmap:

1. iOS push (needs an APNs key in Firebase and the Push capability) and the iOS project, signing and store release (biometrics will also need `NSFaceIDUsageDescription` in `Info.plist`).

## Testing

```bash
flutter gen-l10n
flutter analyze
flutter test          # geo/boundary maths, draft + outbox models, medical profile, document rules
```

Manual checks worth doing on a real phone before a release:

- **Offline outbox:** airplane mode -> send a report with a photo and a recording -> banner shows *Waiting to send* -> airplane mode off -> it delivers and the home screen shows the active report.
- **Draft:** type a report, change the category to *Fire*, force-quit, reopen -> everything (including the category) is back.
- **Location radius:** with manual pins allowed, tap inside the circle (pin moves) and outside it (message, pin stays).
- **Signed in:** kill and reopen the app -> still signed in; sign in once and check the password manager offers to save.
- **Languages / sizes:** switch to Arabic, try a small phone and a tablet, and the largest system font size.
- **Evidence:** report with a photo and a recording -> the form says *sent* at once, the banner says *Uploading your evidence*, each file exists ONCE on the incident afterwards.
- **Responder:** sign in as a first responder -> Home shows the SOS screen (not a spinner), a report can be filed, and the shift screen has one *Start shift* / *End shift*.
- **Keyboard:** open the incident chat, login, register, account and medical forms and type: the input stays visible.
- **Hospital picker:** only recommended + your base + selection are drawn; picking from the list flies the map; the map does not flicker.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "No Material widget found" / yellow underlines | A page rendered outside `ScreenScaffold` (it provides the Material surface) |
| Location pin can't be moved | The server has manual pins off (`najda.incident-location.allow-manual-pin`) or you tapped outside the radius |
| Report refused with "active emergency" | One active report per citizen is enforced by the backend |
| Signed out after reinstalling or switching flavor | Sessions are per application id; a different flavor is a different app |
| `PlatformException(channel-error ...)` from `FirebaseCoreHostApi.initializeCore` at start-up | The Firebase package family is mismatched (see *Dependency pins*); `flutter pub deps` shows core 3.15.0 instead of 3.15.2 |
| White launch screen | The native splash was never regenerated: `dart run flutter_native_splash:create` |
| A responder's report form / Home spins forever | Something in the report pipeline is gated on `Role.citizen` instead of `Role.canFileReports` |
| "Your unit's location isn't available" | Fixed: the route starts at the phone's GPS; if location is off, turn it on |
| The keyboard covers an input | A page is not built on `ScreenScaffold` |
| Media tile shows a refresh icon | Tap to retry; test builds print the HTTP status / error on the tile |
