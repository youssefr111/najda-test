# NAJDA — Documentation

This folder is the living engineering spec — the doc to check for the precise, current contract of anything in the system. (For the academic thesis writeup instead, see [`../book`](../book).)

## What's here

| Path | What it is |
|---|---|
| [`NAJDA Software Engineering Documentation.pdf`](<./NAJDA Software Engineering Documentation.pdf>) | **Start here.** The full spec: functional requirements (FR-1…FR-53) and non-functional requirements, user stories, use case specs (UC-1…UC-11), business rules, a requirements traceability matrix, an API reference, and a glossary. Every requirement is tagged **Implemented** or **Planned**. |
| `NAJDA Software Engineering Documentation.docx` | Same content, editable source — update this, then re-export the PDF. |
| [`diagrams/`](./diagrams) | The rendered PNG diagrams referenced throughout the PDF (architecture, use case, sequence, state, data model), organized by type. See [`diagrams/README.md`](./diagrams/README.md) for what each one shows. |
| [`uml_scripts/`](./uml_scripts) | PlantUML (`.puml`) source for every diagram in `diagrams/` — one `.puml` per `.png`, same base filename. Edit these, not the PNGs directly. |
| `NAJDA_UML_Scripts.zip` | A zipped copy of `uml_scripts/`, for whenever a flat archive is more convenient than the folder (e.g. attaching to the thesis submission). Keep it in sync manually if you edit `uml_scripts/`. |

## How this relates to the READMEs elsewhere in the repo

The [root README](../README.md), [`backend/README.md`](../backend/README.md), and [`web/README.md`](../web/README.md) are the **fast-start versions** — enough to get running and oriented in a few minutes. This folder is the **source of truth** they summarize. If a README and this documentation ever disagree, this documentation wins, and the README should be corrected to match.

## Keeping this current

Per the document's own methodology section: modules are documented here in full (down to the exact class/endpoint) once implemented, and represented at intended-scope level while still planned. As a module moves from Planned → Implemented:

1. Update its FR rows' **Status** column and the traceability matrix's **Component** column to point at the real class/endpoint.
2. Add its use case(s) to §6 if not already there in full detail.
3. Add/update its diagram(s) in `diagrams/` (and the corresponding `.puml` in `uml_scripts/`).
4. Add its endpoints to Appendix B.
5. Re-export the PDF from the `.docx` source.