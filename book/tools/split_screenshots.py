#!/usr/bin/env python3
"""Cuts the long (scrolling) phone screenshots into consecutive panels.

A full-length screenshot of a scrolling screen can be 3-8 times taller than a page. The book shows
such a screen as N panels side by side (macro \\scrollshot), cut where the screen has a gap
(a uniform background row) so that cards and buttons are not sliced in half.

Usage (from the project root):   python3 tools/split_screenshots.py
Needs:  pip install pillow numpy
Output: figures/screenshots/slices/<name>-1.png, <name>-2.png, ...
Edit SPLITS below when you add or retake a long screenshot (name -> number of panels).
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'figures', 'screenshots')
OUT = os.path.join(SRC, 'slices')

# name (file in figures/screenshots/, without .png) -> number of panels
SPLITS = {
    'mobile_report': 2,
    'mobile_tracking_and_chat': 3,
    'mobile_mission': 2,
    'mobile_handoff': 3,
    'mobile_handoff2': 3,
    'mobile_medical': 2,
}

def find_cut(gray, ideal, window, min_run=6, tol=10):
    """Row index of the middle of the uniform-row run closest to `ideal` (within +-window)."""
    rng = gray.max(axis=1).astype(int) - gray.min(axis=1).astype(int)
    uniform = rng <= tol
    lo, hi = max(1, ideal - window), min(len(uniform) - 1, ideal + window)
    best, best_d = None, None
    i = lo
    while i < hi:
        if uniform[i]:
            j = i
            while j < hi and uniform[j]:
                j += 1
            if j - i >= min_run:
                mid = (i + j) // 2
                d = abs(mid - ideal)
                if best is None or d < best_d:
                    best, best_d = mid, d
            i = j
        else:
            i += 1
    return best if best is not None else ideal

def main():
    os.makedirs(OUT, exist_ok=True)
    for name, n in SPLITS.items():
        path = os.path.join(SRC, name + '.png')
        if not os.path.isfile(path):
            print('skip (missing):', name)
            continue
        img = Image.open(path).convert('RGB')
        gray = np.array(img.convert('L'))
        h = img.height
        window = int(0.09 * h)
        cuts = [0] + [find_cut(gray, round(k * h / n), window) for k in range(1, n)] + [h]
        for k in range(n):
            panel = img.crop((0, cuts[k], img.width, cuts[k + 1]))
            panel.save(os.path.join(OUT, '%s-%d.png' % (name, k + 1)), optimize=True)
        print('%-28s %d panels, cuts at %s' % (name, n, cuts[1:-1]))

if __name__ == '__main__':
    main()
