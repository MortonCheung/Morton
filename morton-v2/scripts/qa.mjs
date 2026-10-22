#!/usr/bin/env node
/**
 * Phase 2/3/4 evidence capture.
 *
 *   node scripts/qa.mjs                 # full pass
 *   node scripts/qa.mjs --only 1440     # one viewport group
 *
 * Produces docs/qa/:
 *   screenshots/<view>-{00-first,30-drawing,100-built,reveal,hero}.png
 *   screenshots/<view>-works.png, <view>-focus.png
 *   recording/opening-<view>.webm
 *   qa-raw.json  (timings, frame deltas, console, overflow, counts)
 *
 * Everything comes from the real browser. No self-reported numbers.
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, rm, readdir, rename } from 'node:fs/promises'
import path from 'node:path'

const OUT = 'docs/qa'
const BASE = process.env.QA_URL || 'http://127.0.0.1:5290/'
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : ''
// recordVideo is very expensive on this 8GB box and stalls headless captures;
// recordings are captured in a dedicated run (see docs/qa/OPENING_TEST_REPORT.md)
const NO_VIDEO = process.argv.includes('--no-video')
const VIEWS = ONLY
  ? [['1440x900', 1440, 900, 1]].filter(([n]) => n.includes(ONLY))
  : [
      ['1440x900', 1440, 900, 1],
      ['1440x700', 1440, 700, 1],
      ['1366x768', 1366, 768, 1],
      ['1024x768', 1024, 768, 1],
      ['390x844', 390, 844, 2],
    ]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const report = { base: BASE, startedAt: new Date().toISOString(), views: [], flows: [], problems: [] }

async function newPage(browser, w, h, dpr, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 720, hasTouch: w < 720, ...opts })
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const loc = m.location()?.url || ''
    if (/favicon/i.test(loc)) return
    errors.push(m.text().slice(0, 240))
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) failed.push(`${r.status()} ${r.url()}`)
  })
  return { ctx, page, errors, failed }
}

async function waitState(page, state, timeout = 15000) {
  await page.waitForFunction((s) => window.__MORTON__?.state === s, state, { timeout }).catch(() => {})
}

async function openingPass(browser, name, w, h, dpr, record = false) {
  const rawDir = path.join(OUT, 'recording/.raw')
  if (record) {
    await rm(rawDir, { recursive: true, force: true })
    await mkdir(rawDir, { recursive: true })
  }
  const { ctx, page, errors, failed } = await newPage(browser, w, h, dpr, record ? { recordVideo: { dir: rawDir, size: { width: w, height: h } } } : {})
  const dir = path.join(OUT, 'screenshots')
  await mkdir(dir, { recursive: true })

  await page.addInitScript(() => {
    // record every frame delta WITH its timestamp so long frames can be
    // attributed to a phase (boot / drawing / reveal / hero) instead of
    // silently inflating a "max" number
    window.__FRAMES__ = []
    window.__SPIKES__ = []
    const t0 = performance.now()
    let last = t0
    const tick = (t) => {
      const d = Math.round((t - last) * 10) / 10
      window.__FRAMES__.push(d)
      if (d > 50) window.__SPIKES__.push({ at: Math.round(t - t0), d })
      last = t
      if (t - t0 < 5000) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  const t0 = Date.now()
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // first paint of the cover
  await page.waitForFunction(() => window.__MORTON__?.state === 'drawing', null, { timeout: 15000 }).catch(() => {})
  await sleep(260)
  await page.screenshot({ path: path.join(dir, `${name}-30-drawing.png`) })
  await waitState(page, 'built')
  await page.screenshot({ path: path.join(dir, `${name}-100-built.png`) })
  await waitState(page, 'reveal')
  await sleep(260)
  await page.screenshot({ path: path.join(dir, `${name}-reveal.png`) })
  await waitState(page, 'hero')
  await sleep(280)
  await page.screenshot({ path: path.join(dir, `${name}-hero.png`) })
  const heroAt = Date.now() - t0
  const probe = await page.evaluate(() => window.__MORTON__ ?? null)
  const frames = await page.evaluate(() => window.__FRAMES__ ?? [])
  const spikes = await page.evaluate(() => window.__SPIKES__ ?? [])
  const t = probe?.timings ?? {}
  const classify = (at) => {
    if (t.drawing == null || at < t.drawing) return 'boot'
    if (t.built == null || at < t.built) return 'drawing'
    if (t.reveal == null || at < t.reveal) return 'hold'
    if (t.hero == null || at < t.hero) return 'reveal'
    return 'hero'
  }
  const classifiedSpikes = spikes.map((sp) => ({ ...sp, phase: classify(sp.at) }))
  const sorted = [...frames].sort((a, b) => a - b)
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : null
  const max = sorted.length ? sorted[sorted.length - 1] : null
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  // scroll through the site, capture sections
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  for (const id of ['about', 'record', 'making', 'works', 'next']) {
    const found = await page.evaluate((s) => {
      const el = document.getElementById(s)
      if (!el) return false
      el.scrollIntoView({ behavior: 'instant', block: 'start' })
      return true
    }, id)
    if (!found) continue
    await sleep(520)
    await page.screenshot({ path: path.join(dir, `${name}-section-${id}.png`) })
  }

  let video = null
  if (record) {
    await page.close()
    await ctx.close()
    const files = (await readdir(rawDir).catch(() => [])).filter((f) => f.endsWith('.webm'))
    if (files.length) {
      const target = path.join(OUT, 'recording', `opening-${name}.webm`)
      await mkdir(path.dirname(target), { recursive: true })
      await rename(path.join(rawDir, files[0]), target).catch(() => {})
      video = target
    }
  } else {
    await ctx.close()
  }

  const entry = { view: name, w, h, dpr, heroAt, probe, frameDeltas: { n: frames.length, p95, max }, spikes: classifiedSpikes, overflowX, scrollHeight, errors, failed, video }
  if (errors.length || failed.length) report.problems.push({ view: name, errors, failed })
  if (overflowX > 0) report.problems.push({ view: name, issue: `horizontal overflow ${overflowX}px` })
  report.views.push(entry)
  return entry
}

async function focusFlow(browser) {
  const { ctx, page, errors } = await newPage(browser, 1440, 900, 1)
  await page.goto(BASE, { waitUntil: 'load' })
  await waitState(page, 'hero')
  await page.evaluate(() => document.getElementById('works')?.scrollIntoView({ behavior: 'instant' }))
  await sleep(600)
  const before = await page.evaluate(() => window.scrollY)
  await page.locator('[data-project-card]').first().click()
  await sleep(800)
  await page.screenshot({ path: path.join(OUT, 'screenshots/1440x900-focus.png') })
  const opened = await page.evaluate(() => ({
    overlay: !!document.querySelector('[data-detail]'),
    active: document.activeElement?.getAttribute('data-detail-close') !== null,
    locked: document.documentElement.classList.contains('is-focus-open'),
  }))
  await page.keyboard.press('Escape')
  await sleep(800)
  const closed = await page.evaluate(() => ({
    overlay: !!document.querySelector('[data-detail]'),
    active: document.activeElement?.getAttribute('data-work') || null,
    scroll: window.scrollY,
  }))
  // repeat 5x to check stacking / leaks
  const cycles = []
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-project-card]').nth(i % 3).click()
    await sleep(420)
    await page.keyboard.press('Escape')
    await sleep(420)
    cycles.push(
      await page.evaluate(() => ({
        overlays: document.querySelectorAll('[data-detail]').length,
        nodes: document.querySelectorAll('*').length,
        scroll: window.scrollY,
      })),
    )
  }
  await ctx.close()
  report.flows.push({ flow: 'focus', before, opened, closed, cycles, errors })
}

async function reducedMotion(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  const t0 = Date.now()
  await waitState(page, 'hero', 12000)
  const ms = Date.now() - t0
  const probe = await page.evaluate(() => window.__MORTON__ ?? null)
  const cover = await page.evaluate(() => getComputedStyle(document.querySelector('[data-cover]')).opacity)
  await ctx.close()
  report.flows.push({ flow: 'reduced-motion', ms, state: probe?.state, coverOpacity: cover })
}

async function lateReady(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}?gateDelay=2200`, { waitUntil: 'load' })
  await waitState(page, 'built', 15000)
  const builtAt = Date.now()
  await sleep(1200)
  const stillCovered = await page.evaluate(() => !document.querySelector('[data-cover]')?.hasAttribute('hidden'))
  await waitState(page, 'hero', 15000)
  const heroAt = Date.now()
  const probe = await page.evaluate(() => window.__MORTON__ ?? null)
  await ctx.close()
  report.flows.push({ flow: 'late-ready', heldMs: heroAt - builtAt, stillCoveredDuringHold: stillCovered, probe })
}

async function replay(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const runs = []
  for (let i = 0; i < 5; i++) {
    await page.goto(BASE, { waitUntil: 'load' })
    await waitState(page, 'hero', 15000)
    const p = await page.evaluate(() => window.__MORTON__ ?? null)
    const t = p?.timings ?? {}
    runs.push({ draw: (t.built ?? 0) - (t.drawing ?? 0), reveal: (t.hero ?? 0) - (t.reveal ?? 0), total: t.hero ?? 0 })
  }
  await ctx.close()
  report.flows.push({ flow: 'reload-x5', runs })
}

await mkdir(path.join(OUT, 'screenshots'), { recursive: true })
await mkdir(path.join(OUT, 'recording'), { recursive: true })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--disable-dev-shm-usage'] })
try {
  for (const [name, w, h, dpr] of VIEWS) await openingPass(browser, name, w, h, dpr, !NO_VIDEO && (name === '1440x900' || name === '390x844'))
  await focusFlow(browser)
  await reducedMotion(browser)
  await lateReady(browser)
  await replay(browser)
} catch (e) {
  report.fatal = String(e)
  console.error('FATAL', e)
} finally {
  await browser.close()
  await rm(path.join(OUT, 'recording/.raw'), { recursive: true, force: true }).catch(() => {})
}

report.finishedAt = new Date().toISOString()
await writeFile(path.join(OUT, 'qa-raw.json'), JSON.stringify(report, null, 2))
console.log(
  JSON.stringify(
    {
      views: report.views.map((v) => ({ v: v.view, heroAt: v.heroAt, draw: (v.probe?.timings.built ?? 0) - (v.probe?.timings.drawing ?? 0), p95: v.frameDeltas.p95, max: v.frameDeltas.max, overflowX: v.overflowX, errs: v.errors.length })),
      flows: report.flows,
      problems: report.problems,
      fatal: report.fatal ?? null,
    },
    null,
    1,
  ),
)
if (report.fatal) process.exit(1)
