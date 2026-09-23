<div align="center">

# NAJDA

**Network for AI-powered Joint Dispatch and Assistance**

An emergency dispatch coordination platform that models how a citizen's report becomes a synchronized, multi-party response — connecting citizens, dispatchers, ambulance crews, police, firefighters, hospitals, and administrators around a single shared incident timeline.

*Not a real emergency service. Not connected to any government emergency system.*

</div>

---

## What this is

Most dispatch demos are a single dashboard pretending to coordinate things. NAJDA actually does: a citizen's report goes through AI-assisted triage, gets assigned to a unit that's genuinely on shift for it, gets tracked live on a map with real driving routes, and — for medical calls — flows through a full hospital handoff with a live vitals log. Every role sees the same incident, scoped to exactly what their job requires, in either English or Arabic.

## The seven roles, one incident

| Role | Surface | How they get an account |
|---|---|---|
| **Citizen** | `/emergency` | Self-registers (passwordless email link or Google) |
| **Dispatcher** | `/dispatch` | Admin-provisioned |
| **Ambulance Crew · Police · Firefighter · First Responder** | `/responder` | Admin-provisioned, or approved from a citizen's application |
| **Hospital Staff** | `/hospital` | Admin-provisioned, linked to a facility |
| **Admin · Super Admin** | `/admin` | Admin-provisioned (only a Super Admin can create another) |
Citizen and Responder also have a native mobile app — see [Mobile](#mobile) below.

## How the pieces fit together

```
┌──────────────┐        ┌───────────────────┐        ┌──────────────┐
│   Next.js     │◄──────►│   Spring Boot API  │◄──────►│  PostgreSQL   │
│   (web)       │  REST  │   (backend)        │  JPA   │               │
└──────┬────────┘  + WS  └──────┬─────────────┘        └──────────────┘
       │                        │
       │                        ├──► Firebase Admin SDK (identity, account sync tooling)
       │                        ├──► Supabase Storage (private, signed URLs)
       │                        ├──► OpenRouter (AI priority + duplicate suggestion)
       │                        └──► OSM / Nominatim / OSRM (facilities, geocoding, routing)
       │
       └──► Firebase Auth (client identity), MapLibre (maps), EmailJS (support)
```

- **Firebase is identity only.** Passwordless email-link, Google, and admin-issued password flows all converge on the same account model — Postgres is the single source of truth for roles, permissions, and everything that's actually happened. A citizen registering themselves never gets a database row until their email is genuinely confirmed, closing off account-squatting entirely for that path.
- **Facilities are unified.** Hospitals, fire stations, police stations, and ambulance stations are one `Facility` entity with a `facilityType` column — a `registered` flag (auto-set the moment real staff or a unit is linked) distinguishes staffed locations from geographic data points pulled in from OpenStreetMap.
- **Shifts gate everything.** A response unit can't receive a mission unless someone is actively on shift for it as `LEAD` — the direct implementation of "a vehicle isn't a driver," carried through every authorization check on missions and hospital transfers.
- **Live by default.** WebSocket push keeps every open console in sync with incident, mission, and unit state — dashboards react to what changed instead of polling for it.
- **AI recommends, humans decide.** Priority scoring and duplicate-incident suggestions are both advisory, both dismissible, and neither one ever assigns anything on its own.

## Security & privacy, concretely

- Chat content, incident descriptions, and clinical notes are encrypted at rest (AES-256-GCM, application-level) — a database dump doesn't hand over plaintext.
- All media (photos, video, audio, application documents) lives in a **private** storage bucket. Nothing is ever served from a public URL — every view goes through a short-lived, authorization-checked signed link generated on demand.
- Phone numbers are unique only once *verified* — two people can hold the same unverified number simultaneously without either being locked out, but a verified number can never be claimed by a second account. Enforced entirely in the application layer, deliberately not as a blanket database constraint.
- Every real permission check lives in the backend service layer, enforced independently of anything the frontend does — client-side role gating exists purely for a responsive UI, never as the actual security boundary.
- An admin-only reconciliation tool detects and resolves drift between Firebase accounts and database rows — genuinely useful when developing against one shared Firebase project across local and production environments.

## Language

Full English and Arabic support, including right-to-left layout, switchable at any point from the header — no separate URL per language, since this is an authenticated tool rather than a publicly indexed site.

## Mobile

A companion Expo app covers the two roles that work from the field — **Citizen** (report, track) and **Responder** (shift, missions) — talking to the same backend and Firebase project as web. Dispatcher, Hospital Staff, and Admin remain desk-only, served by the web console.

Android APK available now; iOS via TestFlight coming soon.

[Download the app](https://github.com/youssefry01/najda/releases/latest) · [mobile/README.md](mobile/README.md)

## Repository structure

```
najda/
├── backend/     Spring Boot API — see backend/README.md
├── web/         Next.js console for every role — see web/README.md
├── mobile/      Expo companion app (Citizen + Responder) — see mobile/README.md
├── docker-compose.yml   Full local stack: Postgres + backend + web
└── ...
```

## Running it

The fastest path to a working local stack:

```bash
cp backend/.env.example backend/.env   # fill in real values
cp web/.env.example web/.env
docker compose up
```

See `backend/README.md` and `web/README.md` for the full environment variable reference, manual (non-Docker) setup, and what each external service is used for.