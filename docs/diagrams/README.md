# Diagrams

PNG renderings of every diagram used in
[`../NAJDA_Software_Engineering_Documentation.pdf`](../NAJDA_Software_Engineering_Documentation.pdf). All files are
generated; edit the sources in [`../uml_scripts/`](../uml_scripts/README.md) and re-render rather than changing the
images by hand. The "Section" column gives the chapter of the PDF where each diagram appears.

## Use-case diagrams

| File | Section | Shows |
|---|---|---|
| `uc_iam_a.png` | 6.1 | Registration, sign-in, profile, identity verification, medical profile (citizen self-service) |
| `uc_iam_b.png` | 6.1 | Employee provisioning, user administration, responder applications |
| `uc_report.png` | 6.2 | Emergency reporting, evidence, cancel, live tracking, chat, offline outbox |
| `uc_dispatch.png` | 6.3 | Live queue, AI review, assignment, false reports, caller history |
| `uc_field.png` | 6.4 | Shifts, missions, live unit location |
| `uc_hospital.png` | 6.5 | Hospital selection, handoff, vitals, medical-profile access |
| `uc_admin.png` | 6.6 | Facilities, units, facility-manager functions, guidance, legal documents |
| `uc_general.png` | 6.7 | Notifications, language and theme, status, support, app update, biometric lock |

## Architecture and deployment

| File | Section | Shows |
|---|---|---|
| `arch_context.png` | 7.1 | System context: clients, platform and external services |
| `arch_packages.png` | 7.2 | Backend feature modules |
| `arch_clients.png` | 7.4 | Layering of the Flutter app and the Next.js console |
| `deploy.png` | 7.5 | Deployment view |

## Data model

| File | Section | Shows |
|---|---|---|
| `erd_identity.png` | 7.6.1 | Identity, medical profile, legal consent, notifications |
| `erd_ops.png` | 7.6.1 | Facilities, units, incidents, missions, hospital transfers |

## Class diagrams

| File | Section | Shows |
|---|---|---|
| `cls_ops.png` | 7.7.1 | Operational domain model |
| `cls_identity.png` | 7.7.2 | Identity and support domain model |
| `cls_dispatch_a.png` | 7.7.3 | Incident service and its collaborators |
| `cls_dispatch_b.png` | 7.7.3 | Mission, shift and hospital-transfer services |
| `cls_notify.png` | 7.7.4 | Notification subsystem |
| `cls_idsvc_a.png` | 7.7.5 | Authentication, registration and e-mail OTP services |
| `cls_idsvc_b.png` | 7.7.5 | Identity-verification and legal-consent services |

## State diagrams

| File | Section | Shows |
|---|---|---|
| `st_incident.png` | 7.8.1 | Incident life cycle |
| `st_mission.png` | 7.8.2 | Mission life cycle |
| `st_transfer.png` | 7.8.3 | Hospital transfer life cycle |
| `st_unit.png` | 7.8.4 | Response unit status |
| `st_kyc.png` | 7.8.5 | Identity-verification status |
| `st_trust.png` | 7.8.6 | Caller-trust tiers |

## Activity diagrams

| File | Section | Shows |
|---|---|---|
| `act_lifecycle.png` | 7.9.1 | End-to-end handling from report to resolution (swim lanes) |
| `act_validate.png` | 7.9.2 | The ordered checks a report passes |

## Sequence diagrams

| File | Section | Shows |
|---|---|---|
| `sq_register.png` | 7.9.3 | E-mail registration with one-time code |
| `sq_google.png` | 7.9.3 | Google sign-in, profile creation, phone verification |
| `sq_employee.png` | 7.9.3 | Administrator-provisioned employee account |
| `sq_submit.png` | 7.9.4 | Submitting an emergency report |
| `sq_evidence.png` | 7.9.4 | Evidence upload and viewing through signed URLs |
| `sq_outbox.png` | 7.9.4 | Offline outbox and idempotent delivery |
| `sq_assign.png` | 7.9.5 | Assigning a unit and working the mission |
| `sq_hospital.png` | 7.9.5 | Ambulance hospital handoff with live vitals |
| `sq_notify.png` | 7.9.6 | Notification creation and push delivery after commit |
| `sq_kyc.png` | 7.9.7 | Didit identity verification with signed webhook |
| `sq_application.png` | 7.9.7 | First-responder application and approval |
| `sq_authz.png` | 7.10 | How a request is authenticated and authorised |
