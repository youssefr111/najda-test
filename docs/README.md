# NAJDA — Documentation

This folder holds the project's software engineering documentation.

```
docs/
├── NAJDA_Software_Engineering_Documentation.pdf   ← the documentation
├── diagrams/        UML and architecture diagrams as PNG images
└── uml_scripts/     Sources that generate every diagram, plus a render script
```

## The documentation

[`NAJDA_Software_Engineering_Documentation.pdf`](NAJDA_Software_Engineering_Documentation.pdf) is the single, complete
specification of the platform. It describes what is built in the current code base and is organised as follows.

| Chapter | Content |
|---|---|
| 1 Introduction | Purpose, project overview, objectives, scope, methodology, conventions |
| 2 Stakeholders and System Actors | The ten roles, how accounts are created, external systems, role capability matrix |
| 3 Functional Requirements | Requirements by capability, with priority and platform |
| 4 Non-Functional Requirements | Security, privacy, performance, reliability, usability, maintainability |
| 5 User Stories | Stories per capability area |
| 6 Use Case Analysis | Use-case diagrams and full specifications (UC-1 to UC-64) |
| 7 System Architecture and Design | Architecture, AI components, clients, deployment, data model and dictionary, class, state, activity and sequence diagrams, security design |
| 8 Business Rules | Rules that keep the service safe and fair |
| 9 Testing Strategy | Approach, the automated tests in the repository, verification scenarios |
| 10 Requirements Traceability Matrix | Requirements ↔ use cases ↔ modules ↔ tests |
| 11–12 | Assumptions, constraints, design decisions, future work |
| Appendices | Technology stack, API reference, configuration reference, glossary |

## Diagrams

Every diagram in the PDF is available as a standalone PNG in [`diagrams/`](diagrams/README.md), and can be regenerated
from the sources in [`uml_scripts/`](uml_scripts/README.md).

## Keeping the documentation current

1. Edit the relevant source in `uml_scripts/` and run `uml_scripts/render.sh` to refresh the PNGs.
2. Update the matching section of the document and re-export the PDF.
3. When a requirement, use case, business rule or endpoint changes, update the traceability matrix (chapter 10) and the
   API appendix so the document keeps matching the code.
