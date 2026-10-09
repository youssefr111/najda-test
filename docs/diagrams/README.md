# Diagrams

Visual reference for how NAJDA is designed — the figures embedded in [`../NAJDA Software Engineering Documentation.pdf`](<../NAJDA Software Engineering Documentation.pdf>). Each row below links the diagram to the requirement/use-case IDs it illustrates, so you can jump straight to the matching prose in the PDF.

Editable PlantUML source for every diagram here lives in [`../uml_scripts/`](../uml_scripts) under the same base filename (e.g. `architecture.png` ↔ `architecture.puml`) — edit the `.puml`, regenerate the `.png`, don't hand-edit images.

## Architecture

| Diagram | Shows |
|---|---|
| [`architecture/architecture.png`](./architecture/architecture.png) | *Figure 7.1.* Two states side by side: **deployed** (Web Dashboard + a not-yet-built Mobile App talking to a single Spring Boot monolith, which talks to Firebase Auth and PostgreSQL) vs. **target** — an API Gateway/BFF in front of separate Auth & User, Dispatch, Incident, Hospital, and AI services coordinating over RabbitMQ, Redis for live-location caching, and a WebSocket Gateway pushing live events to the Web Dashboard and Mobile Apps. The clearest single "where we are vs. where we're going" picture in the repo. |

## Use cases

| Diagram | Shows |
|---|---|
| [`usecase/usecase-iam.png`](./usecase/usecase-iam.png) | *Figure 6.1.* Identity & Access Management — UC-1 through UC-7 (registration via Google/email/password, admin-provisioned employees, enable/disable, admin overrides, password reset, First Responder certification) plus the self-service use cases (profile, role, phone, email, forgot password). Backs FR-1 through FR-27. |
| [`usecase/usecase-ops.png`](./usecase/usecase-ops.png) | *Figure 6.2.* Emergency Response Operations — UC-8 through UC-11 (report an emergency, assign a unit, accept/reject a mission, ambulance hospital handoff), with Field Unit generalizing Ambulance Crew/Firefighter/Police/First Responder. The AI Service is explicitly a supporting actor, never a decision-maker. Backs FR-28 through FR-53, all currently **Planned**. |

## Sequence diagrams

Concrete request/response flows. The first five are implemented and documented against working code; the last is the planned end-to-end flow.

| Diagram | Flow | Status |
|---|---|---|
| [`sequence/sequence-citizen-form.png`](./sequence/sequence-citizen-form.png) | *Figure 7.7.* Citizen registration via email/password (UC-2) — account creation, automatic email verification, `POST /api/auth/register/citizen?provider=password`, and the later resend/change-email flow. | Implemented |
| [`sequence/sequence-citizen-google.png`](./sequence/sequence-citizen-google.png) | *Figure 7.6.* Citizen registration via Google (UC-1) — profile starts incomplete since Google doesn't supply gender/address/phone, so registration and profile-completion happen as two separate steps. | Implemented |
| [`sequence/sequence-phone-verification.png`](./sequence/sequence-phone-verification.png) | *Figure 7.8.* Adding/changing a phone number, then verifying it via OTP (FR-9, FR-10) — phone is stored unverified immediately; `phoneVerified` only flips true after the OTP round-trip. | Implemented |
| [`sequence/sequence-password-reset.png`](./sequence/sequence-password-reset.png) | *Figure 7.10.* All three password-recovery paths (UC-6): self-service forgot-password at login, self-service change-password on the account page (excluded for Google-only accounts), and an admin-generated reset link for an existing user. | Implemented |
| [`sequence/sequence-employee-registration.png`](./sequence/sequence-employee-registration.png) | *Figure 7.9.* Admin/Super-Admin provisioning a non-citizen account (UC-3) — the `SUPER_ADMIN`-only guard on creating another `SUPER_ADMIN`, Firebase account creation, the Postgres-save rollback if it fails, and the generated (not auto-emailed) reset link. | Implemented |
| [`sequence/sequence-e2e-operations.png`](./sequence/sequence-e2e-operations.png) | *Figure 7.11.* The full incident lifecycle end to end — citizen report → AI priority/duplicate check → dispatcher queue → unit assignment → accept → en route → arrived → the police/fire/first-responder vs. ambulance-crew branch (hospital recommendation, vitals transmission, handover). This is the spec for the entire Emergency Response Operations domain (FR-28…FR-53). | Planned |

## State model

| Diagram | Shows |
|---|---|
| [`state/state-incident-mission.png`](./state/state-incident-mission.png) | *Figure 7.5.* The incident/mission lifecycle state machine: `Reported → (AI check) → Assigned → Notified → Accepted/Rejected → EnRoute → Arrived → (Hospital Selected →) Completed`, plus `Cancelled` reachable from most states via citizen cancellation. The AI duplicate check is explicitly informational only and never blocks assignment on its own. Authoritative source for whatever `status` enum the eventual `incidents`/`missions` entities use. |

## Data model

| Diagram | Shows |
|---|---|
| [`data-model/class-diagram.png`](./data-model/class-diagram.png) | *Figure 7.4.* Class-level view of the **currently implemented** backend: `User` (implements `UserDetails` directly, no separate principal type), `Role`, `Gender`, `AuditLog` (an independent record keyed by user IDs, not a JPA relationship), and the service classes that touch them. Method signatures included, so it's often faster than reading the source when you just need to know what a service exposes. |
| [`data-model/er.png`](./data-model/er.png) | *Figure 7.2.* Entity-relationship diagram of the **deployed** schema: `roles` ↔ `users` ↔ `audit_logs`. Three tables total — matches `src/main/java/.../user/model/` and `audit/model/` exactly. |
| [`data-model/er-target.png`](./data-model/er-target.png) | *Figure 7.3.* Entity-relationship diagram of the **planned** schema, layering `incidents`, `missions`, `hospitals`, `vehicles`, and `vital_sign_readings` on top of `users`. The spec for the incident/dispatch/hospital domain work that hasn't started yet — exact column types, indexing, and per-unit-vs-per-crew vehicle tracking are explicitly not finalized (see §12, Open Decisions, in the main PDF). |