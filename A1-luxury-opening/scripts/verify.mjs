#!/usr/bin/env node
/**
 * A1 acceptance checks that the shared capture harness does not cover:
 * replay, reduced motion, delayed critical assets, independent letter
 * transforms, shared-O geometry and repeated-replay heap growth.
 *
 *   node scripts/verify.mjs --url http://127.0.0.1:5181/
 *
 * Writes docs/VERIFY_REPORT.json and exits non-zero if a hard assertion fails.
 * Uses the same machine-wide browser lock as scripts/capture.mjs (not modified).
 */
import { chromium } from 'playwright-core'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { stat } from 'node:fs/promises'
import { rm } from 'node:fs/promises'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const URL_ = arg('url', 'http://127.0.0.1:5181/')
const LOCK = arg('lock', '/tmp/morton-browser-gate')

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

const noisy = (t) => /favicon|React DevTools|WebGL: INVALID|software WebGL|Automatic fallback/i.test(t)
const results = { url: URL_, startedAt: new Date().toISOString(), checks: {}, problems: [] }
let failures = 0

function check(name, condition, detail) {
  const pass = Boolean(condition)
  results.checks[name] = { pass, detail }
  if (!pass) {
    failures += 1
    results.problems.push({ check: name, detail })
  }
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail === undefined ? '' : JSON.stringify(detail)}`)
}

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

function attach(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !noisy(m.text())) errors.push(m.text().slice(0, 400))
  })
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 400)))
  return errors
}

const readProbe = (page) =>
  page.evaluate(() => {
    const p = window.__MORTON__
    if (!p) return null
    return {
      state: p.state,
      timings: p.timings,
      runs: p.extra?.runs ?? [],
      letters: p.letters,
      geometry: p.extra?.geometry ?? null,
      renderer: p.extra?.renderer ?? null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvases: document.querySelectorAll('canvas').length,
    }
  })

try {
  // ---------------------------------------------------------------- main run
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errors = attach(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 12000 }).catch(() => {})
    const probe = await readProbe(page)
    check('main.state.hero', probe?.state === 'hero', probe?.state)
    check('main.draw>=1000ms', (probe?.timings?.drawMs ?? 0) >= 1000, probe?.timings)
    check(
      'main.expand.450..650ms',
      (probe?.timings?.expandMs ?? 0) >= 450 && (probe?.timings?.expandMs ?? 0) <= 650,
      probe?.timings?.expandMs,
    )
    check('main.letters=6', probe?.letters?.length === 6, probe?.letters?.length)
    check('main.sharedOGeometry', probe?.geometry?.sharedOGeometry === true, probe?.geometry)
    check('main.uniqueGeometries=5', probe?.geometry?.uniqueGeometries === 5, probe?.geometry?.uniqueGeometries)
    check('main.layoutMatch', probe?.geometry?.layoutMatch === true, probe?.geometry?.layoutMatch)
    check('main.noOverflowX', probe?.overflowX === 0, probe?.overflowX)
    check('main.noConsoleErrors', errors.length === 0, errors)

    // ------------------------------------------------------------ replay x3
    const runsBefore = probe?.runs?.length ?? 0
    const heapBefore = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null).catch(() => null)
    const replayTimings = []
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('r')
      await page.waitForFunction(
        (count) => (window.__MORTON__?.extra?.runs?.length ?? 0) === count,
        runsBefore + i + 1,
        { timeout: 12000 },
      ).catch(() => {})
      await page.waitForTimeout(300)
      const p = await readProbe(page)
      replayTimings.push(p?.runs?.[p.runs.length - 1] ?? null)
    }
    const after = await readProbe(page)
    const heapAfter = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null).catch(() => null)
    check('replay.runsRecorded', (after?.runs?.length ?? 0) === runsBefore + 3, after?.runs?.length)
    check(
      'replay.eachRunTimed',
      replayTimings.every((r) => r && r.drawMs >= 1000 && r.expandMs >= 450 && r.expandMs <= 650),
      replayTimings,
    )
    check('replay.singleCanvas', after?.canvases === 1, after?.canvases)
    check('replay.stateHero', after?.state === 'hero', after?.state)
    check('replay.noConsoleErrors', errors.length === 0, errors)
    results.replay = { heapBefore, heapAfter, deltaMB: heapBefore && heapAfter ? +((heapAfter - heapBefore) / 1048576).toFixed(2) : null, replayTimings }
    await ctx.close()
  }

  // ------------------------------------------------ independent transforms
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errors = attach(page)
    await page.goto(`${URL_}?debug=1`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 12000 }).catch(() => {})
    const before = await page.evaluate(() => window.__MORTON__?.letters ?? [])
    const nudged = await page.evaluate(() => window.__MORTON_DEBUG__?.nudgeLetter('O-4', [0.3, 0.2, 0]) ?? false)
    await page.waitForTimeout(120)
    const after = await page.evaluate(() => window.__MORTON__?.letters ?? [])
    const byId = (list, id) => list.find((l) => l.id === id)
    const o1Before = byId(before, 'O-1')
    const o1After = byId(after, 'O-1')
    const o4After = byId(after, 'O-4')
    check('letters.nudgeApplied', nudged === true, nudged)
    check(
      'letters.secondODiffers',
      JSON.stringify(o4After?.rotation) !== JSON.stringify(o1After?.rotation),
      { o1: o1After?.rotation, o4: o4After?.rotation },
    )
    check('letters.firstOUnchanged', JSON.stringify(o1Before?.rotation) === JSON.stringify(o1After?.rotation))
    check(
      'letters.othersUnchanged',
      after.filter((l) => l.id !== 'O-4').every((l, i) => JSON.stringify(l.rotation) === JSON.stringify(before[i]?.rotation)),
    )
    check('letters.noConsoleErrors', errors.length === 0, errors)
    await ctx.close()
  }

  // ---------------------------------------------------------- reduced motion
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const errors = attach(page)
    await page.goto(URL_, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__MORTON__?.state === 'reduced', null, { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(1200)
    const probe = await readProbe(page)
    check('reduced.state', probe?.state === 'reduced', probe?.state)
    check('reduced.letters=6', probe?.letters?.length === 6, probe?.letters?.length)
    check('reduced.lettersVisible', probe?.letters?.every((l) => l.visible) === true)
    check('reduced.noConsoleErrors', errors.length === 0, errors)
    await ctx.close()
  }

  // -------------------------------------------------------------- forced reduced
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errors = attach(page)
    await page.goto(`${URL_}?motion=reduced`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__MORTON__?.state === 'reduced', null, { timeout: 12000 }).catch(() => {})
    const probe = await readProbe(page)
    check('forcedReduced.state', probe?.state === 'reduced', probe?.state)
    check('forcedReduced.noConsoleErrors', errors.length === 0, errors)
    await ctx.close()
  }


  // ------------------------------------------------- visibility pause/resume
  // Headless Chrome does not emit a real hidden state for a background tab, so
  // the property is overridden and the event dispatched. This exercises the
  // page's own handler and pause/resume path, not the browser's tab switching.
  {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } })
    const page = await ctx.newPage()
    const errors = attach(page)
    await page.goto(URL_, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__MORTON__?.state === 'drawing', null, { timeout: 8000 })
    await page.waitForTimeout(200)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(1200)
    const hidden = await readProbe(page)
    check('visibility.pausesDrawing', hidden?.state === 'drawing' && hidden?.timings?.builtAt === undefined, hidden?.state)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 9000 }).catch(() => {})
    const resumed = await readProbe(page)
    check('visibility.resumes', resumed?.state === 'hero', resumed?.state)
    check('visibility.drawStillValid', (resumed?.timings?.drawMs ?? 0) >= 1000, resumed?.timings?.drawMs)
    check('visibility.noConsoleErrors', errors.length === 0, errors)
    results.visibility = { hiddenState: hidden?.state, resumedTimings: resumed?.timings }
    await ctx.close()
  }

  // --------------------------------------------------------- delayed assets
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errors = attach(page)
    await page.goto(`${URL_}?assetDelay=2200`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__MORTON__?.state === 'built', null, { timeout: 9000 }).catch(() => {})
    const built = await readProbe(page)
    const builtAt = built?.timings?.builtAt ?? 0
    check('delay.waitInBuilt', built?.state === 'built', built?.state)
    check('delay.noEarlyExpand', built?.timings?.expandingAt === undefined, built?.timings?.expandingAt)
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 15000 }).catch(() => {})
    const done = await readProbe(page)
    const gap = (done?.timings?.expandingAt ?? 0) - (done?.timings?.builtAt ?? 0)
    check('delay.expandAfterRealReady', gap >= 1000, { gap, timings: done?.timings })
    check('delay.drawStillCompletes', (done?.timings?.drawMs ?? 0) >= 1000, done?.timings?.drawMs)
    check('delay.noConsoleErrors', errors.length === 0, errors)
    results.delayed = { builtAt, gap, timings: done?.timings }
    await ctx.close()
  }
} catch (e) {
  results.fatal = String(e)
  failures += 1
} finally {
  await browser.close()
  await release()
}

results.finishedAt = new Date().toISOString()
results.failures = failures
await mkdir('docs', { recursive: true })
await writeFile('docs/VERIFY_REPORT.json', JSON.stringify(results, null, 2))
console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} → docs/VERIFY_REPORT.json`)
if (failures > 0 || results.fatal) process.exit(1)
