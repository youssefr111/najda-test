# NAJDA — Mobile (Flutter)

The companion app for the two roles that work from the field — **Citizen** (report, track) and **Responder** (shift, missions) — talking to the same Spring Boot backend and Firebase project as the web console. Dispatcher, Hospital Staff and Admin stay on the web.

Android APK is built by CI on every `v*` tag. iOS is not configured yet (the Dart code is platform-neutral; only the platform folder and signing are missing).

## Stack

| Concern | Choice |
|---|---|
| Framework | Flutter (stable ≥ 3.35, Dart ≥ 3.9) |
| State | Riverpod 2 (`Notifier` / `StreamProvider`, no code generation) |
| Routing | go_router — `StatefulShellRoute` tabs, one `redirect` function owns every guard |
| Networking | Dio behind a small `ApiClient` (Firebase ID token, timeouts, `ApiException`) |
| Identity | `firebase_auth` + `google_sign_in`; Firebase initialised from the env file, no `google-services.json` |
| Maps | `maplibre_gl` with the same OpenFreeMap style as the web app |
| i18n | `flutter_localizations` + ARB (English / Arabic), full RTL mirroring |
| Config | `flutter_dotenv`, one env file per **flavor**, only the matching one is bundled |

## Flavors and env files

| Flavor | Env file | Android id | Use |
|---|---|---|---|
| `local` | `env/.env.local` | `com.najda.mobile.local` | everyday development |
| `qa` | `env/.env.test` | `com.najda.mobile.test` | your own test APK, never released |
| `production` | `env/.env.production` | `com.najda.mobile` | the released app (same id as the old Expo app) |

> The test flavor is named `qa` because the Android Gradle Plugin rejects flavor names that start with "test". Its env file, application id and app label still say "test".

All three env files are git-ignored. `env/.env.example` is the template (every key is documented in it). Missing values fail loudly on launch with a screen that names the keys, instead of a silent 404 later. Because `pubspec.yaml` declares each env file with a `flavors:` filter, **a production APK never contains the test or local configuration.**

## First-time setup

```bash
# 1. Install Flutter >= 3.35 and accept the Android licences (flutter doctor).
# 2. Generate the Android project and apply the flavor/signing overlay:
./scripts/setup_android.sh
# 3. Fill in the env file(s) you need:
cp env/.env.example env/.env.local          # then edit
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
  main.dart / bootstrap.dart / app.dart     entry point, config + Firebase init, MaterialApp.router
  core/
    config/       Flavor enum, typed AppConfig loaded from the flavor's env file
    network/      ApiClient (Dio), ApiException, JSON narrowing helpers
    router/       app_router.dart (all routes + redirect guards), app_shell.dart (bottom tabs)
    theme/        palette ThemeExtension, ThemeData, raw colours
    l10n/         locale + theme controllers, enum -> translated label functions
    location/     permission + one-shot fix + position stream
    routing/      OSRM driving routes
    widgets/      UI kit (buttons, fields, cards, badges, states, dialogs)
    utils/        validators, wire-enum mapping, polling stream, error -> message mapping
  features/
    auth/         login, register (email OTP), complete profile, session controller
    account/      profile, email change, phone change + verification, password
    incident/     citizen: SOS report, my reports, detail, cancel, live responder map
    responder/    missions, mission detail + route map, shift (+ location sharing)
    legal/        about, privacy, terms, support
    map/          MapLibre widgets
  l10n/arb/       app_en.arb, app_ar.arb  (generated Dart output is git-ignored)
```

Each feature folder is `data/` (repositories, the only code that knows URLs) → `application/` (Riverpod providers/controllers) → `presentation/` (screens, widgets) with plain Dart models in `domain/`.

## Behaviour worth knowing

- **Registration is verify-then-create**, identical to web: send a 6-digit code → verify it (returns a one-time token) → one request creates the Firebase + database account with phone, address and gender, so the profile is complete at signup. `CompleteProfileScreen` only serves Google sign-ups.
- **The router is the only place that decides where you may be**: signed-out → login; profile incomplete → complete-profile; responder roles → `/responder/*`; everyone else → `/citizen/*`. Desk roles (dispatcher, hospital staff, admin) can sign in and get the citizen experience.
- **Live data is polled** (missions 5 s, incident 5 s, shift 10 s, history 15 s) only while a screen is watching it; failures recover on the next tick. WebSocket push is on the roadmap below.
- **Shift location sharing** starts when the shift screen is visible while on shift, is throttled to one update per 15 s, can be paused, and recovers from failed updates. It is foreground-only.
- **RTL is real**: switching to Arabic mirrors the whole app instantly (no restart). Digits (phone numbers, coordinates) are forced left-to-right.

## Release and CI

| Workflow | Trigger | Result |
|---|---|---|
| `release-mobile.yml` | push a tag `v*` | builds the **production** APK, attaches `najda-vX.Y.Z.apk` and a stable `najda-latest.apk` to a GitHub Release |
| `build-mobile-test.yml` | manual (Actions → Run workflow) | builds the **qa** APK, uploads it as a private artifact for 7 days — nothing is released |
| `mobile-ci.yml` | PRs touching `mobile/` | `flutter analyze` |

Repository secrets:

| Secret | Content |
|---|---|
| `MOBILE_ENV_PRODUCTION` | the full text of `env/.env.production` |
| `MOBILE_ENV_TEST` | the full text of `env/.env.test` |
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

Done in this version: email-OTP registration with full profile · Google sign-in · login / forgot password · account (profile, email change, phone change + native verification, password) · SOS report with map pin · my reports + detail · edit injured count · cancel with reason category · live responder map for the citizen · shift (start/join/leave/end, crew, pause + reset-to-facility) · missions (accept, reject, en route, arrived, complete, withdraw) with a driving/straight route map · about / privacy / terms / support · English + Arabic.

Not in the app yet (the web has them) — planned in this order:

1. **Live updates over WebSocket** (STOMP) replacing polling.
2. **Evidence**: photo / video / audio capture and upload through the signed-URL flow, gallery with signed download links, edit of the original message.
3. **Incident chat** with the responding units.
4. **Ambulance hospital handoff**: recommendations, selection, en route / arrived, vitals log. Until then ambulance missions finish on the web.
5. **Become a responder**: application with supporting documents.
6. Teammate routes on the responder map, backend status indicator.
