# NAJDA — Graduation Project Book

LaTeX source of the NAJDA graduation project book (Modern Academy, Faculty of Engineering, Department of Computer
Engineering). It is built with **XeLaTeX** and **BibTeX** and is fully self-contained: the fonts it needs are bundled in
`fonts/`, so it compiles the same way on any machine and on Overleaf.

```
book/
├── main.tex                    entry point: document class, front matter, chapters, appendices
├── latexmkrc, Makefile         build configuration
├── config/
│   ├── metadata.tex            title, institution, supervisor, date, TEAM MEMBERS  ← edit names here
│   ├── packages.tex            package list and the brand colour palette
│   ├── fonts.tex               TeX Gyre Pagella (text), Inter (headings), DejaVu Sans Mono (code)
│   ├── style.tex               headings, headers/footers, captions, tables, call-out boxes, listings
│   └── macros.tex              \diagram, \diagramwide, \screenshot, \scrollshot, \fillme, …
├── frontmatter/                cover, approval, declaration, acknowledgments, abstract, abbreviations
├── chapters/                   01_introduction … 07_conclusion
├── appendices/                 A database, B API, C UI screens, D use cases, E decisions, F configuration, G glossary
├── generated/                  tables generated from the specification (do not edit by hand)
├── code/                       real source excerpts shown as listings in Chapter 5
├── figures/
│   ├── branding/               college logo
│   ├── diagrams/               41 UML / architecture diagrams (PNG)
│   └── screenshots/            put your screenshots here (see its README)
├── bibliography/references.bib
└── tools/                      gen_tables.py, stream.json, placeholders.sh
```

## Building

**Command line** (TeX Live with XeLaTeX, BibTeX and latexmk):

```bash
make            # screen edition   → build/NAJDA_Project_Book.pdf
make print      # double-sided print edition (binding margin, chapters start on right pages)
make clean
```

**Overleaf:** upload the folder (or import the repository), set *Menu → Compiler* to **XeLaTeX** and the main document to
`main.tex`. Nothing else is required.

## What to edit

| To change… | Edit |
|---|---|
| Names, supervisor, date, degree, institution lines | `config/metadata.tex` (the cover, approval page and declaration update automatically) |
| College logo | replace `figures/branding/logo.jpeg` |
| Colours, fonts, spacing, heading look | `config/style.tex`, `config/fonts.tex`, `config/packages.tex` |
| Text of a chapter | the matching file in `chapters/` |
| A diagram | edit its source in `docs/uml_scripts/` (see that README), re-render, copy the PNG into `figures/diagrams/` |
| Screenshots | add PNG files to `figures/screenshots/` using the names in its README; screenshots are always shown whole, lined up side by side; oversized ones get a safe-size copy via `make images` (see that README) |
| References | `bibliography/references.bib`, cited with `\cite{key}` |

### Placeholders

Anything that still needs content is marked so it cannot be forgotten:

* screenshots show a framed "Screenshot to be added" box until the file exists;
* measured results in Chapter 6 are marked `\fillme{…}` and printed in red.

`make placeholders` lists all of them. When everything is filled in, set `\showplaceholdersfalse` in
`config/macros.tex` to hide any remaining markers from the final PDF.

### The generated tables

The requirement, user-story, business-rule, test, API, configuration and glossary tables, the data dictionary and the
complete use-case specifications (Appendix D) are generated from the structured specification in `tools/stream.json` by
`tools/gen_tables.py` (`make tables`). Fix a typo in the generated `.tex` files only if you do not intend to regenerate them;
otherwise change the specification and regenerate, so the book and the PDF documentation stay consistent.

## Conventions

* One sentence per source line where practical; labels are prefixed `chap:`, `sec:`, `fig:`, `tab:`, `lst:`, `app:`.
* Always refer to things with `\cref{label}` so numbering stays correct.
* Figures: `\diagram{file.png}{Caption.}{fig:label}` (portrait) or `\diagramwide{…}` (landscape page for wide diagrams).
* Call-out boxes: `keyidea`, `designnote`, `caution`. Code excerpts: `\lstinputlisting[…]{code/File.java}`.
* Identifiers, file names and code in running text: `\code{…}`.

## Fonts and licences

TeX Gyre Pagella is part of TeX Live (GUST Font License). **Inter** (SIL Open Font License) and **DejaVu Sans Mono**
(free Bitstream Vera-derived licence) are bundled in `fonts/` and may be redistributed with the project.

## Troubleshooting

* *"Font … not found"* — build from the project root so `fonts/` is found; on Overleaf make sure the `fonts/` folder was uploaded.
* *Citations show as `[?]`* — run the build twice (latexmk does this automatically) and make sure the BibTeX step ran.
* *Overleaf asks for a compiler* — choose XeLaTeX; LuaLaTeX and pdfLaTeX are not supported by this template.