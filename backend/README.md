# NAJDA — Backend

Spring Boot API powering every role in NAJDA: incident intake, dispatch, shift and mission lifecycle, hospital handoff, facility management, and the AI/geospatial/identity services that support them.

## Stack

- **Spring Boot** (Java) — REST API, WebSocket (STOMP over a simple in-memory broker), Spring Security, Spring Data JPA
- **PostgreSQL** — the single source of truth for everything except the auth credential itself
- **Firebase Admin SDK** — verifies ID tokens, creates and manages account credentials (employee accounts, and citizen accounts after email verification), reads live provider/verification state when needed, and backs the admin-facing Firebase↔database reconciliation tooling
- **Supabase Storage** — private bucket, accessed exclusively through short-lived signed URLs the backend mints on demand
- **OpenRouter** — free-tier LLM access for incident priority classification and duplicate-incident suggestion
- **Brevo** — transactional email over its HTTPS API (registration verification codes), behind an `EmailSender` interface so swapping providers means writing one adapter class
- **OpenStreetMap ecosystem** — Overpass API (facility seeding), Nominatim (reverse geocoding, rate-limit aware), OSRM (driving-route polylines for the live map)

## Domain model, briefly

- **Facility** — one entity, one `facilityType` (`HOSPITAL` / `AMBULANCE_STATION` / `FIRE_STATION` / `POLICE_STATION`), with a `registered` flag set automatically the moment real staff or a unit gets linked to it.
- **ResponseUnit** — a vehicle (or, for `FIRST_RESPONDER`, a person's personal unit). Ambulance and first-responder units may operate without a fixed facility; every other type requires one.
- **ShiftAssignment** — the record that a specific employee is on duty for a specific unit, as `LEAD` or `CREW`. A unit has no operational status without one. Every mission-action authorization check ultimately traces back to "is this caller the unit's active LEAD."
- **Incident → Mission → HospitalTransfer** — an incident can carry multiple concurrent missions (one per responding unit), each recording the dispatcher who assigned it (`assignedBy`); an `AMBULANCE` mission's terminal step is a `HospitalTransfer`, which carries its own state (`SELECTED` → `EN_ROUTE` → `ARRIVED`) and, while active, a running vitals log. An incident also carries a `source` (citizen app vs. a paired device — the latter modeled, not yet wired to a real integration). An incident can end **cancelled by its citizen** (a required reason category, plus text for "Other") or be **marked a false report** by dispatch (a type, who, when) — both are recorded on the incident itself.
- **FirstResponderApplication** — a citizen's application to become a `FIRST_RESPONDER`, submitted as one atomic request with its required supporting documents attached (not added afterward), reviewed by an admin.
- **EmailVerification** — a short-lived record per email address going through registration: the hashed one-time code, attempt counter, resend cooldown, and — once verified — the hash of a one-time registration token. It's deleted in the same transaction that creates the account; expired rows are purged by a scheduled job.

## API surface, by domain

| Domain | Base path | Notes |
|---|---|---|
| Health | `/api/health` | Public liveness check (`{"status":"UP"}`), touches no dependencies. For external uptime monitors |
| Status | `/api/status` | Public readiness check with per-component state (`api`, `database`, `auth`); returns 503 when a dependency is down. Result is cached for 15 seconds. Used by the web status indicator |
| Auth | `/api/auth` | Citizen email + password registration (`/register/otp/send` → `/register/otp/verify` → `/register/citizen/password`, all public), Google/phone registration bootstrap, admin-provisioned employee creation |
| Users | `/api/users` | Profile, role, facility assignment, phone/email verification, admin overrides |
| Firebase sync | `/api/admin/firebase-sync` | Detects and resolves drift between Firebase accounts and database rows (Super Admin only) |
| Facilities | `/api/facilities` | CRUD, OSM-backed seeding, address backfill |
| Units | `/api/units` | CRUD, location reporting, reset-to-facility (unit LEAD or admin), status reconciliation. Responses include the owning user for `FIRST_RESPONDER` units |
| Incidents | `/api/incidents` | Submission, queue/active views, history, injured-count edits, citizen cancellation (reason required), false-report marking (dispatcher+; clearing is admin-only), AI retry, duplicate marking/dismissal |
| Incident media | `/api/incident-media` | Signed upload flow, registration, signed download links, deletion. Evidence can be **added** while the incident is live (until resolved/cancelled); editing the original message and deleting evidence stay restricted to before assignment |
| Incident responders | `/api/incidents/{id}/responders` | Citizen-safe view of the units working an incident: type, status and live position only — no names or plates. Police positions are withheld server-side |
| Incident presence | `/api/incidents/{id}/presence` | Dispatcher heartbeat / leave / who else is viewing. Advisory only; in-memory, per instance |
| Caller history | `/api/incidents/{id}/caller-history`, `/api/admin/caller-flags` | Recent cancellation and false-report counts for an incident's caller (dispatcher+), and the admin review list. Informational — never an input to priority or assignment |
| Shifts | `/api/shifts` | Start/join/leave/end, admin force-end |
| Missions | `/api/missions` | Offer, accept/reject, en-route/arrived/complete, withdraw, dispatcher cancel |
| Hospital transfers | `/api/hospital-transfers` | Recommendation, selection, status progression, vitals |
| Chat | `/api/incidents/{id}/chat` | Scoped to active participants for sending; readable by anyone who was ever a participant |
| First-responder applications | `/api/first-responder-applications` | Atomic submission with required documents, admin review |
| Support | `/api/support-messages` | Server-side rate limiting for the Support page |
| WebSocket | `/ws` | STOMP endpoint; `/topic/incidents`, `/topic/missions`, `/topic/units`, per-transfer vitals topics, plus payload-free per-incident nudges at `/topic/incidents/{id}/responders` and `/topic/incidents/{id}/presence` |

Every mutating endpoint enforces its real authorization in the service layer via `@PreAuthorize` and explicit ownership/role checks — never assume a client-side gate is the actual boundary. `/ws`, `/api/health` and `/api/status` are intentionally permitted at the Spring Security level; a STOMP handshake carries no Bearer token the way a normal REST call does.

## Environment variables

```
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_JSON=

# Database (set directly when running outside Docker; docker-compose.yml wires these itself)
SPRING_DATASOURCE_URL=
SPRING_DATASOURCE_USERNAME=
SPRING_DATASOURCE_PASSWORD=

# Supabase Storage (private bucket)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=

# OpenRouter (AI priority + duplicate detection)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-oss-20b:free   # swappable without a redeploy if the free-tier lineup shifts

# Chat / incident text / vitals notes encryption at rest
# 256-bit AES key, base64-encoded — generate once with: openssl rand -base64 32
CHAT_ENCRYPTION_KEY=

# Registration email verification (OTP)
# HMAC key for hashing one-time codes, min 32 chars — generate with: openssl rand -base64 48
# Required in prod; the dev profile has a built-in default
OTP_HMAC_SECRET=

# Transactional email (Brevo) — required in every environment; the app won't start without them
BREVO_API_KEY=            # the API key, not the SMTP key
MAIL_FROM_EMAIL=          # must be a sender you've verified in Brevo
```

## Running locally

**Via Docker (recommended):**
```bash
docker compose up backend postgres
```

**Manually:**
```bash
./mvnw spring-boot:run
```
Requires a running Postgres instance and every variable above set in your environment.

## Schema management

Managed through Flyway, versioned under `src/main/resources/db/migration/`. `V1__baseline.sql` captures the schema as it stood when migrations were introduced, generated directly from a real `pg_dump` rather than reconstructed by hand. Hibernate's `ddl-auto` is set to `validate` — it checks that the entity mappings match the real schema and fails loudly on any mismatch, but never silently alters anything again.

Every schema change from here on is a new numbered file (`V2__...`, `V3__...`), applied automatically and identically across every environment the next time each one starts up — no more manually running the same `ALTER TABLE` twice and hoping neither environment was missed.

## Seeding data

- **Facilities** — from the admin Facilities tab, seed by type (Hospital / Fire / Police) directly from OpenStreetMap. Ambulance stations aren't reliably tagged on OSM and are added manually.
- **Addresses** — if a seeded facility comes back with no address (a transient upstream geocoding failure), the same tab's "Fill missing addresses" action retries it. Both the seed and the backfill stop themselves cleanly the moment Nominatim rate-limits the request stream, rather than grinding through the remaining list at a rate that's already being rejected.
- **Test accounts** — `SystemUserInitializer` bootstraps one account per role on startup, each backed by a real test facility, for exercising the full workflow without manually creating every role by hand.

## A few things worth knowing before extending this

- **Never trust `IncidentMedia.url` for display** — the bucket is private; always resolve a fresh signed download URL through `/api/incident-media/{id}/download-url` (or the equivalent facility-application endpoint) rather than caching a stored link.
- **`ProfileCompletionEvaluator` is the single source of truth** for whether an account's profile is complete, including whether it has a password provider attached (checked live against Firebase, since that's not something this database stores). Don't reintroduce a second copy of this logic elsewhere.
- **Phone uniqueness is verified-only, and it's an application-layer rule, not a database constraint.** Two accounts can hold the same unverified number simultaneously; a verified number can never be claimed by a second account. Any new code path that sets a phone number needs to check `existsByPhoneAndPhoneVerifiedTrue` itself — there's no `unique=true` column catching this for you. Email + password registration does exactly this and rejects with `PhoneAlreadyInUseException` (HTTP 422).
- **Deleting an incident is intentionally destructive and `SUPER_ADMIN`-only** — it cascades through missions, chat, and hospital-transfer records, and, once the database delete commits, removes the incident's `incidents/{id}/` folder from Supabase Storage (best-effort: a storage failure is logged, never surfaced). For anything short of genuine cleanup, prefer cancelling or marking a duplicate instead.
- **The Firebase sync tool is for development convenience, not routine operation.** It exists because testing against one shared Firebase project from both a local machine and production can leave accounts on one side with no matching row on the other — it's not meant to run automatically or often.
- **Email registration creates nothing until the email is verified.** `POST /api/auth/register/otp/send` emails a 6-digit code (HMAC-SHA256 hashed at rest, 10-minute TTL, 60-second resend cooldown, 5 attempts); `/otp/verify` returns a one-time token; `/citizen/password` requires that token, then creates the Firebase user (already email-verified) and the database row in one transaction — deleting the Firebase user again if the database write fails. TTLs and limits live under `najda.auth.otp.*` in `application.yaml`.
- **Rate limiting and incident presence are in-memory, per instance.** `InMemoryRateLimiter` backs the registration endpoints, and `IncidentPresenceService` tracks which dispatchers have an incident open. In production `server.forward-headers-strategy: native` (set in `application-prod.yaml`) makes limits key on the real client IP instead of the proxy's. If the backend is ever scaled horizontally, move both to a shared store.
- **Email delivery is required, not optional.** There is no log-only dev mode: the app refuses to start without `BREVO_API_KEY` and `MAIL_FROM_EMAIL`, and the sender must be verified in Brevo. Without an authenticated sending domain, some messages will land in spam — authenticate a domain in Brevo once you have one; no code change is needed.
- **Keep `/api/health` shallow and put dependency checks in `/api/status`.** Monitors that restart or alert on a failing health check would otherwise report an outage every time the database blips. 
- **`/api/status` depends on a short database connection timeout.** `spring.datasource.hikari.connection-timeout` is set to 5000 ms in `application.yaml`. Without it, HikariCP waits 30 seconds for a connection when Postgres is unreachable, so the status endpoint would hang instead of quickly reporting `database: DOWN`. Don't raise it much, and don't go below about 3 seconds or a database waking from sleep will cause false failures.
- **Concurrency model.** Assigning a unit takes a pessimistic row lock on the unit (`findByIdForUpdate`) and re-checks it is `AVAILABLE`, so a unit can't be double-booked. Don't add `@Version` to `ResponseUnit` — GPS updates every 15 seconds would conflict with assignments. `Incident` and `Mission` use `@Version`; a lost update surfaces as HTTP 409 through `GlobalExceptionHandler`, and `assign-unit` retries once on a version conflict (two dispatchers assigning different units to a fresh incident both try to move it to `ASSIGNED`, which is harmless).
- **Presence is advisory.** "Sara is also viewing" never blocks anything, expires 45 seconds after the last heartbeat, and uses the REST calls for identity — a STOMP connection carries no token — with the WebSocket only sending an empty nudge.
- **Citizens see a minimal view of responders.** The citizen map is fed by `/api/incidents/{id}/responders` and the per-incident topic only. Names, plates and mission details, names and plates stay out of it, and `/topic/missions` (which carries full mission payloads) must never be consumed by a citizen-facing screen. `POSITION_HIDDEN_TYPES` in `MissionServiceImpl` lists the unit types whose position is never shared.
- **Caller flags are context, not verdicts, and nothing is penalised automatically.** Cancellation counts (30 days) and false-report marks (90 days) are shown to dispatchers and on an admin review list; thresholds are constants in `CallerHistoryServiceImpl`. A false-report mark is a dispatcher/admin decision (audit-logged, admin-reversible); suspending an account is a manual admin action. Never feed this data into AI priority, assignment, or rate limiting — a caller must never be blocked from asking for help by a rule.
- **Citizen cancellation stands units down.** Allowed until a unit has arrived; it cancels every offered/accepted/en-route mission (via `MissionService.cancelOpenMissionsForIncident`) and frees the units. `MissionEventPublisher.publishMissionUpdated` also nudges the per-incident topic, so any new mission mutation should publish through it.