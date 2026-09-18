# NAJDA — Web

The Next.js console every role signs into — citizen emergency reporting, dispatch, responder, hospital, and admin, all from one codebase, scoped per role, in English or Arabic.

## Stack

- **Next.js** (App Router) — server and client components, no `middleware.ts`; route protection is handled client-side by `AuthGuard`/`RoleProtectedRoute`/`ProfileGate`, with the backend's own authorization as the real boundary
- **TanStack Query** — server state, cache invalidation, WebSocket-driven live updates layered on top of it
- **Zustand** — local auth/UI state
- **Tailwind CSS v4** — including logical (`start`/`end`) utilities throughout, for correct mirroring under Arabic
- **next-intl** — English/Arabic, cookie-based locale (no `/en`/`/ar` URL prefixing — this is an authenticated tool, not a publicly indexed site)
- **MapLibre GL + OpenFreeMap tiles** — every live/interactive map in the app
- **Firebase (client SDK)** — passwordless email-link and Google sign-in, ID token issuance
- **EmailJS** — the Support page's outbound message, gated by a server-side rate-limit check first

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Everyone | Landing page |
| `/login`, `/register` | Public | Sign in; passwordless email-link or Google registration |
| `/complete-signup` | Public (mid-flow) | Completes an email-link sign-in, bootstraps the account |
| `/account` | Any signed-in user | Profile, email/phone change and verification, password management |
| `/emergency` | Citizen | Submit an incident, track it live, view history |
| `/incident/[id]` | Anyone who was ever involved | Read-only historical view of a closed incident |
| `/become-a-responder` | Citizen (verified) | First-responder application |
| `/dispatch` | Dispatcher+ | Queue, active incidents, live map, unit assignment |
| `/responder` | Responder roles | Shift management, mission lifecycle, hospital-transfer flow |
| `/hospital` | Hospital staff+ | Incoming transfers, live vitals |
| `/admin`, `/admin/facilities`, `/admin/units`, `/admin/incidents`, `/admin/applications` | Admin+ | Full account/facility/unit/incident/application management, including Firebase↔database reconciliation |
| `/support`, `/terms`, `/privacy`, `/about` | Everyone | Static/utility pages |

## What each role actually gets

- **Citizen** — SOS submission with photo/video/audio evidence and location (GPS or manual pin), live incident tracking with a map and reverse-geocoded address, in-context chat with whoever's responding, and a browsable history of past emergencies.
- **Dispatcher** — a single live operations map showing every incident-relevant unit with per-mission route coloring, click-to-select unit assignment sorted by real distance and filterable by type, AI priority and duplicate-suggestion review, and full chat/media visibility.
- **Responder roles** — shift start/join/leave/end scoped to their own facility (or, for ambulance/first-responder, unrestricted), live GPS location sharing with real status feedback (not just a static "on" badge), a live map to the incident with driving or straight-line route options, and — for ambulance crews — a full hospital-selection flow: distance-ranked recommendations, a searchable full list, and hover/click selection directly on the map with own-facility and recommended indicators.
- **Hospital staff** — incoming-transfer list with a live map of the inbound unit and real-time vitals as they're radioed in.
- **Admin** — account lifecycle (including the one-way Super-Admin-only protections and Firebase↔database drift detection), facility CRUD with OSM seeding and address backfill, unit CRUD scoped to matching facility types, full incident history and moderation (delete, duplicate marking, forced completion), and first-responder application review.

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
- **WebSocket subscriptions replace polling, not supplement it** — hooks like `useAvailableUnits`/`useIncidentQueue` invalidate their query on a live event rather than running a `refetchInterval`. If a new live-updating list is added, follow that pattern rather than reintroducing polling.
- **`queryClient.clear()` runs on logout, after navigation, not before** — ordering it the other way around previously left protected pages stuck rendering against a cache that had just been wiped out from under them.
- **A facility-type dropdown should filter to what's actually relevant for the context it's in** — e.g. a unit's home-station picker should only ever offer facilities matching that unit's type (with ambulance being the one deliberate exception, since it may be based at either an ambulance station or a hospital). Don't reuse an unfiltered "all facilities" list where a scoped one is what the UI actually needs.