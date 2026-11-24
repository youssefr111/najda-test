# Convenience targets (the real build logic lives in latexmkrc)
.PHONY: pdf print clean watch placeholders tables images

pdf:            ## Screen edition -> build/NAJDA_Project_Book.pdf
	latexmk main.tex

print:          ## Double-sided print edition -> build/NAJDA_Project_Book.pdf
	sed 's/\\printeditionfalse/\\printeditiontrue/' main.tex > main_print.tex
	latexmk main_print.tex
	rm -f main_print.tex

watch:          ## Rebuild on every save
	latexmk -pvc main.tex

placeholders:   ## List everything that still needs real content
	./tools/placeholders.sh

images:         ## Make safe-size copies of very large screenshots (figures/screenshots/print)
	python3 tools/prepare_screenshots.py

tables:         ## Regenerate the specification tables from tools/stream.json
	python3 tools/gen_tables.py tools/stream.json

clean:
	latexmk -C
	rm -rf build main_print.tex
