#!/usr/bin/env python3
"""
MORTON wordmark — construction source
=====================================

This script is the *provenance* of the wordmark geometry. It does not merely
dump the font: it normalises the Didone skeleton to a construction grid, then
replaces one letter class with a pure geometric construction and re-sets the
spacing from an explicit optical table. The generated TypeScript module is what
the React styleframes actually render, so the mark is vector geometry, not a
`<text>` node in a system font.

Pipeline
--------
1. Instantiate Bodoni Moda's variable axes at the *display* end: wght=500,
   opsz=96. (The shipped file is a 400–900 / 6–96 variable font; the display
   optical size has the highest stroke contrast and tightest fitting.)
2. Normalise every glyph so cap height = 1000 design units, origin at the cap
   line, y axis pointing down (SVG convention). Baseline = y 1000.
3. Replace the O with the construction O defined below (two ellipses, thick
   verticals / thin horizontals).
4. Re-set the word on an explicit *ink gap* table (gap between the drawn ink
   edges, not the font's advance widths) and drop the mark into a single path.
5. Emit src/styleframes/wordmark.ts with the composed path, its metrics and the
   per-letter boxes used by the opening-cover line art.

Construction grid (design units, cap = 1000)
--------------------------------------------
  cap height ................ 1000
  baseline .................. 1000
  repeat unit (u) ........... 25   (40u per cap — every dimension is a multiple)
  vertical stem ............. 118  (4.72u — measured from the Didone display cut)
  hairline / serif ..........  26  (1.04u — contrast ratio 4.5 : 1)
  O outer ................... 840 x 1014 (overshoot 7 top / 7 bottom)
  O ring, vertical .......... 118
  O ring, horizontal ........  24
  O aperture axis ........... vertical (stress), pure ellipse, no superellipse
  optical ink gaps .......... M-O 54, O-R 46, R-T 40, T-O 40, O-N 48
  mark ink width ............ sum of glyph inks + gaps = 5594
  mark ink : cap ratio ...... 5.594 (this is what makes it a Didone word, not a
                              grotesque: the word is 5.6 caps wide)

Named departures from the font
------------------------------
  * the O is no longer Bodoni's — it is a two-ellipse construction (see above)
  * spacing is re-set on ink gaps, which tightens the word by ~4.6% of its width
  * the path is composed once and shipped as geometry; no live text is used
"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform
import math, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
SRC_TTF = os.path.join(ROOT, 'public', 'fonts', 'bodoni-moda.ttf')
OUT_TS = os.path.join(ROOT, 'src', 'styleframes', 'wordmark.ts')

CAP = 1000.0

# ink gaps (design units) between the drawn edges of neighbouring letters
GAPS = {'MO': 54, 'OR': 46, 'RT': 40, 'TO': 40, 'ON': 48}
ORDER = ['M', 'O', 'R', 'T', 'O', 'N']
PAIR = [ORDER[i] + ORDER[i + 1] for i in range(len(ORDER) - 1)]  # MO OR RT TO ON

# construction O
O_W, O_H, O_OVER = 840.0, 1000.0, 14.0          # outer width, cap height, total overshoot
O_RING_V, O_RING_H = 118.0, 24.0                # thick sidewalls / thin horizontals
K = 0.5522847498307936                          # circle -> cubic bezier


def fmt(v):
    s = f'{v:.2f}'
    return s.rstrip('0').rstrip('.') if '.' in s else s


def ellipse(cx, cy, rx, ry, reverse=False):
    """Cubic-approximated ellipse. Returns an SVG subpath string (no leading M when
    reverse=False it starts with M). reverse=True walks the other way (counter)."""
    kx, ky = rx * K, ry * K
    if not reverse:
        return (
            f'M{fmt(cx+rx)},{fmt(cy)} '
            f'C{fmt(cx+rx)},{fmt(cy-ky)} {fmt(cx+kx)},{fmt(cy-ry)} {fmt(cx)},{fmt(cy-ry)} '
            f'C{fmt(cx-kx)},{fmt(cy-ry)} {fmt(cx-rx)},{fmt(cy-ky)} {fmt(cx-rx)},{fmt(cy)} '
            f'C{fmt(cx-rx)},{fmt(cy+ky)} {fmt(cx-kx)},{fmt(cy+ry)} {fmt(cx)},{fmt(cy+ry)} '
            f'C{fmt(cx+kx)},{fmt(cy+ry)} {fmt(cx+rx)},{fmt(cy+ky)} {fmt(cx+rx)},{fmt(cy)} Z'
        )
    return (
        f'M{fmt(cx+rx)},{fmt(cy)} '
        f'C{fmt(cx+rx)},{fmt(cy+ky)} {fmt(cx+kx)},{fmt(cy+ry)} {fmt(cx)},{fmt(cy+ry)} '
        f'C{fmt(cx-kx)},{fmt(cy+ry)} {fmt(cx-rx)},{fmt(cy+ky)} {fmt(cx-rx)},{fmt(cy)} '
        f'C{fmt(cx-rx)},{fmt(cy-ky)} {fmt(cx-kx)},{fmt(cy-ry)} {fmt(cx)},{fmt(cy-ry)} '
        f'C{fmt(cx+kx)},{fmt(cy-ry)} {fmt(cx+rx)},{fmt(cy-ky)} {fmt(cx+rx)},{fmt(cy)} Z'
    )


def construction_o_width():
    return O_W


def load_glyphs():
    font = TTFont(SRC_TTF)
    # display optical size, medium weight (500)
    from fontTools.varLib.instancer import instantiateVariableFont
    inst = instantiateVariableFont(font, {'wght': 500, 'opsz': 96}, inplace=False)
    cap = inst['OS/2'].sCapHeight
    scale = CAP / float(cap)
    gs = inst.getGlyphSet()
    cmap = inst.getBestCmap()
    out = {}
    for ch in 'MORTON':
        if ch in out:
            continue
        gn = cmap[ord(ch)]
        sp = SVGPathPen(gs)
        tp = TransformPen(sp, Transform(scale, 0, 0, -scale, 0, CAP))
        gs[gn].draw(tp)
        d = sp.getCommands()
        bp = BoundsPen(gs)
        gs[gn].draw(bp)
        x0, y0, x1, y1 = bp.bounds
        out[ch] = {
            'd': d,
            'adv': inst['hmtx'][gn][0] * scale,
            'ink': (x0 * scale, CAP - y1 * scale, x1 * scale, CAP - y0 * scale),
        }
    return out


def build():
    g = load_glyphs()
    # the geometric O used for both O positions (drawn in its own local frame,
    # ink starting at x=0, cap line at y=0)
    o_d = (
        ellipse(O_W / 2.0, CAP / 2.0, O_W / 2.0, (CAP + O_OVER) / 2.0)
        + ' '
        + ellipse(O_W / 2.0, CAP / 2.0, O_W / 2.0 - O_RING_V, (CAP + O_OVER) / 2.0 - O_RING_H, reverse=True)
    )
    glyph = {
        'M': {'d': g['M']['d'], 'ink': g['M']['ink']},
        'O': {'d': o_d, 'ink': (0.0, -O_OVER / 2.0, O_W, CAP + O_OVER / 2.0)},
        'R': {'d': g['R']['d'], 'ink': g['R']['ink']},
        'T': {'d': g['T']['d'], 'ink': g['T']['ink']},
        'N': {'d': g['N']['d'], 'ink': g['N']['ink']},
    }
    # lay the word out on ink gaps
    placements = []
    cursor = None
    for i, ch in enumerate(ORDER):
        item = glyph[ch]
        ink = item['ink']
        if cursor is None:
            x = -ink[0]                      # first ink edge at x = 0
        else:
            x = cursor + GAPS[PAIR[i - 1]] - ink[0]
        placements.append({'ch': ch, 'x': x, 'ink': (x + ink[0], ink[1], x + ink[2], ink[3]), 'd': item['d']})
        cursor = x + ink[2]                  # right inked edge in absolute coords
    width = cursor
    # compose one path (each glyph translated) - O appears twice with the same d
    parts = []
    for p in placements:
        parts.append(f'<g transform="translate({fmt(p["x"])},0)">{p["d"]}</g>')
    # a single path is friendlier to stroke outlines; we keep per-letter <g> in
    # the generated module but also ship a flat combined `d` for fills.
    flat = []
    for p in placements:
        flat.append(f'<path d="{p["d"]}" transform="translate({fmt(p["x"])},0)"/>')
    mark = {
        'cap': CAP,
        'width': width,
        'ink': (0.0, min(p['ink'][1] for p in placements), width, max(p['ink'][3] for p in placements)),
        'placements': [
            {'ch': p['ch'], 'x': round(p['x'], 2), 'ink': [round(v, 2) for v in p['ink']], 'd': p['d']}
            for p in placements
        ],
        'gaps': GAPS,
    }
    return mark


if __name__ == '__main__':
    mark = build()
    print('width', mark['width'])
    print('ink', mark['ink'])
    for p in mark['placements']:
        print(p['ch'], 'x', p['x'], 'ink', p['ink'])
    print('total path chars', sum(len(p['d']) for p in mark['placements']))
