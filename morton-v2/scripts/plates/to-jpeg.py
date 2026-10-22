#!/usr/bin/env python3
"""Phase 4 asset pass: convert the original PNG plates to progressive JPEG.

The plates are photographic material studies; PNG is lossless and therefore ~6x
heavier than needed for web delivery. This keeps the exact pixel dimensions and
writes quality-88 progressive JPEGs, then removes the PNGs. Re-runnable.

Usage: python3 scripts/plates/to-jpeg.py
"""
from pathlib import Path
from PIL import Image
import json, os

root = Path(__file__).resolve().parents[2]
plates = root / 'public' / 'assets' / 'plates'
manifest = json.loads((plates / 'PLATES.json').read_text())
total_before = total_after = 0
converted = {}
for p in sorted(plates.glob('*.png')):
    if p.name == 'contact-sheet.png':
        continue
    before = p.stat().st_size
    im = Image.open(p).convert('RGB')
    out = p.with_suffix('.jpg')
    im.save(out, 'JPEG', quality=88, optimize=True, progressive=True)
    after = out.stat().st_size
    total_before += before
    total_after += after
    converted[p.name] = out.name
    p.unlink()
    print(f'{p.name:28s} {before/1e6:5.2f} MB -> {out.name:26s} {after/1e6:5.2f} MB')
# contact sheet too
cs = plates / 'contact-sheet.png'
if cs.exists():
    im = Image.open(cs).convert('RGB')
    im.save(plates / 'contact-sheet.jpg', 'JPEG', quality=86, optimize=True, progressive=True)
    cs.unlink()

def rewrite(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == 'file' and isinstance(v, str) and v in converted:
                node[k] = converted[v]
            else:
                rewrite(v)
    elif isinstance(node, list):
        for v in node:
            rewrite(v)

rewrite(manifest)
(plates / 'PLATES.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'\ntotal {total_before/1e6:.2f} MB -> {total_after/1e6:.2f} MB')
