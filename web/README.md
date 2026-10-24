# NAJDA — Web

The Next.js console every role signs into — citizen emergency reporting, dispatch, responder, hospital, and admin, all from one codebase, scoped per role, in English or Arabic.

## Stack

- **Next.js** (App Router) — server and client components, no `middleware.ts`; route protection is handled client-side by `AuthGuard`/`RoleProtectedRoute`/`ProfileGate`, with the backend's own authorization as the real boundary
- **TanStack Query** — server state, cache invalidation, WebSocket-driven live updates layered on top of it
- **Zustand** — local auth/UI state
- **Tailwind CSS v4** — including logical (`start`/`end`) utilities throughout, for correct mirroring under Arabic
- **next-intl** — English/Arabic, cookie-based locale (no `/en`/`/ar` URL prefixing — this is an authenticated tool, not a publicly indexed site)
- **MapLibre GL + OpenFreeMap tiles** — every live/interactive map in the app
- **Firebase (client SDK)** — email/password and Google sign-in, ID token issuance; **Firebase Cloud Messaging** for browser push notifications (free on the Spark plan), via a service worker in `public/firebase-messaging-sw.js`
- **EmailJS** — the Support page's outbound message, gated by a server-side rate-limit check first

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Everyone | Landing page |
| `/login`, `/register` | Public | Sign in; register with email + password (email address verified by a one-time code) or Google |
| `/account` | Any signed-in user | Tabbed: **Account** (personal info and structured address, and the identity-verification card with its badge), **Security** (contact information — email and phone change/verification — then the password), **Medical** (optional medical profile) |
| `/emergency` | Citizen | Submit an incident, track it live (including responding units), cancel with a reason, add evidence, view history |
| `/incidents/[id]` | Anyone who was ever involved | Read-only historical view of a closed incident |
| `/become-a-responder` | Citizen (verified) | First-responder application: motivation plus supporting documents (checked for type and size before sending), with earlier applications and any rejection reason shown above the form |
| `/kyc/return` | Any signed-in user | Where Didit sends the person back to after verifying: checks the real result with the backend |
| `/notifications` | Any signed-in user | The notification inbox: live, paged, read/unread, with the browser-notifications switch |
| `/dispatch` | Dispatcher+ | Queue, active incidents, live map, unit assignment |
| `/responder` | Responder roles | Shift management, mission lifecycle, hospital-transfer flow |
| `/hospital` | Hospital staff, hospital managers, admins | Incoming transfers, live vitals, the ambulance's route and ETA to this hospital |
| `/manager` | Facility manager | The manager's workspace: units (add / rename / delete-or-retire with a warning) and staff (add / disable / enable) of their one facility; a hospital manager also gets a link to `/hospital` |
| `/admin`, `/admin/facilities`, `/admin/units`, `/admin/incidents`, `/admin/applications` | Admin+ | Full account/facility/unit/incident/application management, including Firebase↔database reconciliation |
| `/support`, `/terms`, `/privacy`, `/about` | Everyone | Static/utility pages |
| `/status` | Everyone | Backend status: API health, response time, last check |

## What each role actually gets

- **Citizen** — SOS submission with photo/video/audio evidence and the citizen's live GPS location (a manual pin only if the backend enables it, and only within a small radius of the GPS fix; always inside Egypt), live incident tracking on an interactive map that shows the responding units (police positions withheld) with reverse-geocoded address, in-context chat with whoever's responding, evidence that can still be added after help is assigned, a cancel flow with a required reason (until a unit arrives), and a browsable history of past emergencies. An optional medical profile (blood type, allergies, conditions, medications, up to three emergency contacts) can be added right after registering or any time from the account page; with the citizen's consent it is shared with responders for emergencies they report, and can be withheld per report when they're calling for someone else.
- **Dispatcher** — a single live operations map (also the admin's incident map: it shows each ambulance's route to its hospital in purple, with a per-trip arrival time) showing every incident-relevant unit with per-mission route coloring, click-to-select unit assignment sorted by real distance and filterable by type, AI priority and duplicate-suggestion review, full chat/media visibility, "also viewing" presence and "assigned by" attribution so colleagues don't duplicate each other, caller-history context, and the ability to mark a report as a false report. When the patient has shared it, the incident panel also shows their medical profile.
- **Responder roles** — shift start/join/leave/end scoped to their own facility (or, for ambulance/first-responder, unrestricted), live GPS location sharing with real status feedback and a one-tap reset to the facility location, a live map to the incident with driving or straight-line route options, zoom/re-center controls and a toggle showing the other units on the same incident (each in its own route color), incident chat, and — for ambulance crews — a full hospital-selection flow: distance-ranked recommendations, a searchable full list, and hover/click selection directly on the map with own-facility and recommended indicators. Ambulance and first-responder crews also see the patient's medical profile on an accepted mission, when it has been shared.
- **Facility manager** — runs ONE facility: its units (the unit type is fixed by the facility type) and its staff accounts (the role is limited by the facility; the account is created at that facility). Deleting a unit warns first and, when the unit has mission history, retires it instead of erasing the record. A hospital manager also works the transfers dashboard. All limits are enforced by the backend; this screen only reflects them.
- **Hospital staff** — incoming-transfer list with a live map of the inbound unit and real-time vitals as they're radioed in. The patient's medical profile appears alongside them when shared.
- **Admin** — account lifecycle (including the one-way Super-Admin-only protections and Firebase↔database drift detection and repair (including creating a Firebase account for a database-only user), facility CRUD with OSM seeding and address backfill, unit CRUD scoped to matching facility types (first-responder units show their owner), full incident history and moderation (delete, duplicate marking, forced completion, false-report marking and clearing, cancellation reasons), a callers-to-review list with manual suspend/re-enable, and first-responder application review.

## Notifications

Every signed-in user has a **bell** in the header (live unread count, preview of the latest notifications, mark-all-read) and a full inbox at `/notifications`. Notifications are written by the backend in English and Arabic and shown in the user's language; clicking one marks it read and opens what it is about (`lib/notifications/routes.ts` maps type + role to a page). What each role is told — new incidents and unit rejections for dispatch, mission offers for crews, progress updates for citizens, patient-incoming for hospitals, new applications for admins — is documented in the backend README.

With the user's permission the browser also receives **push notifications while the site is closed or in the background** (Firebase Cloud Messaging; works on Chrome, Edge, Firefox and Safari 16.4+ installed to the home screen; HTTPS or `localhost` only). The switch lives in the bell panel and on `/notifications`.

## Live updates

All live screens share **one self-healing STOMP connection** (`lib/ws/hub.ts`): heartbeats both ways (the backend answers them), every subscription restored after a reconnect, and registered `onReconnect` listeners that refetch whatever could have been missed (also when a long-hidden tab becomes visible). Use `useLiveInvalidation(topic, queryKey)` for anything that should refresh when the backend publishes; do not open sockets yourself and do not add polling for data that has a topic. Lists that pair a topic with `refetchInterval` use a slow interval only as a safety net. A page that shows an incident must pass `{ live: true }` to `useIncident` (the incident page once did not, and never updated).

## Arrival times

`lib/dispatch/eta.ts`: straight-line distance is converted to road distance (x1.35), speed depends on trip length (28 km/h under 3 km up to 60 km/h beyond 25 km) with a priority bonus for emergency vehicles, plus one turnout minute. When a real driving route can be fetched (`useRouteEta`, OSRM with a second public router as fallback) its time (+15% congestion) is used instead and labelled "by road". Shown for candidate units, for every unit travelling to an incident (not only before assignment), and for each ambulance-to-hospital trip. The constants are judgement for a dense city, not measurements: tune them against real accepted-to-arrived times. The public OSRM servers are free community services; self-host before relying on them in production.

## Addresses

`lib/address/address.ts` + `components/Shared/AddressFields.tsx` are the single structured-address implementation (governorate dropdown in English/Arabic, city, street and building, optional landmark), used by register, complete profile, account, and the admin screens. Validation matches the backend's exactly. Users who only have the old single line get it prefilled into "street".

## Admin facilities table

The table is **paged and filtered on the server** (`/api/facilities/page`, 25 per page; `useFacilitiesPage` accepts both Spring page shapes). The map next to it shows every facility that matches the filters, loaded once (`useFacilities`). Edits patch the cached row (`useUpdateFacility`) instead of re-downloading the list.

## Identity verification

`components/Kyc/*`, `hooks/kyc/useKyc.ts`, `lib/kyc/kyc.ts`. The Account tab has an **Identity card** (status badge, what it means, Verify / Continue / Try again); the badge also sits next to the role in the account header and in the admin user view. *Verify* asks the backend for a hosted Didit page and navigates to it; Didit sends the person to `/kyc/return`, which shows the backend's real status (the URL's own parameters are never trusted) and re-checks every 3 s while the provider is working. When the server requires verification and the person has not got it, `/emergency` shows `KycGate` instead of the SOS screen, always with the emergency numbers (122 / 123 / 180): the server enforces the rule (403 `KYC_REQUIRED`), the gate only explains it. Admins can mark a user verified or reset them from the user modal (audited): for testing and as the fallback when the scanner cannot read an ID. *Reset* also deletes the person's sessions at Didit, so they can verify again cleanly. Nothing is blocked until the backend's `KYC_REQUIRED=true`.

## Docker

The root `docker-compose.yml` builds this app (`web/Dockerfile`, Node 22, non-root, health-checked). **`NEXT_PUBLIC_*` values are build arguments**: they are compiled into the browser bundle, so they come from the root `.env` and a change needs `docker compose up --build web`. The server-side Firebase Admin credentials come from `web/.env` at run time. The image re-runs `postinstall` in the build stage (it copies MapLibre's worker files into `public/maplibre`); without that the maps cannot load their worker in a container. If the build fails with "package.json and package-lock.json are not in sync", run `npm install` in `web/` and commit the lockfile.

## Environment variables

```
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_WS_URL=                        # ws:// locally, wss:// in production — must be reachable from the browser, not an internal Docker hostname

# Firebase client config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Browser push (Firebase console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=            # the public key; without it push stays off and everything else works

# Support page (EmailJS)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```
Manual-pin behaviour is switched on the backend (`INCIDENT_ALLOW_MANUAL_PIN`, see the backend README), not here; the web app reads it from `/api/config/incident-location`.

## Running locally

**Via Docker (recommended)**, from the repository root (see the root README for the three env files):
```bash
docker compose up --build
```

**Manually:**
```bash
npm install
npm run dev
```

## Internationalization

Locale is stored in a cookie (`NAJDA_LOCALE`), read server-side on every request via `i18n/request.ts`, and switchable at any point from the header without a page reload. `dir="rtl"`/`dir="ltr"` is set on `<html>` based on the active locale — components should prefer Tailwind's logical utilities (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`) over physical ones (`ml-`/`mr-`/`text-left`) so they mirror automatically; anything that should *never* mirror regardless of language (numeric metrics, phone number digits, generated links) gets an explicit `dir="ltr"` wrapper instead of relying on the ambient direction.

Enum-backed display strings (categories, statuses, roles) are translated through dedicated `messages/*.json` namespaces via small helper functions in `lib/dispatch/format.ts` (`categoryLabel`, `incidentStatusLabel`, `unitTypeLabel`, etc.) rather than hardcoded label maps — if you're adding a new status or role, add its translation key alongside the enum rather than a plain object literal.

`lib/auth/errors.ts` and `lib/auth/error-messages.ts` map Firebase auth error codes to translated messages, but take the translator as an explicit parameter rather than calling a hook internally — both are plain functions, not components, so every call site passes its own `useTranslations("auth.errors")` result through.

## A few things worth knowing before extending this

- **Never build a Supabase URL by hand on the frontend.** Every media reference goes through a signed-download-URL hook (`useMediaDownloadUrl`, `useApplicationDocumentUrl`) that re-authorizes on each fetch — the bucket is private, and a stale or hand-built URL simply won't work.
- **`apiFetch` handles empty-body success responses** (both `204` and a `200` with nothing written) — don't assume every mutation response is JSON-parseable without checking; the shared client already does this correctly.
- **Live data uses WebSocket-driven invalidation; polling is the exception.** `useLiveInvalidation(topic, queryKey)` is the standard way to make a query live: it subscribes to a STOMP topic and invalidates the query on each event (`useIncident({ live: true })`, `useIncidentMissions`, `useIncidentResponders`, and `useIncidentPresence` use it; `useAvailableUnits`/`useIncidentQueue` follow the same pattern). A handful of operational hooks still poll with `refetchInterval` — hospital transfers and vitals (5 s), active (5 s) and all (10 s) incident lists, `useMyShift` (10 s), `useCrewForUnit` (15 s) and `useMyMissions` (5 s). New live data should use `useLiveInvalidation`, not another interval.
- **A facility-type dropdown should filter to what's actually relevant for the context it's in** — e.g. a unit's home-station picker should only ever offer facilities matching that unit's type (with ambulance being the one deliberate exception, since it may be based at either an ambulance station or a hospital). Don't reuse an unfiltered "all facilities" list where a scoped one is what the UI actually needs.
- **Registration is a verify-then-create flow.** `RegisterForm` drives the `useEmailOtp` hook (idle → sent → verified): the backend emails a 6-digit code, verifying it returns a one-time `verificationToken`, and only then does the form submit the full profile (name, email, password, phone, address, gender) in a single request. Nothing exists in Firebase or the database until that final call succeeds, so the new account is already profile-complete and never passes through `CompleteProfileForm` — that form now only serves accounts created without a password (Google). Editing the email field resets the verification, since a token only ever applies to one address.  After a successful sign-up on either path, `MedicalOnboardingGate` shows a skippable medical-profile step (see below).
- **Register-form errors are mapped by HTTP status, not message text:** `409` email already registered, `422` phone already verified on another account, `429` rate-limited or too many wrong codes, `403` verification expired, `503` email provider unavailable. Each has its own `auth.register` translation key; anything unmapped falls back to `resolveAuthError`.
- **The backend status indicator runs its own polling loop, separate from the data hooks above.** `useBackendStatus` hits `/api/status` every 60 seconds (backing off to 30 seconds on failure) so the footer pill, the banner, and `/status` can show whether the API is up, cold-starting on a free-tier host, or degraded because a dependency is down. A JSON response means the server answered and reports per-component state; a response with no JSON body (a proxy error) is treated as a cold start. Only one browser tab polls at a time: a Web Locks leader broadcasts results to the others over `BroadcastChannel`. Don't add a second health poll elsewhere, read from this hook instead.
- **Citizen-facing live data stays minimal.** The citizen's incident map reads `/api/incidents/{id}/responders` and listens only to the per-incident topic. Never feed it from `/api/units` or `/topic/missions` — they carry data a citizen shouldn't consume.
- **One capture bar for evidence.** `MediaCaptureBar` (Photo / Video / Audio / Upload) is used by both the emergency form and the post-submit panel; `useAudioRecorder` owns `MediaRecorder`. The camera tiles only render on touch devices, since `capture` is ignored on desktop.
- **Dispatcher coordination is advisory.** `useIncidentPresence` sends a heartbeat every 15 seconds while an incident panel is open and the tab is visible; missions show who assigned them; version conflicts come back as a 409 with a "refresh and try again" message, and `useAssignUnit` refreshes dispatch state on failure as well as success.
- **Caller flags are context, not verdicts.** `CallerHistoryNotice`, `FlaggedCallersPanel` and `FalseReportSection` inform human decisions; nothing is applied automatically, and suspension is only ever a manual admin action. Cancellation and false-report labels live under `enums.cancellationCategory` and `enums.falseReportType`.
- **Location rules come from the backend, not the client.** `useIncidentLocationConfig` reads `/api/config/incident-location` (whether a manual pin is allowed, its radius, and Egypt's outline) and `lib/geo/location.ts` runs the same polygon test the server does, so the form can explain a refusal before sending anything. `EmergencyMap` is GPS-first: it asks for the device location on load, shows no pin until there is a real fix, and allows a manual pin only when enabled and inside the radius circle it draws around that fix. The request carries the device's own coordinates (`deviceLatitude`/`deviceLongitude`) so the server can re-check the pin. Don't reintroduce a rectangular "Egypt box" on the client — the polygon is the source of truth, and `isWithinBoundary` deliberately lets an unusable outline through so the server, which always validates, decides. If no location can be obtained, the map shows the emergency numbers (122 police, 123 ambulance, 180 fire).
- **The Account page is small cards behind an accessible tab bar.** `AccountFeed` composes `components/ui/Tabs` (WAI-ARIA tabs; arrow/Home/End keys are mirrored under RTL; every panel stays mounted and is only hidden, so unsaved form input survives a tab switch) with `AccountCard`, `DetailItem`, `FormActions`, `EditButton`, `VerificationBadge` and the shared class strings in `components/Account/styles.ts`. Email and phone changes live in `EmailSection` / `PhoneChangeSection` on the Account tab. A new account section should be a new card (and a tab, if it warrants one) built from these, not another large form component.
- **The medical profile is optional, and "none known" is a real answer.** Option lists and limits live in `types/medicalProfile.ts` (`MAX_EMERGENCY_CONTACTS` and `MAX_NOTES_LENGTH` mirror the backend's `@Size` limits); empty/stale/age helpers live in `lib/medical/profile.ts`. `MedicalProfileCard` → `MedicalProfileForm` edits it; `MedicalProfileDetails` renders it read-only and is shared with the responder-facing panel, so keep it presentation-only. `noKnownAllergies` / `noKnownConditions` are explicit states, distinct from an empty list ("nothing provided") — don't collapse them. Adding an allergy, condition or contact relationship means the TS constant, the backend enum, the database `CHECK` constraint and both `enums.*` locale blocks, together.
- **After registering, an optional medical step appears once.** `RegisterForm` sets `medicalOnboardingPending` in the auth store; `MedicalOnboardingGate` (mounted inside `ProfileGate`, so a Google sign-up completes its required profile first) shows `MedicalOnboarding` until the user saves or skips. It is a gate rather than a route so the register page's `AuthGuard` redirect can't race it. The flag is in-memory and cleared by `reset()` on logout: a hard reload mid-step simply skips it, since the same form lives on the Account page.
- **Viewing a patient's medical profile is an audited read — never poll it.** `PatientMedicalProfilePanel` (dispatcher incident detail, responder mission detail, hospital transfer detail) calls `GET /api/incidents/{id}/medical-profile`, and every successful response writes an audit-log row on the server. `useIncidentMedicalProfile` therefore uses its own query-key root (so broad `["incidents"]` invalidations don't trigger extra reads), a `staleTime`, and no refetch on focus/reconnect/retry. Access is decided by the server: a 403 (a fire crew, an admin, a closed incident) makes the panel render nothing rather than an error. Don't add `useLiveInvalidation` or a `refetchInterval` to it.
- **Citizens can withhold their profile per report.** `MedicalSharingToggle` appears on the emergency form only for users who have given standing consent on their profile, and sends `shareMedicalProfile` on submit (unchecked = "this is for someone else"). The server combines it with the stored consent, so the client flag can only narrow sharing, never widen it.
- **Phone rules are enforced on both sides.** `isValidEgyptianMobile` (`PhoneField`) and the backend's `@EgyptianMobile` validator use the same pattern; change them together.
- **Notification hooks all hang off one query-key root.** `useUnreadNotificationCount` (always mounted, via the header bell) subscribes once to `/topic/users/{id}/notifications` and invalidates everything under `["notifications"]` — the count and the list alike. Don't add another subscription or a polling interval for notifications. The list is only fetched when the bell panel or the inbox page is open.
- **Push registration is split on purpose.** Asking for permission must come from a click, so only `PushPrompt` / `usePushNotifications.enable()` ever does it. `PushSync` (mounted in `providers.tsx`) never asks: it silently keeps the browser registered while someone is signed in, permission is granted and they haven't opted out, and re-registers when the language changes (the backend writes each push in the device's language). `lib/notifications/device.ts` is the only code that talks to `/api/notifications/devices`; `useLogout` unregisters the device before signing out so a shared computer never shows the next person someone else's alerts.
- **The service worker can't read env vars**, so the (public) Firebase web config reaches `public/firebase-messaging-sw.js` on its registration URL (`lib/firebase/messaging.ts`). If you change the Firebase config shape, change both. The worker only boots the SDK and decides what a click does — the backend sends a `notification` payload, so the browser draws it. Everything in `lib/firebase/messaging.ts` is loaded lazily and browser-only.
- **Notification text is never composed on the client.** Show `pickText(notification.title, locale)` from what the server stored; a new notification type needs its text in the backend's `NotificationMessages` and a case in `notificationHref`, not a translation key here.
- **The web app doesn't send a `clientRequestId`** with new incidents (it has no offline queue); the backend field is optional. If you add double-click protection, generate one id per submission (`crypto.randomUUID()` without the dashes) and send it as `clientRequestId`.
- **Completing a profile is one request.** `CompleteProfileForm` calls `useCompleteProfile` (`PATCH /api/users/me/complete-profile`) once, inside a `try` that always surfaces a failure. Don't split it back into separate profile and phone calls: they used to be sequential here and were racy on mobile, and the backend now guarantees atomicity only for the single request.
- **One address implementation.** Never add a free-text address input: use `AddressFields` and send `addressDetails` (`toAddressPayload`).
- **Role lists live in `lib/auth/roles.ts`** (`ROLE_CONFIG`, `*_ROLES`). A new role also needs `lib/facility/policy.ts` if it is facility-bound, the `enums.role` translation, and a home route. `HOSPITAL_ROLES` includes `FACILITY_MANAGER` because the server decides by facility.
- **Account tab order matters.** Contact information (email, phone) lives under *Security*, above the password; keep how-you-sign-in together.
- **Cached lists must be patched, not just invalidated, after an edit** when the list is large: `setQueryData` / `setQueriesData` from the mutation's response, then `invalidateQueries(..., { refetchType: "none" })`.
