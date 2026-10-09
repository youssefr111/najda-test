# NAJDA — Web

The Next.js console every role signs into — citizen emergency reporting, dispatch, responder, hospital, and admin, all from one codebase, scoped per role, in English or Arabic.

## Stack

- **Next.js** (App Router) — server and client components, no `middleware.ts`; route protection is handled client-side by `AuthGuard`/`RoleProtectedRoute`/`ProfileGate`, with the backend's own authorization as the real boundary
- **TanStack Query** — server state, cache invalidation, WebSocket-driven live updates layered on top of it
- **Zustand** — local auth/UI state
- **Tailwind CSS v4** — including logical (`start`/`end`) utilities throughout, for correct mirroring under Arabic
- **next-intl** — English/Arabic, cookie-based locale (no `/en`/`/ar` URL prefixing — this is an authenticated tool, not a publicly indexed site)
- **MapLibre GL + OpenFreeMap tiles** — every live/interactive map in the app
- **Firebase (client SDK)** — email/password and Google sign-in, ID token issuance
- **EmailJS** — the Support page's outbound message, gated by a server-side rate-limit check first

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Everyone | Landing page |
| `/login`, `/register` | Public | Sign in; register with email + password (email address verified by a one-time code) or Google |
| `/account` | Any signed-in user | Profile, email/phone change and verification, password management |
| `/emergency` | Citizen | Submit an incident, track it live (including responding units), cancel with a reason, add evidence, view history |
| `/incident/[id]` | Anyone who was ever involved | Read-only historical view of a closed incident |
| `/become-a-responder` | Citizen (verified) | First-responder application |
| `/dispatch` | Dispatcher+ | Queue, active incidents, live map, unit assignment |
| `/responder` | Responder roles | Shift management, mission lifecycle, hospital-transfer flow |
| `/hospital` | Hospital staff+ | Incoming transfers, live vitals |
| `/admin`, `/admin/facilities`, `/admin/units`, `/admin/incidents`, `/admin/applications` | Admin+ | Full account/facility/unit/incident/application management, including Firebase↔database reconciliation |
| `/support`, `/terms`, `/privacy`, `/about` | Everyone | Static/utility pages |
| `/status` | Everyone | Backend status: API health, response time, last check |

## What each role actually gets

- **Citizen** — SOS submission with photo/video/audio evidence and location (GPS or manual pin), live incident tracking on an interactive map that shows the responding units (police positions withheld) with reverse-geocoded address, in-context chat with whoever's responding, evidence that can still be added after help is assigned, a cancel flow with a required reason (until a unit arrives), and a browsable history of past emergencies.
- **Dispatcher** — a single live operations map showing every incident-relevant unit with per-mission route coloring, click-to-select unit assignment sorted by real distance and filterable by type, AI priority and duplicate-suggestion review, full chat/media visibility, "also viewing" presence and "assigned by" attribution so colleagues don't duplicate each other, caller-history context, and the ability to mark a report as a false report.
- **Responder roles** — shift start/join/leave/end scoped to their own facility (or, for ambulance/first-responder, unrestricted), live GPS location sharing with real status feedback and a one-tap reset to the facility location, a live map to the incident with driving or straight-line route options, zoom/re-center controls and a toggle showing the other units on the same incident (each in its own route color), incident chat, and — for ambulance crews — a full hospital-selection flow: distance-ranked recommendations, a searchable full list, and hover/click selection directly on the map with own-facility and recommended indicators.
- **Hospital staff** — incoming-transfer list with a live map of the inbound unit and real-time vitals as they're radioed in.
- **Admin** — account lifecycle (including the one-way Super-Admin-only protections and Firebase↔database drift detection), facility CRUD with OSM seeding and address backfill, unit CRUD scoped to matching facility types (first-responder units show their owner), full incident history and moderation (delete, duplicate marking, forced completion, false-report marking and clearing, cancellation reasons), a callers-to-review list with manual suspend/re-enable, and first-responder application review.

## Environment variables

```
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_WS_URL=                        # ws:// locally, wss:// in production — must be reachable from the browser, not an internal Docker hostname

# Firebase client config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Support page (EmailJS)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=
```

## Running locally

**Via Docker (recommended):**
```bash
docker compose up web backend postgres
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
- **Registration is a verify-then-create flow.** `RegisterForm` drives the `useEmailOtp` hook (idle → sent → verified): the backend emails a 6-digit code, verifying it returns a one-time `verificationToken`, and only then does the form submit the full profile (name, email, password, phone, address, gender) in a single request. Nothing exists in Firebase or the database until that final call succeeds, so the new account is already profile-complete and never passes through `CompleteProfileForm` — that form now only serves accounts created without a password (Google). Editing the email field resets the verification, since a token only ever applies to one address.
- **Register-form errors are mapped by HTTP status, not message text:** `409` email already registered, `422` phone already verified on another account, `429` rate-limited or too many wrong codes, `403` verification expired, `503` email provider unavailable. Each has its own `auth.register` translation key; anything unmapped falls back to `resolveAuthError`.
- **The backend status indicator runs its own polling loop, separate from the data hooks above.** `useBackendStatus` hits `/api/status` every 60 seconds (backing off to 30 seconds on failure) so the footer pill, the banner, and `/status` can show whether the API is up, cold-starting on a free-tier host, or degraded because a dependency is down. A JSON response means the server answered and reports per-component state; a response with no JSON body (a proxy error) is treated as a cold start. Only one browser tab polls at a time: a Web Locks leader broadcasts results to the others over `BroadcastChannel`. Don't add a second health poll elsewhere, read from this hook instead.
- **Citizen-facing live data stays minimal.** The citizen's incident map reads `/api/incidents/{id}/responders` and listens only to the per-incident topic. Never feed it from `/api/units` or `/topic/missions` — they carry data a citizen shouldn't consume.
- **One capture bar for evidence.** `MediaCaptureBar` (Photo / Video / Audio / Upload) is used by both the emergency form and the post-submit panel; `useAudioRecorder` owns `MediaRecorder`. The camera tiles only render on touch devices, since `capture` is ignored on desktop.
- **Dispatcher coordination is advisory.** `useIncidentPresence` sends a heartbeat every 15 seconds while an incident panel is open and the tab is visible; missions show who assigned them; version conflicts come back as a 409 with a "refresh and try again" message, and `useAssignUnit` refreshes dispatch state on failure as well as success.
- **Caller flags are context, not verdicts.** `CallerHistoryNotice`, `FlaggedCallersPanel` and `FalseReportSection` inform human decisions; nothing is applied automatically, and suspension is only ever a manual admin action. Cancellation and false-report labels live under `enums.cancellationCategory` and `enums.falseReportType`.