#!/usr/bin/env python3
"""Makes safe-size copies of very large screenshots so every TeX installation can embed them.

Some TeX/PDF toolchains silently skip images above roughly 4 million pixels (a full-length phone screenshot
can have 8 million). The screens are shown only 2-6 cm wide on paper, so a smaller copy looks identical.

For every PNG in figures/screenshots/ that is taller than 3600 px or has more than 3.9 million pixels, this
writes a resampled copy of the WHOLE screen (nothing is cropped) to figures/screenshots/print/<same name>.
The original is never touched, and the book uses the copy only when it exists.

Usage (from the project root):   python3 tools/prepare_screenshots.py      (or: make images)
Needs:  pip install pillow
Run it again whenever you add or retake a screenshot, and keep the files in print/ with the project
(Overleaf cannot run scripts).
"""
import os
import glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'figures', 'screenshots')
OUT = os.path.join(SRC, 'print')
# A screenshot is resampled only if it is taller than LIMIT_H or larger than LIMIT_PIXELS;
# the copy is then made at most MAX_H high and MAX_PIXELS in size.
LIMIT_H, LIMIT_PIXELS = 3600, 3.9e6
MAX_H, MAX_PIXELS = 3400, 3.4e6

def main():
    os.makedirs(OUT, exist_ok=True)
    for path in sorted(glob.glob(os.path.join(SRC, '*.png'))):
        name = os.path.basename(path)
        img = Image.open(path)
        w, h = img.size
        scale = 1.0
        if h > LIMIT_H or w * h > LIMIT_PIXELS:
            scale = min(1.0, MAX_H / h, (MAX_PIXELS / (w * h)) ** 0.5)
        target = os.path.join(OUT, name)
        if scale >= 1.0:
            if os.path.exists(target):
                os.remove(target)
            print('%-30s %5dx%-5d ok as is' % (name, w, h))
            continue
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        small = img.convert('RGB').resize((nw, nh), Image.LANCZOS)
        small.save(target, optimize=True, dpi=(96, 96))
        print('%-30s %5dx%-5d -> %dx%d (whole screen, %.1f MP)' % (name, w, h, nw, nh, nw * nh / 1e6))

if __name__ == '__main__':
    main()
