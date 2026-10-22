#!/usr/bin/env node
/**
 * Phase 1 deliverable checker. Read-only.
 *
 *   node scripts/check-phase1.mjs
 *
 * Verifies that everything the Phase 1 gate demands actually exists, and prints
 * a PASS/FAIL table. Exits non-zero when a required item is missing so the Lead
 * cannot declare "done" on a partial delivery.
 */
import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FRAMES = ['00-opening-cover', '01-hero-final', '02-about-editorial', '03-works-exhibition', '04-project-focus']
const VIEWS = ['desktop', 'desktop-short', 'mobile']
const DOCS = [
  'docs/BASELINE_AUDIT.md',
  'docs/art-direction/REFERENCE_MATRIX.md',
  'docs/art-direction/ART_DIRECTION.md',
  'docs/art-direction/TYPOGRAPHY.md',
  'docs/art-direction/IMAGE_MATERIAL_GUIDE.md',
  'docs/art-direction/COLOR_SPACING_TOKENS.md',
  'docs/art-direction/ASSET_REGISTER.md',
  'docs/art-direction/ART_REVIEW.md',
  'docs/art-direction/frame-notes.md',
  'docs/art-direction/decisions.json',
]

const rows = []
const need = (label, ok) => rows.push([label, ok])

for (const d of DOCS) need(d, existsSync(path.join(ROOT, d)))

let shots = []
try {
  shots = (await readdir(path.join(ROOT, 'docs/art-direction/styleframes'))).filter((f) => f.endsWith('.png'))
} catch {
  /* missing dir */
}
for (const f of FRAMES) {
  for (const v of VIEWS) {
    // desktop-short is only required for works + focus per the brief
    if (v === 'desktop-short' && !['03-works-exhibition', '04-project-focus'].includes(f)) continue
    need(`shot ${f}.${v}.png`, shots.includes(`${f}.${v}.png`))
  }
}

// no stub components left behind
for (const f of FRAMES) {
  const map = {
    '00-opening-cover': 'OpeningCover.tsx',
    '01-hero-final': 'HeroFinal.tsx',
    '02-about-editorial': 'AboutEditorial.tsx',
    '03-works-exhibition': 'WorksExhibition.tsx',
    '04-project-focus': 'ProjectFocus.tsx',
  }
  const p = path.join(ROOT, 'src/styleframes', map[f])
  let stub = true
  if (existsSync(p)) {
    const src = await import('node:fs/promises').then((m) => m.readFile(p, 'utf8'))
    stub = src.includes('styleframe stub')
  }
  need(`frame implemented ${map[f]}`, !stub)
}

// no obvious phase-2 code yet
const pkg = JSON.parse(await import('node:fs/promises').then((m) => m.readFile(path.join(ROOT, 'package.json'), 'utf8')))
need('no three.js dependency in Phase 1', !pkg.dependencies?.three)

const bad = rows.filter(([, ok]) => !ok)
const pad = Math.max(...rows.map(([l]) => l.length))
console.log('\nPhase 1 deliverable check\n' + '─'.repeat(pad + 10))
for (const [label, ok] of rows) console.log(`${ok ? '✓' : '✗'}  ${label.padEnd(pad)}`)
console.log('─'.repeat(pad + 10))
console.log(`${rows.length - bad.length}/${rows.length} present`)
if (bad.length) {
  console.log(`\n${bad.length} missing — Phase 1 is NOT deliverable yet.`)
  process.exitCode = 1
} else {
  console.log('\nAll Phase 1 artefacts present. Status stays PENDING_VISUAL_APPROVAL until the user signs off.')
}

const shotDir = path.join(ROOT, 'docs/art-direction/styleframes')
if (existsSync(shotDir)) {
  for (const f of shots) {
    const s = await stat(path.join(shotDir, f))
    if (s.size < 12_000) console.log(`! ${f} is only ${Math.round(s.size / 1024)} KB — possibly a blank/broken capture`)
  }
}
