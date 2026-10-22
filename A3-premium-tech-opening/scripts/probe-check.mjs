#!/usr/bin/env node
/**
 * Functional / timing / performance verification for the A3 opening prototype.
 *
 *   node scripts/probe-check.mjs --url http://127.0.0.1:5183/
 *
 * Verifies the real browser behaviour that screenshots cannot prove:
 *  - state order + measured drawing / expanding / total timings
 *  - the six letters are independently transformable
 *  - the two O meshes share one BufferGeometry
 *  - the real-asset gate holds the built state (with ?delayAsset, a QA-only hold)
 *  - replay x5 does not grow geometry / texture / heap counters
 *  - reduced-motion path reaches `reduced` without the timeline states
 *  - a rough frame-rate sample in the hero state
 *
 * Uses the same machine-wide browser lock as capture.mjs.
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const URL_ = arg('url', 'http://127.0.0.1:5183/')
const LOCK = arg('lock', '/tmp/morton-browser-gate')
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
      if (Date.now() - start > timeoutMs) throw new Error(`browser lock timeout (${dir})`)
      await sleep(4000)
    }
  }
}

const results = []
const check = (name, pass, detail) => {
  results.push({ name, pass: Boolean(pass), detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: process.env.PW_HEADED ? false : true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

const report = { url: URL_, startedAt: new Date().toISOString(), checks: results, runs: {} }

try {
  // ---------------------------------------------------------------- normal run
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 300)))
  await page.goto(URL_, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 25000 })
  const probe = await page.evaluate(() => JSON.parse(JSON.stringify(window.__MORTON__)))
  const t = probe.timings
  const drawMs = t.builtAt - t.drawingAt
  const expandMs = t.heroAt - t.expandingAt
  const totalMs = t.heroAt - t.mountedAt

  check('state order ends at hero', probe.state === 'hero', probe.state)
  check(
    'timings strictly ordered',
    t.drawingAt < t.builtAt && t.builtAt <= t.expandingAt && t.expandingAt < t.heroAt,
    JSON.stringify({ drawingAt: t.drawingAt, builtAt: t.builtAt, expandingAt: t.expandingAt, heroAt: t.heroAt }),
  )
  check('drawing >= 1000ms', drawMs >= 1000, `${drawMs}ms`)
  check('expanding 450-700ms', expandMs >= 450 && expandMs <= 700, `${expandMs}ms`)
  check('total <= 2200ms (normal assets)', totalMs <= 2200, `${totalMs}ms`)
  check('six letters exposed', probe.letters?.length === 6, `${probe.letters?.length}`)
  check('shared O geometry', probe.extra?.geometry?.sharedO === true && probe.extra?.geometry?.byLetter?.[1] === probe.extra?.geometry?.byLetter?.[4], `unique=${probe.extra?.geometry?.unique}, meshes=${probe.extra?.geometry?.meshes}`)

  // individual transform control: only the addressed letter may change
  const indep = await page.evaluate(() => {
    const dbg = window.__MORTON_DEBUG__
    dbg.setLetter(0, { rotationY: 0.31 })
    const after0 = JSON.parse(JSON.stringify(window.__MORTON__.letters))
    dbg.setLetter(4, { visible: false })
    const after4 = JSON.parse(JSON.stringify(window.__MORTON__.letters))
    dbg.resetLetters()
    const reset = JSON.parse(JSON.stringify(window.__MORTON__.letters))
    return { after0, after4, reset }
  })
  const changed0 = indep.after0.filter((l) => Math.abs(l.rotation[1]) > 0.001)
  check(
    'letter 0 rotates independently',
    changed0.length === 1 && changed0[0].id === probe.letters[0].id,
    changed0.map((l) => l.id).join(','),
  )
  const hidden = indep.after4.filter((l) => l.visible === false)
  check(
    'second O hides independently, first O stays visible',
    hidden.length === 1 && hidden[0].id === probe.letters[4].id && indep.after4[1].visible === true,
    hidden.map((l) => l.id).join(','),
  )
  check('resetLetters restores transforms', indep.reset.every((l) => l.visible && Math.abs(l.rotation[1]) < 0.001))

  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0
        const start = performance.now()
        const tick = () => {
          frames += 1
          if (performance.now() - start < 2000) requestAnimationFrame(tick)
          else resolve(Math.round((frames / (performance.now() - start)) * 1000))
        }
        requestAnimationFrame(tick)
      }),
  )
  check('hero frame rate sampled >= 40fps (headless, shared machine)', fps >= 40, `${fps}fps`)

  // ------------------------------------------------------------------- replays
  const heapBefore = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : null))
  const replaySamples = []
  for (let i = 0; i < 5; i++) {
    await page.click('[data-replay]')
    await page.waitForFunction((n) => window.__MORTON__?.extra?.replays === n, i + 1, { timeout: 5000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'drawing', null, { timeout: 5000 }).catch(() => {})
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 25000 })
    await page.waitForTimeout(600)
    replaySamples.push(
      await page.evaluate(() => ({
        heap: performance.memory ? performance.memory.usedJSHeapSize : null,
        replays: window.__MORTON__?.extra?.replays ?? null,
        lastRun: window.__MORTON__?.extra?.lastRun ?? null,
        renderer: window.__MORTON_DEBUG__?.rendererInfo() ?? null,
        state: window.__MORTON__?.state,
      })),
    )
  }
  const heapAfter = replaySamples[replaySamples.length - 1].heap
  check('replay reaches hero 5/5', replaySamples.every((s) => s.state === 'hero'), replaySamples.map((s) => s.state).join(','))
  check('replay counter tracked', replaySamples[4].replays === 5, String(replaySamples[4].replays))
  const first = replaySamples[0].renderer
  check(
    'geometry/texture counts stable across replays',
    first?.geometries === 5 &&
      replaySamples.every(
        (s) => s.renderer?.geometries === first.geometries && s.renderer?.textures === first.textures,
      ),
    replaySamples.map((s) => `${s.renderer?.geometries}g/${s.renderer?.textures}t`).join(' '),
  )
  check(
    'heap does not grow monotonically over replays',
    heapBefore !== null && heapAfter !== null && heapAfter < heapBefore * 1.8,
    `before=${Math.round((heapBefore ?? 0) / 1e6)}MB after=${Math.round((heapAfter ?? 0) / 1e6)}MB`,
  )
  report.runs.replay = { heapBefore, samples: replaySamples }
  await context.close()

  // ------------------------------------------------------- delayed asset gate
  const slowContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const slow = await slowContext.newPage()
  await slow.goto(`${URL_}?delayAsset=1600`, { waitUntil: 'load' })
  await slow.waitForFunction(() => window.__MORTON__?.state === 'built', null, { timeout: 25000 })
  const builtProbe = await slow.evaluate(() => JSON.parse(JSON.stringify(window.__MORTON__)))
  await slow.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 25000 })
  const slowProbe = await slow.evaluate(() => JSON.parse(JSON.stringify(window.__MORTON__)))
  const holdMs = slowProbe.timings.expandingAt - slowProbe.timings.builtAt
  const builtAt = slowProbe.timings.builtAt
  const delayHonored = slowProbe.timings.assetsReadyAt - builtAt >= 250 && slowProbe.timings.expandingAt >= slowProbe.timings.mountedAt + 1500
  check(
    'delayed asset: waits in built state for the real asset promise',
    delayHonored,
    `built+${holdMs}ms -> expanding, assetsReadyAt=${slowProbe.timings.assetsReadyAt}`,
  )
  check('delayed asset: still ends at hero', slowProbe.state === 'hero', slowProbe.state)
  report.runs.delayed = { builtProbe: builtProbe.timings, final: slowProbe.timings, holdMs }
  await slowContext.close()

  // ---------------------------------------------------------- reduced motion
  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const reducedPage = await reducedContext.newPage()
  await reducedPage.goto(URL_, { waitUntil: 'load' })
  await reducedPage.waitForFunction(
    () => ['reduced', 'hero'].includes(window.__MORTON__?.state ?? ''),
    null,
    { timeout: 25000 },
  )
  await reducedPage.waitForTimeout(600)
  const reduced = reducedPage
  const reducedProbe = await reduced.evaluate(() => JSON.parse(JSON.stringify(window.__MORTON__)))
  const chromeOpacity = await reduced.evaluate(() =>
    Number(getComputedStyle(document.querySelector('.chrome')).opacity),
  )
  check('reduced motion path is `reduced`', reducedProbe.state === 'reduced', reducedProbe.state)
  check('reduced motion does not run the drawing timeline', reducedProbe.timings.drawingAt === undefined)
  check('reduced motion still shows the chrome', chromeOpacity > 0.9, `opacity=${chromeOpacity}`)
  check('reduced motion still exposes six letters', reducedProbe.letters?.length === 6, `${reducedProbe.letters?.length}`)
  report.runs.reduced = { probe: reducedProbe, chromeOpacity }
  await reducedContext.close()

  // --------------------------------------------------- font failure fallback
  const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const fallbackPage = await fallbackContext.newPage()
  await fallbackPage.route('**/fonts/*.ttf', (route) => route.abort())
  await fallbackPage.goto(URL_, { waitUntil: 'load' })
  await fallbackPage.waitForFunction(() => document.documentElement.dataset.assetFallback === 'font', null, {
    timeout: 15000,
  })
  const fallbackState = await fallbackPage.evaluate(() => ({
    state: window.__MORTON__?.state,
    fallbackVisible: Boolean(document.querySelector('.fallback-word')),
    extra: window.__MORTON__?.extra?.assetFallback,
    hasCanvas: Boolean(document.querySelector('canvas')),
  }))
  check(
    'font failure falls back to a readable wordmark, never a permanent loader',
    fallbackState.state === 'hero' && fallbackState.fallbackVisible && fallbackState.extra === 'font',
    JSON.stringify(fallbackState),
  )
  report.runs.fontFallback = fallbackState
  await fallbackContext.close()

  check('no console / page errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 400))
  report.consoleErrors = consoleErrors
} catch (error) {
  report.fatal = String(error)
  check('script completed without fatal error', false, String(error))
} finally {
  await browser.close()
  await release()
}

report.finishedAt = new Date().toISOString()
report.passed = results.filter((r) => r.pass).length
report.failed = results.filter((r) => !r.pass).length
await mkdir('docs', { recursive: true })
await writeFile(path.join('docs', 'PROBE_CHECK.json'), JSON.stringify(report, null, 2))
console.log(`\n${report.passed} passed, ${report.failed} failed -> docs/PROBE_CHECK.json`)
if (report.failed > 0 || report.fatal) process.exit(1)
