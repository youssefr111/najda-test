#!/usr/bin/env python3
"""Suggests where to cut a long (scrolling) screenshot into panels.

The screenshot files are never modified: the book clips them at compile time (macro \\scrollshot).
This helper only prints cut positions that fall in gaps of the screen (uniform background rows),
so cards and buttons are not sliced in half.

Usage:  python3 tools/suggest_cuts.py mobile_report 2
        python3 tools/suggest_cuts.py mobile_tracking_and_chat 3
Prints a ready-to-paste line, e.g.   \\scrollshot[0.5205]{mobile_report}{Caption.}{fig:label}
Needs:  pip install pillow numpy
"""
import os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def find_cut(gray, ideal, window, min_run=6, tol=10):
    rng = gray.max(axis=1).astype(int) - gray.min(axis=1).astype(int)
    uniform = rng <= tol
    lo, hi = max(1, ideal - window), min(len(uniform) - 1, ideal + window)
    best, best_d, i = None, None, lo
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
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    name, n = sys.argv[1], int(sys.argv[2])
    path = os.path.join(ROOT, 'figures', 'screenshots', name + '.png')
    img = Image.open(path).convert('L')
    gray, h = np.array(img), img.height
    cuts = [find_cut(gray, round(k * h / n), int(0.09 * h)) for k in range(1, n)]
    frac = ','.join('%.4f' % (c / h) for c in cuts)
    print('%s: %d px high, cuts at %s' % (name, h, cuts))
    print('\\scrollshot[%s]{%s}{Caption.}{fig:label}' % (frac, name))

if __name__ == '__main__':
    main()
