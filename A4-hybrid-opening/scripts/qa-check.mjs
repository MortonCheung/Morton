#!/usr/bin/env node
/**
 * A4 QA harness — independent of capture.mjs (which stays untouched).
 *
 *   node scripts/qa-check.mjs [--url http://127.0.0.1:5184/]
 *
 * Checks, all in a real Chrome:
 *  1. six letters, independent transforms, both O meshes sharing one geometry
 *  2. the real resource gate holds the opening in `built` when delayed
 *  3. reduced-motion path reaches `reduced`, never `drawing`
 *  4. five replays: geometry/texture counts constant, heap sampled (observational)
 *  5. console/page errors and horizontal overflow
 *
 * Serialised behind the same machine-wide browser lock as capture.mjs.
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const URL_ = arg('url', 'http://127.0.0.1:5184/')
const OUT = arg('out', 'docs/QA_REPORT_RAW.json')
const LOCK = arg('lock', '/tmp/morton-browser-gate')

async function acquireLock(dir, timeoutMs = 20 * 60 * 1000) {
  const start = Date.now()
  for (;;) {
    try {
      await mkdir(dir)
      return async () => rm(dir, { recursive: true, force: true }).catch(() => {})
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      try {
        const info = await stat(dir)
        if (Date.now() - info.mtimeMs > 25 * 60 * 1000) await rm(dir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      if (Date.now() - start > timeoutMs) throw new Error(`browser lock timeout (${dir})`)
      await sleep(4000)
    }
  }
}

const report = { url: URL_, startedAt: new Date().toISOString(), checks: [], errors: [] }
const errorsOf = (page) => {
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|React DevTools|WebGL: INVALID|software WebGL/i.test(message.text())) {
      consoleErrors.push(message.text().slice(0, 300))
    }
  })
  page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 300)))
  return { consoleErrors, pageErrors }
}

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

const record = (name, pass, detail) => {
  report.checks.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`, detail === undefined ? '' : JSON.stringify(detail))
}

try {
  // --- 1. letters -------------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const errs = errorsOf(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 25000 })
    const before = await page.evaluate(() => window.__MORTON_DEBUG__?.letters() ?? [])
    const o = before.filter((letter) => letter.char === 'O')
    record('six letters exposed', before.length === 6, before.map((letter) => letter.id))
    record(
      'both O meshes share one geometry',
      o.length === 2 && o[0].geometryUuid === o[1].geometryUuid,
      o.map((letter) => letter.geometryUuid),
    )
    record(
      'two O meshes have independent transforms',
      o.length === 2 && (o[0].position[0] !== o[1].position[0] || o[0].position[2] !== o[1].position[2]),
      o.map((letter) => letter.position),
    )

    const rotated = await page.evaluate(() => {
      window.__MORTON_DEBUG__?.rotateLetter('M-0', [0, 0.42, 0])
      window.__MORTON_DEBUG__?.setLetterVisible('O-4', false)
      return window.__MORTON_DEBUG__?.letters() ?? []
    })
    const m = rotated.find((letter) => letter.id === 'M-0')
    const moved = rotated.filter((letter) => letter.id !== 'M-0')
    const untouched = moved.every((letter) => Math.abs(letter.rotation[1]) < 1e-6)
    const hidden = rotated.find((letter) => letter.id === 'O-4')?.visible === false
    const othersVisible = rotated.filter((letter) => letter.id !== 'O-4').every((letter) => letter.visible)
    record('rotating M does not move the other letters', untouched && Math.abs(m.rotation[1] - 0.42) < 1e-3, {
      rotation: m?.rotation,
    })
    record('hiding one O leaves the others visible', hidden && othersVisible)
    await page.evaluate(() => window.__MORTON_DEBUG__?.resetLetters())

    const probe = await page.evaluate(() => window.__MORTON__)
    const t = probe.timings
    const drawMs = t.builtAt - t.drawingAt
    const expandMs = t.heroAt - t.expandingAt
    record('draw >= 1000ms', drawMs >= 1000, { drawMs })
    record('expand 450-650ms', expandMs >= 450 && expandMs <= 650, { expandMs })
    const gateWasEarly = t.criticalReadyAt < t.builtAt
    record(
      'when resources were early, the full draw still played',
      gateWasEarly ? drawMs >= 1000 : true,
      { gateWasEarly, criticalReadyAt: t.criticalReadyAt, builtAt: t.builtAt, drawMs },
    )

    // --- 4. five replays -----------------------------------------------------
    const memory = []
    for (let i = 0; i < 5; i++) {
      const previousMount = await page.evaluate(() => window.__MORTON__?.timings?.mountedAt ?? 0)
      await page.click('[data-replay]')
      await page.waitForFunction(
        (previous) =>
          window.__MORTON__?.state === 'hero' && (window.__MORTON__?.timings?.mountedAt ?? 0) > previous,
        previousMount,
        { timeout: 30000 },
      )
      await page.waitForTimeout(350)
      memory.push(
        await page.evaluate(() => ({
          heap: performance.memory ? performance.memory.usedJSHeapSize : null,
          geometries: window.__MORTON__?.extra?.renderer?.geometries ?? null,
          textures: window.__MORTON__?.extra?.renderer?.textures ?? null,
          programs: window.__MORTON__?.extra?.renderer?.programs ?? null,
          state: window.__MORTON__?.state,
          drawMs: window.__MORTON__?.extra?.durations?.drawMs,
          totalMs: window.__MORTON__?.extra?.durations?.totalMs,
        })),
      )
    }
    const geometryCounts = memory.map((sample) => sample.geometries)
    const textureCounts = memory.map((sample) => sample.textures)
    const heapSamples = memory.map((sample) => sample.heap)
    record('geometry count stable across 5 replays', new Set(geometryCounts).size === 1, { geometryCounts })
    record('texture count stable across 5 replays', new Set(textureCounts).size === 1, { textureCounts })
    record('heap samples recorded (observational)', heapSamples.every((value) => value !== null), { heapSamples })

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    record('no horizontal overflow at 1440', overflow === 0, { overflow })
    record('no console or page errors', errs.consoleErrors.length === 0 && errs.pageErrors.length === 0, errs)
    await context.close()
  }

  // --- 2. delayed critical gate ------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const errs = errorsOf(page)
    await page.goto(`${URL_}${URL_.includes('?') ? '&' : '?'}gateDelay=3000`, { waitUntil: 'load', timeout: 45000 })
    const states = []
    const start = Date.now()
    let sawBuilt = false
    let builtAtWall = null
    let expandingAtWall = null
    for (let i = 0; i < 400; i++) {
      const state = await page.evaluate(() => window.__MORTON__?.state ?? null)
      if (states[states.length - 1]?.state !== state) states.push({ state, at: Date.now() - start })
      if (state === 'built') {
        sawBuilt = true
        if (builtAtWall === null) builtAtWall = Date.now() - start
      }
      if (state === 'expanding') expandingAtWall = Date.now() - start
      if (state === 'hero') break
      await page.waitForTimeout(50)
    }
    const timings = await page.evaluate(() => window.__MORTON__?.timings ?? null)
    record('delayed gate passes through built', sawBuilt, states)
    record(
      'expand waits for the real gate (>=1200ms after built)',
      expandingAtWall !== null && builtAtWall !== null && expandingAtWall - builtAtWall >= 1200,
      { builtAtWall, expandingAtWall, gateWaitMs: (timings?.expandingAt ?? 0) - (timings?.builtAt ?? 0) },
    )
    record('reaches hero after delayed gate', (await page.evaluate(() => window.__MORTON__?.state)) === 'hero', timings)
    record('no console errors with delayed gate', errs.consoleErrors.length === 0, errs)
    await context.close()
  }

  // --- 3. reduced motion -------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errs = errorsOf(page)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page
      .waitForFunction(() => window.__MORTON__?.state === 'reduced', null, { timeout: 25000 })
      .catch(() => {})
    const state = await page.evaluate(() => window.__MORTON__?.state)
    const phases = await page.evaluate(() => Object.keys(window.__MORTON__?.timings ?? {}))
    record('reduced motion reaches reduced state', state === 'reduced', { state, phases })
    record('reduced motion never enters drawing', !phases.includes('drawingAt'), phases)
    record('no console errors in reduced motion', errs.consoleErrors.length === 0, errs)
    await context.close()
  }
} catch (error) {
  report.errors.push(String(error))
  console.error('QA fatal:', error)
} finally {
  await browser.close()
  await release()
}

report.finishedAt = new Date().toISOString()
report.passed = report.checks.every((check) => check.pass) && report.errors.length === 0
await mkdir(path.dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ passed: report.passed, failed: report.checks.filter((c) => !c.pass), errors: report.errors }, null, 2))
if (!report.passed) process.exit(1)
