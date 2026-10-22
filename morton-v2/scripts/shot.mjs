#!/usr/bin/env node
/**
 * Styleframe screenshot harness (Phase 1 evidence).
 *
 *   node scripts/shot.mjs                          # all five frames, all viewports
 *   node scripts/shot.mjs --only 01-hero-final     # one frame
 *   node scripts/shot.mjs --out docs/art-direction/styleframes
 *
 * Viewports: 1440x900 (primary), 1440x700 (short desktop), 390x844 (mobile).
 * Uses the system Chrome through playwright-core; serialised behind the same
 * machine-wide lock the rest of the MORTON work uses, so parallel agents do not
 * starve the 8 GB box.
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, stat, rm } from 'node:fs/promises'
import path from 'node:path'

const arg = (n, f) => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? f : process.argv[i + 1]
}

const BASE = arg('url', 'http://127.0.0.1:5290/')
const OUT = arg('out', 'docs/art-direction/styleframes')
const ONLY = arg('only', '')
const LOCK = '/tmp/morton-browser-gate'
const FRAMES = ['00-opening-cover', '01-hero-final', '02-about-editorial', '03-works-exhibition', '04-project-focus']
const VIEWS = [
  ['desktop', 1440, 900, 1],
  ['desktop-short', 1440, 700, 1],
  ['mobile', 390, 844, 2],
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function acquireLock(dir, timeoutMs = 20 * 60 * 1000) {
  const start = Date.now()
  for (;;) {
    try {
      await mkdir(dir)
      return async () => rm(dir, { recursive: true, force: true }).catch(() => {})
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      try {
        const s = await stat(dir)
        if (Date.now() - s.mtimeMs > 25 * 60 * 1000) await rm(dir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      if (Date.now() - start > timeoutMs) throw new Error('browser lock timeout')
      await sleep(4000)
    }
  }
}

const release = await acquireLock(LOCK)
const frames = ONLY ? [ONLY] : FRAMES
const report = { base: BASE, startedAt: new Date().toISOString(), shots: [], problems: [] }

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--disable-dev-shm-usage'],
})

try {
  await mkdir(OUT, { recursive: true })
  for (const frame of frames) {
    for (const [view, w, h, dpr] of VIEWS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
      page.on('console', (m) => {
        if (m.type() !== 'error') return
        const loc = m.location()?.url || ''
        if (/favicon/i.test(loc)) return
        errors.push(m.text().slice(0, 200))
      })
      page.on('response', (r) => {
        if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`)
      })
      await page.goto(`${BASE}#/${frame}`, { waitUntil: 'load', timeout: 45000 })
      await page.waitForTimeout(900)
      const file = path.join(OUT, `${frame}.${view}.png`)
      await page.screenshot({ path: file })
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        fonts: [...document.fonts].map((f) => `${f.family}:${f.status}`),
      }))
      const overflowX = metrics.scrollWidth - metrics.clientWidth
      if (overflowX > 0) report.problems.push({ frame, view, problem: `horizontal overflow ${overflowX}px` })
      if (errors.length) report.problems.push({ frame, view, errors })
      report.shots.push({ frame, view, file, w, h, dpr, overflowX, scrollHeight: metrics.scrollHeight, fonts: metrics.fonts })
      console.log(`✓ ${frame} ${view} ${w}x${h}${overflowX > 0 ? `  OVERFLOW ${overflowX}px` : ''}${errors.length ? `  ERRORS ${errors.length}` : ''}`)
      await ctx.close()
    }
  }
} catch (e) {
  report.fatal = String(e)
  console.error('FATAL', e)
} finally {
  await browser.close()
  await release()
}

report.finishedAt = new Date().toISOString()
await mkdir(path.dirname(path.join(OUT, 'x')), { recursive: true })
await writeFile(path.join(OUT, 'SHOT_REPORT.json'), JSON.stringify(report, null, 2))
console.log(`\n${report.shots.length} screenshots -> ${OUT}`)
console.log(`problems: ${report.problems.length}`)
if (report.fatal) process.exit(1)
