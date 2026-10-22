#!/usr/bin/env node
/**
 * A2 real-browser verification.
 *
 *   node scripts/verify.mjs
 *
 * Proves, against the running dev server:
 *   - the probe state sequence and measured draw / expand / total timings;
 *   - the two O's share one geometry instance while transforms stay independent;
 *   - a genuinely delayed critical texture holds `built` and then expands;
 *   - the reduced-motion path never starts the drawing timeline;
 *   - 5 replays do not create a second canvas, listeners, geometries or errors;
 *   - dispose() returns owned resources and listeners to zero.
 *
 * Uses the machine-wide browser lock from scripts/capture.mjs so the five prototypes
 * do not fight over 8 GB of RAM.
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const URL_ = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://127.0.0.1:5182/'
const OUT = 'docs/VERIFICATION.json'
const LOCK = '/tmp/morton-browser-gate'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const result = {
  url: URL_,
  startedAt: new Date().toISOString(),
  checks: [],
  problems: [],
  timing: null,
  independence: null,
  delayedGate: null,
  reducedMotion: null,
  replay: null,
  lifecycle: null,
}

function check(name, pass, detail) {
  result.checks.push({ name, pass: Boolean(pass), detail })
  if (!pass) result.problems.push({ name, detail })
}

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
      if (Date.now() - start > timeoutMs) throw new Error(`browser lock timeout (${dir})`)
      await sleep(4000)
    }
  }
}

async function installRecorder(context) {
  await context.addInitScript(() => {
    window.__A2_RECORD__ = []
    const tick = () => {
      const probe = window.__MORTON__
      if (probe) {
        const record = window.__A2_RECORD__
        const last = record[record.length - 1]
        if (!last || last.state !== probe.state) {
          record.push({
            state: probe.state,
            at: Math.round(performance.now()),
            timings: { ...probe.timings },
          })
        }
      }
      setTimeout(tick, 5)
    }
    tick()
  })
}

function wireErrors(page) {
  const errors = { console: [], page: [], http: [] }
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|React DevTools/i.test(m.text())) {
      errors.console.push(m.text().slice(0, 400))
    }
  })
  page.on('pageerror', (e) => errors.page.push(String(e).slice(0, 400)))
  page.on('response', (res) => {
    if (res.status() >= 400) errors.http.push(`${res.status()} ${res.url()}`)
  })
  return errors
}

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

try {
  // ---------------------------------------------------------------------------------------
  // 1. First load: state sequence + measured timings + independent letters
  // ---------------------------------------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    await installRecorder(ctx)
    const page = await ctx.newPage()
    const errors = wireErrors(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 20000 })
    await page.waitForTimeout(700)

    const data = await page.evaluate(() => ({
      probe: window.__MORTON__,
      record: window.__A2_RECORD__,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvases: document.querySelectorAll('canvas').length,
      title: document.title,
    }))
    const t = data.probe.timings
    const drawMs = t.builtAt - t.drawingAt
    const expandMs = t.heroAt - t.expandingAt
    const totalMs = t.heroAt - t.drawingAt
    const states = data.record.map((r) => r.state)
    const order = ['loading', 'drawing', 'built', 'expanding', 'hero']
    let cursor = -1
    const ordered = order.every((state) => {
      const idx = states.indexOf(state, cursor + 1)
      if (idx === -1) return false
      cursor = idx
      return true
    })

    result.timing = { states, drawMs, expandMs, totalMs, timings: t, canvases: data.canvases, overflowX: data.overflowX }
    check('state sequence loading→drawing→built→expanding→hero', ordered, states)
    check('drawing ≥ 1000 ms', drawMs >= 1000, `${drawMs} ms`)
    check('expanding 450–650 ms', expandMs >= 450 && expandMs <= 650, `${expandMs} ms`)
    check('drawing + expanding ≤ 2000 ms', totalMs <= 2000, `${totalMs} ms`)
    check('six letters exposed with transforms', data.probe.letters?.length === 6, data.probe.letters?.length)
    check('no horizontal overflow', data.overflowX === 0, data.overflowX)
    check('single canvas', data.canvases === 1, data.canvases)
    check('no console / page / http errors on load', errors.console.length + errors.page.length + errors.http.length === 0, errors)

    const ids = data.probe.extra?.letterGeometryIds ?? []
    check('two O meshes share one geometry', ids.length === 6 && ids[1] && ids[1] === ids[4], ids)
    check('five unique glyph geometries for six letters', new Set(ids).size === 5, [...new Set(ids)].length)

    // Independent transforms: rotate M and R, move the second O, hide T.
    const before = data.probe.letters
    const independence = await page.evaluate(() => {
      const debug = window.__MORTON_DEBUG__
      debug.setLetter(0, { rotation: [0, 0.4, 0] })
      debug.setLetter(2, { rotation: [0.2, 0, 0] })
      const o4 = window.__MORTON__.letters[4]
      debug.setLetter(4, { position: [o4.position[0] + 0.1, o4.position[1], o4.position[2]] })
      debug.setLetter(3, { visible: false })
      return window.__MORTON__.letters
    })
    const changed = []
    for (let i = 0; i < 6; i++) {
      const a = before[i]
      const b = independence[i]
      const moved =
        a.position[0] !== b.position[0] || a.position[1] !== b.position[1] || a.position[2] !== b.position[2]
      const rotated =
        a.rotation[0] !== b.rotation[0] || a.rotation[1] !== b.rotation[1] || a.rotation[2] !== b.rotation[2]
      const hidden = a.visible !== b.visible
      if (moved || rotated || hidden) changed.push(i)
    }
    check('independent letters: only M(0), R(2), O(4), T(3) changed', changed.join(',') === '0,2,3,4', changed)
    await page.evaluate(() => window.__MORTON_DEBUG__.resetLetters())
    const restored = await page.evaluate(() => window.__MORTON__.letters)
    const allRestored = restored.every(
      (l, i) =>
        l.position.every((v, k) => Math.abs(v - before[i].position[k]) < 1e-6) &&
        l.rotation.every((v, k) => Math.abs(v - before[i].rotation[k]) < 1e-6) &&
        l.visible === before[i].visible,
    )
    check('letters restore exactly after debug changes', allRestored, restored.map((l) => l.id))
    result.independence = { changed, ids, allRestored }

    await page.screenshot({ path: 'docs/SCREENSHOTS/hero-verification-1440.png' })
    await ctx.close()
  }

  // ---------------------------------------------------------------------------------------
  // 2. Delayed critical texture: hold built, then expand without extra waiting
  // ---------------------------------------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    await installRecorder(ctx)
    await ctx.route('**/mineral-tooth.png', async (route) => {
      await sleep(2500)
      await route.continue()
    })
    const page = await ctx.newPage()
    const errors = wireErrors(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'built', null, { timeout: 12000 })
    const builtProbe = await page.evaluate(() => window.__MORTON__)
    await page.waitForTimeout(500)
    const heldState = await page.evaluate(() => window.__MORTON__?.state)
    await page.screenshot({ path: 'docs/SCREENSHOTS/gate-hold-1440.png' })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 12000 })
    const probe = await page.evaluate(() => window.__MORTON__)
    const t = probe.timings
    result.delayedGate = { builtAt: t.builtAt, expandingAt: t.expandingAt, heroAt: t.heroAt, heldState, errors }
    check('delayed texture: state holds at built', heldState === 'built', heldState)
    check('delayed texture: expansion waited for the real asset', t.expandingAt - t.builtAt >= 500, t.expandingAt - t.builtAt)
    check('delayed texture: expand still ~500 ms', t.heroAt - t.expandingAt >= 450 && t.heroAt - t.expandingAt <= 650, t.heroAt - t.expandingAt)
    check('delayed texture: no runtime errors', errors.console.length + errors.page.length + errors.http.length === 0, errors)
    void builtProbe
    await ctx.close()
  }

  // ---------------------------------------------------------------------------------------
  // 3. Reduced motion: static reduced state, no drawing timeline
  // ---------------------------------------------------------------------------------------
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    })
    await installRecorder(ctx)
    const page = await ctx.newPage()
    const errors = wireErrors(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'reduced', null, { timeout: 12000 })
    await page.waitForTimeout(300)
    const probe = await page.evaluate(() => window.__MORTON__)
    const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length)
    result.reducedMotion = { state: probe.state, timings: probe.timings, canvases, errors }
    check('reduced motion reaches state reduced', probe.state === 'reduced', probe.state)
    check('reduced motion never runs drawing', probe.timings.drawingAt === undefined, probe.timings.drawingAt)
    check('reduced motion keeps the six letters and one canvas', probe.letters.length === 6 && canvases === 1, { letters: probe.letters.length, canvases })
    check('reduced motion: no runtime errors', errors.console.length + errors.page.length + errors.http.length === 0, errors)
    await page.screenshot({ path: 'docs/SCREENSHOTS/reduced-motion-1440.png' })
    await ctx.close()
  }

  // ---------------------------------------------------------------------------------------
  // 4. Replay stress + lifecycle dispose
  // ---------------------------------------------------------------------------------------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    const errors = wireErrors(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 20000 })
    // Let the replay button's 800 ms opacity/transform reveal settle before a real click.
    await page.waitForTimeout(1200)
    const before = await page.evaluate(() => ({
      stats: window.__MORTON_DEBUG__.stats(),
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    }))

    const runs = []
    for (let i = 1; i <= 5; i++) {
      await page.click('[data-replay]')
      await page.waitForFunction(
        (n) => window.__MORTON__?.state === 'hero' && window.__MORTON__?.runs === n,
        i + 1,
        { timeout: 20000 },
      )
      await page.waitForTimeout(1000)
      const sample = await page.evaluate(() => ({
        runs: window.__MORTON__.runs,
        state: window.__MORTON__.state,
        timings: window.__MORTON__.timings,
        canvases: document.querySelectorAll('canvas').length,
      }))
      runs.push({
        run: sample.runs,
        drawMs: sample.timings.builtAt - sample.timings.drawingAt,
        expandMs: sample.timings.heroAt - sample.timings.expandingAt,
        canvases: sample.canvases,
      })
    }
    const after = await page.evaluate(() => ({
      stats: window.__MORTON_DEBUG__.stats(),
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    }))

    const statsStable =
      before.stats.geometries === after.stats.geometries &&
      before.stats.textures === after.stats.textures &&
      before.stats.listeners === after.stats.listeners &&
      before.stats.canvases === after.stats.canvases
    result.replay = { before, after, runs, statsStable }
    check('replay 5× reaches hero every time', runs.length === 5 && runs.every((r) => r.drawMs >= 1000), runs)
    check('replay 5× keeps one canvas', runs.every((r) => r.canvases === 1), runs.map((r) => r.canvases))
    check('replay 5× does not grow geometries/textures/listeners', statsStable, { before: before.stats, after: after.stats })
    check(
      'replay heap delta reported (no hard threshold)',
      true,
      { before: before.heap, after: after.heap, delta: before.heap && after.heap ? after.heap - before.heap : null },
    )
    check('replay: no runtime errors', errors.console.length + errors.page.length + errors.http.length === 0, errors)

    const disposed = await page.evaluate(() => {
      window.__MORTON_DEBUG__.dispose()
      return {
        stats: window.__MORTON_DEBUG__.stats(),
        canvases: document.querySelectorAll('canvas').length,
      }
    })
    result.lifecycle = disposed
    const s = disposed.stats
    check('dispose marks the scene disposed', s.disposed === true, s.disposed)
    check('dispose removes the canvas', disposed.canvases === 0 && s.canvases === 0, disposed.canvases)
    check('dispose removes all listeners', s.listeners === 0, s.listeners)
    check('dispose returns owned geometries and textures to zero', s.owned?.geometries === 0 && s.owned?.textures === 0, s.owned)
    check('dispose releases renderer geometries', s.geometries === 0, s.geometries)
    check('dispose releases renderer textures', s.textures === 0, s.textures)
    await ctx.close()
  }
} catch (err) {
  result.problems.push({ name: 'verification harness', detail: String(err) })
  check('verification harness completed', false, String(err))
} finally {
  await browser.close()
  await release()
}

result.finishedAt = new Date().toISOString()
result.ok = result.checks.every((c) => c.pass)
await writeFile(OUT, JSON.stringify(result, null, 2))
console.log(
  JSON.stringify(
    {
      ok: result.ok,
      checks: result.checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.name}`),
      problems: result.problems,
      timing: result.timing,
      delayedGate: result.delayedGate,
      replay: result.replay?.runs,
      lifecycle: result.lifecycle?.stats,
    },
    null,
    2,
  ),
)
if (!result.ok) process.exit(1)
