#!/usr/bin/env bash
# Lists the content that still has to be supplied before the book is final:
#   1. \fillme{...} markers (shown in red in the PDF)
#   2. screenshots referenced by the book but missing from figures/screenshots/
cd "$(dirname "$0")/.."

echo "== Text placeholders (\\fillme) =="
grep -rn --include=*.tex '\\fillme{' chapters frontmatter appendices || echo "none"

echo
echo "== Screenshots =="
missing=0
name='[A-Za-z0-9_]+'

# \screenshot[w]{name}{...}
for r in $(grep -rhoE --include=*.tex "\\\\screenshot(\[[^]]*\])?\{$name\}" chapters appendices | grep -oE "\{$name\}" | tr -d '{}' | sort -u); do
  [ -f "figures/screenshots/$r.png" ] || { echo "missing: figures/screenshots/$r.png"; missing=1; }
done
# \screenshotrow[h]{a,b,c}{...}  and  \screenshotpair[h]{a}{b}{...}
for r in $(grep -rhoE --include=*.tex "\\\\screenshotrow(\[[^]]*\])?\{[A-Za-z0-9_,]+\}" chapters appendices | grep -oE "\{[A-Za-z0-9_,]+\}$" | tr -d '{}' | tr ',' '\n' | sort -u) \
         $(grep -rhoE --include=*.tex "\\\\screenshotpair(\[[^]]*\])?\{$name\}\{$name\}" chapters appendices | grep -oE "\{$name\}" | tr -d '{}' | sort -u); do
  [ -f "figures/screenshots/$r.png" ] || { echo "missing: figures/screenshots/$r.png"; missing=1; }
done

[ $missing -eq 0 ] && echo "all screenshots present"
exit 0
