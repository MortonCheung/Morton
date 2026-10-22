#!/usr/bin/env python3
"""
MORTON wordmark — construction generator (Phase 1)
==================================================

The mark is NOT type. It is drawn from a small set of primitives on a fixed
grid, then emitted as SVG geometry. Two cuts come out of the same skeleton:

  A · DIDONE CUT    high-contrast serif: thick 124 / thin 36 / unbracketed
                    hairline slabs, custom M / O / R / T / N.
  B · GEOMETRIC CUT same skeleton with the serifs removed and flat terminals
                    (still 124/36 contrast), for a contemporary reading.

Grid (design units, cap height = 1000, y grows downward, baseline y = 1000)
--------------------------------------------------------------------------
  cap .................. 1000
  module u ............. 25   (40u per cap; every value is a multiple of u)
  vertical stroke ...... 124  (4.96u)
  horizontal hairline .. 36   (1.44u)  → contrast ratio 3.44 : 1 (print-safe)
  serif depth .......... 36
  serif extension ...... 58 each side
  O: outer 900 x 1024 (overshoot 12 top / 12 bottom), ring 124 / 36,
     aperture axis vertical, counter = pure inset ellipse (no superellipse)
  M: 124 stems; the two arms are 124 horizontal bands meeting in a flat
     124-wide vertex cut on the baseline (no pointed apex: keeps the mass)
  R: stem + a bowl ribbon (outer ellipse 520x540, inner 272x468) + a straight
     leg sheared at 34.5° with a flat cut foot
  N: 124 stems + a 124 diagonal band, two open counters
  T: 36 hairline bar over a 124 stem, foot slab

Spacing
-------
  placed on an explicit INK-GAP table, not advance widths:
  serif : M-O 52, O-R 40, R-T 36, T-O 36, O-N 48
  sans  : M-O 66, O-R 52, R-T 46, T-O 46, O-N 60
  (serif needs tighter gaps because the slabs already fill the side bearings)

Cut / crop
----------
  the mark is composed at a fixed design width; the *frame* crops it (see
  HeroFinal). Nothing inside the path is cropped; cropping is a composition
  decision, documented in WORDMARK.md.

Outputs
-------
  src/styleframes/wordmark.ts      geometry + metrics for the app
  docs/art-direction/wordmark/wordmark-study.html   three-variant study sheet
"""
import math, os, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_TS = os.path.join(ROOT, 'src', 'styleframes', 'wordmark.ts')
OUT_HTML = os.path.join(HERE, 'wordmark-study.html')

CAP = 1000.0
U = 25.0
THICK = 124.0
THIN = 36.0
SERIF_DEPTH = 36.0
SERIF_EXT = 58.0
K = 0.5522847498307936


def f(v):
    s = f'{v:.2f}'
    return s.rstrip('0').rstrip('.') if '.' in s else s


def ellipse(cx, cy, rx, ry, ccw=False):
    kx, ky = rx * K, ry * K
    if not ccw:
        return (
            f'M{f(cx + rx)},{f(cy)} '
            f'C{f(cx + rx)},{f(cy - ky)} {f(cx + kx)},{f(cy - ry)} {f(cx)},{f(cy - ry)} '
            f'C{f(cx - kx)},{f(cy - ry)} {f(cx - rx)},{f(cy - ky)} {f(cx - rx)},{f(cy)} '
            f'C{f(cx - rx)},{f(cy + ky)} {f(cx - kx)},{f(cy + ry)} {f(cx)},{f(cy + ry)} '
            f'C{f(cx + kx)},{f(cy + ry)} {f(cx + rx)},{f(cy + ky)} {f(cx + rx)},{f(cy)} Z'
        )
    return (
        f'M{f(cx + rx)},{f(cy)} '
        f'C{f(cx + rx)},{f(cy + ky)} {f(cx + kx)},{f(cy + ry)} {f(cx)},{f(cy + ry)} '
        f'C{f(cx - kx)},{f(cy + ry)} {f(cx - rx)},{f(cy + ky)} {f(cx - rx)},{f(cy)} '
        f'C{f(cx - rx)},{f(cy - ky)} {f(cx - kx)},{f(cy - ry)} {f(cx)},{f(cy - ry)} '
        f'C{f(cx + kx)},{f(cy - ry)} {f(cx + rx)},{f(cy - ky)} {f(cx + rx)},{f(cy)} Z'
    )


def rect(x0, y0, x1, y1):
    return f'M{f(x0)},{f(y0)} L{f(x1)},{f(y0)} L{f(x1)},{f(y1)} L{f(x0)},{f(y1)} Z'


def tri(a, b, c):
    return f'M{f(a[0])},{f(a[1])} L{f(b[0])},{f(b[1])} L{f(c[0])},{f(c[1])} Z'


def arc(cx, cy, rx, ry, a0, a1, move=True):
    """Elliptic arc from a0 to a1 (degrees, y-down: 0 = right, 90 = down).
    Emits cubic beziers; each sweep is split into <= 90 degree chunks."""
    import math
    out = ''
    total = a1 - a0
    steps = max(1, int(abs(total) // 90 + (1 if abs(total) % 90 else 0)))
    for i in range(steps):
        t0 = math.radians(a0 + total * i / steps)
        t1 = math.radians(a0 + total * (i + 1) / steps)
        d = t1 - t0
        k = 4.0 / 3.0 * math.tan(d / 4.0)
        x0, y0 = cx + rx * math.cos(t0), cy + ry * math.sin(t0)
        x1, y1 = cx + rx * math.cos(t1), cy + ry * math.sin(t1)
        c1 = (x0 - k * rx * math.sin(t0), y0 + k * ry * math.cos(t0))
        c2 = (x1 + k * rx * math.sin(t1), y1 - k * ry * math.cos(t1))
        if i == 0 and move:
            out += f'M{f(x0)},{f(y0)} '
        out += (f'C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(x1)},{f(y1)} ')
    return out.strip()


def ellipse_arc(cx, cy, rx, ry, ccw=False):
    return arc(cx, cy, rx, ry, 0, -360 if ccw else 360) + ' Z'


def tri_ccw(a, b, c):
    """reverse-wound triangle: punches a hole under nonzero fill"""
    return f'M{f(a[0])},{f(a[1])} L{f(c[0])},{f(c[1])} L{f(b[0])},{f(b[1])} Z'


# ── letters (ink-local coords) ──────────────────────────────────────────────

def band(a, b, c, d):
    """clockwise parallelogram (screen coords, y down)"""
    return f'M{f(a[0])},{f(a[1])} L{f(b[0])},{f(b[1])} L{f(c[0])},{f(c[1])} L{f(d[0])},{f(d[1])} Z'


def letter_M(serif):
    """left stem + right stem + two 124-wide arm bands meeting in a flat foot"""
    stemL = rect(0, 0, THICK, 1000)
    stemR = rect(1120 - THICK, 0, 1120, 1000)
    armL = band((124, 0), (248, 0), (622, 1000), (498, 1000))
    armR = band((872, 0), (996, 0), (622, 1000), (498, 1000))
    s = ''
    if serif:
        e, d = SERIF_EXT, SERIF_DEPTH
        s = ' '.join([
            rect(-e, 0, 124 + e, d),
            rect(996 - e, 0, 1120 + e, d),
            rect(-e, 1000 - d, 124 + e, 1000),
            rect(498 - e, 1000 - d, 622 + e, 1000),
            rect(996 - e, 1000 - d, 1120 + e, 1000),
        ])
    ink = (-SERIF_EXT if serif else 0, 0, 1120 + SERIF_EXT if serif else 1120, 1000)
    return ' '.join(x for x in [stemL, stemR, armL, armR, s] if x), ink


def letter_O(serif):
    d = (
        ellipse_arc(450, 500, 450, 512)
        + ' ' + ellipse_arc(450, 500, 450 - THICK, 512 - THIN, ccw=True)
    )
    return d, (0, -12, 900, 1012)


def letter_R(serif):
    stem = rect(0, 0, THICK, 1000)
    # bowl ribbon: outer 520x540 ellipse centred (500,270), inner 272x468
    outer = arc(500, 270, 260, 270, -90, 90, move=False)   # top -> right -> bottom
    inner = arc(500, 270, 136, 234, 90, -90, move=False)  # bottom -> right -> top
    bowl = (
        f'M{f(THICK)},0 L500,0 ' + outer
        + f' L{f(THICK)},540 L{f(THICK)},504 L500,504 ' + inner
        + f' L{f(THICK)},36 Z'
    )
    # leg: flat 124-wide band, sheared ~34.5 deg
    leg = 'M470,520 L594,520 L924,1000 L800,1000 Z'
    s = ''
    if serif:
        e = SERIF_EXT
        d = SERIF_DEPTH
        s = (
            rect(-e, 0, THICK + e, d)
            + ' ' + rect(-e, 1000 - d, THICK + e, 1000)
            + ' ' + rect(800 - e, 1000 - d, 924 + e, 1000)
        )
    ink = (-SERIF_EXT if serif else 0, 0, 924 + SERIF_EXT if serif else 924, 1000)
    return stem + ' ' + bowl + ' ' + leg + (' ' + s if s else ''), ink


def letter_T(serif):
    bar = rect(0, 0, 820, THIN)
    stem = rect(348, 0, 472, 1000)
    s = ''
    if serif:
        e = SERIF_EXT
        s = rect(348 - e, 1000 - SERIF_DEPTH, 472 + e, 1000)
    return bar + ' ' + stem + (' ' + s if s else ''), (0, 0, 820, 1000)


def letter_N(serif):
    """left stem + right stem + a 124-wide diagonal band"""
    stemL = rect(0, 0, THICK, 1000)
    stemR = rect(960 - THICK, 0, 960, 1000)
    diag = band((124, 0), (248, 0), (960, 1000), (836, 1000))
    s = ''
    if serif:
        e, d = SERIF_EXT, SERIF_DEPTH
        s = ' '.join([
            rect(-e, 0, 124 + e, d),
            rect(836 - e, 1000 - d, 960 + e, 1000),
        ])
    ink = (-SERIF_EXT if serif else 0, 0, 960 + SERIF_EXT if serif else 960, 1000)
    return ' '.join(x for x in [stemL, stemR, diag, s] if x), ink


LETTERS = {
    'M': letter_M,
    'O': letter_O,
    'R': letter_R,
    'T': letter_T,
    'N': letter_N,
}

# Internal construction lines ("structure") for the opening-cover line art:
# the same parameters as the glyphs, drawn without their outer silhouette.
def _ell(cx, cy, rx, ry):
    return ellipse_arc(cx, cy, rx, ry) if 'ellipse_arc' in globals() else ''

STRUCTURE = {
    'M': 'M124,0 L498,1000 M248,0 L622,1000 M872,0 L498,1000 M996,0 L622,1000',
    'O': arc(450, 500, 326, 476, 0, 360) + ' Z',
    'R': 'M636,270 C636,137.9 590.1,36 500,36 C450,36 430,40 400,50 M470,520 L800,1000 M594,520 L924,1000 M124,504 L124,540',
    'T': 'M0,36 H348 M472,36 H820',
    'N': 'M124,0 L836,1000 M248,0 L960,1000',
}

GAPS = {
    True:  {'MO': 52, 'OR': 40, 'RT': 36, 'TO': 36, 'ON': 48},
    False: {'MO': 66, 'OR': 52, 'RT': 46, 'TO': 46, 'ON': 60},
}


def build(serif):
    order = ['M', 'O', 'R', 'T', 'O', 'N']
    items = []
    for ch in order:
        d, ink = LETTERS[ch](serif)
        items.append({'ch': ch, 'd': d, 'ink': ink})
    placements = []
    cursor = None
    for i, it in enumerate(items):
        if i == 0:
            x = -it['ink'][0]
        else:
            pair = order[i - 1] + it['ch']
            x = cursor + GAPS[serif][pair] - it['ink'][0]
        ax0 = x + it['ink'][0]
        ax1 = x + it['ink'][2]
        placements.append({'ch': it['ch'], 'x': x, 'd': it['d'],
                           'structure': STRUCTURE[it['ch']],
                           'ink': [ax0, it['ink'][1], ax1, it['ink'][3]]})
        cursor = ax1
    width = cursor
    y0 = min(p['ink'][1] for p in placements)
    y1 = max(p['ink'][3] for p in placements)
    return {
        'name': 'DIDONE CUT' if serif else 'GEOMETRIC CUT',
        'serif': serif,
        'cap': CAP,
        'width': width,
        'ink': [0.0, y0, width, y1],
        'placements': placements,
        'gaps': GAPS[serif],
    }


def ts_export(mark):
    lines = []
    lines.append(f"  name: '{mark['name']}',")
    lines.append(f"  cap: {f(mark['cap'])},")
    lines.append(f"  width: {f(mark['width'])},")
    lines.append(f"  ink: [{f(mark['ink'][0])}, {f(mark['ink'][1])}, {f(mark['ink'][2])}, {f(mark['ink'][3])}],")
    lines.append("  letters: [")
    for p in mark['placements']:
        lines.append("    {")
        lines.append(f"      ch: '{p['ch']}',")
        lines.append(f"      x: {f(p['x'])},")
        lines.append(f"      ink: [{f(p['ink'][0])}, {f(p['ink'][1])}, {f(p['ink'][2])}, {f(p['ink'][3])}],")
        lines.append(f"      d: '{p['d']}',")
        lines.append(f"      structure: '{p.get('structure','')}',")
        lines.append("    },")
    lines.append("  ],")
    return "\n".join(lines)


def write_ts(marks):
    header = '''/**
 * MORTON wordmark — GENERATED GEOMETRY, do not hand-edit.
 *
 * Generated by docs/art-direction/wordmark/build-wordmark.py.
 * The mark is drawn, not typeset: see WORDMARK.md for the grid, stroke
 * weights, apertures, spacing table and crop rule.
 *
 * Design units: cap 1000, baseline y = 1000, y grows downward.
 * Ink box of each cut is given so the frame can align the baseline exactly.
 */

export interface MarkLetter {
  ch: string
  x: number
  /** [x0, y0, x1, y1] absolute to the word, design units */
  ink: [number, number, number, number]
  d: string
  /** internal construction lines (no outer silhouette) — cover line art only */
  structure: string
}

export interface MarkDef {
  name: string
  cap: number
  /** ink width of the whole word */
  width: number
  /** [x0, y0, x1, y1] of the whole word */
  ink: [number, number, number, number]
  letters: MarkLetter[]
}

'''
    body = 'export const MARKS = {\n'
    for key, mark in marks.items():
        body += f'  {key}: {{\n' + ts_export(mark) + '\n  } as MarkDef,\n'
    body += '} as const\n\n'
    body += "export type MarkId = keyof typeof MARKS\n"
    open(OUT_TS, 'w').write(header + body)
    print('wrote', OUT_TS, os.path.getsize(OUT_TS), 'bytes')


def svg_mark(mark, color='#1B1A18'):
    vb = f"{mark['ink'][0]} {mark['ink'][1]} {mark['width']} {mark['ink'][3] - mark['ink'][1]}"
    paths = ''.join(f'<path d="{p["d"]}" transform="translate({f(p["x"])} 0)"/>' for p in mark['placements'])
    return f'<svg viewBox="{vb}" fill="{color}" fill-rule="nonzero">{paths}</svg>'


def write_study(marks):
    A = marks['serif']
    B = marks['sans']
    def row(title, sub, mark, cap, extra=''):
        vb = f"{mark['ink'][0]} {mark['ink'][1]} {mark['width']} {mark['ink'][3] - mark['ink'][1]}"
        w = cap * mark['width'] / 1000.0
        h = cap * (mark['ink'][3] - mark['ink'][1]) / 1000.0
        paths = ''.join(f'<path d="{p["d"]}" transform="translate({f(p["x"])} 0)"/>' for p in mark['placements'])
        return f'''<section class="study">
  <div class="meta"><span class="tag">{title}</span><span class="sub">{sub}</span></div>
  <div class="stage" style="width:{f(w)}px;height:{f(h)}px">
    <svg viewBox="{vb}" width="{f(w)}" height="{f(h)}" fill="#1B1A18">{paths}</svg>{extra}
  </div>
</section>'''

    cut_extra = ''  # material window handled by CSS layers below
    html = f'''<!doctype html><html><head><meta charset="utf-8">
<title>MORTON — wordmark study</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500&display=swap');
html,body{{margin:0;background:#F2EFE8;color:#1B1A18;font-family:Helvetica,Arial,sans-serif}}
.page{{width:1440px;height:900px;padding:48px 64px 40px;box-sizing:border-box;display:flex;flex-direction:column;gap:22px}}
.head{{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #C9C1B6;padding-bottom:14px}}
.head h1{{font:400 22px/1 "Bodoni Moda",serif;letter-spacing:.02em;margin:0}}
.head .lbl{{font:11px/1.3 Helvetica;letter-spacing:.145em;text-transform:uppercase;color:#6C6962}}
.study{{display:flex;align-items:flex-end;gap:40px}}
.meta{{width:220px;flex:none;padding-bottom:6px}}
.tag{{display:block;font:11px/1.4 Helvetica;letter-spacing:.145em;text-transform:uppercase}}
.sub{{display:block;font:12px/1.5 Helvetica;color:#6C6962;margin-top:6px;max-width:24ch}}
.stage{{position:relative;flex:none}}
.stage svg{{display:block}}
.cut{{position:relative;background:#2A2521}}
.cut svg{{position:absolute;left:0;top:0}}
.cut svg path{{fill:#F2EFE8}}
.cut .edge{{position:absolute;inset:0;border:1px solid rgba(242,239,232,.28);pointer-events:none}}
.cut .cap{{position:absolute;left:14px;top:12px;font:10px/1 Helvetica;letter-spacing:.145em;color:#F2EFE8;opacity:.65}}
.foot{{margin-top:auto;border-top:1px solid #C9C1B6;padding-top:12px;display:flex;justify-content:space-between;font:11px/1.3 Helvetica;letter-spacing:.06em;color:#6C6962}}
</style></head><body>
<div class="page">
  <div class="head"><h1>MORTON — wordmark construction study</h1><span class="lbl">Phase 1 · three cuts · same skeleton</span></div>

  <section class="study">
    <div class="meta"><span class="tag">A · Didone Cut</span><span class="sub">High-contrast serif. 124 stem / 36 hairline, unbracketed slabs, custom M, O, R, T, N.</span></div>
    <div class="stage" style="width:647px;height:107px"><svg viewBox="{A['ink'][0]} {A['ink'][1]} {A['width']} {A['ink'][3]-A['ink'][1]}" width="647" height="107" fill="#1B1A18">{''.join(f'<path d="{p["d"]}" transform="translate({f(p["x"])} 0)"/>' for p in A['placements'])}</svg></div>
  </section>

  <section class="study">
    <div class="meta"><span class="tag">B · Geometric Cut</span><span class="sub">Same skeleton, serifs removed, flat terminals. Reads as a drawn mark, not a typeface.</span></div>
    <div class="stage" style="width:631px;height:107px"><svg viewBox="{B['ink'][0]} {B['ink'][1]} {B['width']} {B['ink'][3]-B['ink'][1]}" width="631" height="107" fill="#1B1A18">{''.join(f'<path d="{p["d"]}" transform="translate({f(p["x"])} 0)"/>' for p in B['placements'])}</svg></div>
  </section>

  <section class="study">
    <div class="meta"><span class="tag">C · Material Window</span><span class="sub">Cut A is punched out of the material. Paper is the letter; material is the field. Used as the hero weld.</span></div>
    <div class="stage cut" style="width:647px;height:151px">
      <svg viewBox="{A['ink'][0]} {A['ink'][1]} {A['width']} {A['ink'][3]-A['ink'][1]}" width="647" height="107" style="left:0;top:22px" fill="#F2EFE8">{''.join(f'<path d="{p["d"]}" transform="translate({f(p["x"])} 0)"/>' for p in A['placements'])}</svg>
      <span class="edge"></span><span class="cap">P.06 — LACQUER STUDY</span>
    </div>
  </section>

  <div class="foot"><span>grid: cap 1000 · module 25 · thick 124 · thin 36 · serif 36 × 58</span><span>ink-gap table · crop at frame, never inside a letter</span></div>
</div>
</body></html>'''
    open(OUT_HTML, 'w').write(html)
    print('wrote', OUT_HTML)


if __name__ == '__main__':
    A = build(True)
    B = build(False)
    print('A width', A['width'], 'cap', A['cap'], 'ink', A['ink'])
    print('B width', B['width'], 'ink', B['ink'])
    write_ts({'serif': A, 'sans': B})
    write_study({'serif': A, 'sans': B})
