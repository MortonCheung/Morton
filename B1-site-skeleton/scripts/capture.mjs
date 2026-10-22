#!/usr/bin/env node
/**
 * Real-browser verification + evidence capture (opening prototypes A1–A4).
 *
 *   node scripts/capture.mjs --url http://127.0.0.1:5181/ --name A1-opening
 *
 * Writes:
 *   docs/SCREENSHOTS/{desktop-1920,desktop-1440,laptop-1366,tablet-1024,mobile-390}.png
 *   docs/RECORDING/<name>.webm and .mp4
 *   docs/TEST_REPORT_RAW.json
 *
 * Uses the system Chrome via playwright-core (channel: 'chrome'), serialised behind
 * a machine-wide lock so that parallel prototypes do not starve an 8 GB machine.
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const URL_ = arg('url', `http://127.0.0.1:${process.env.PORT || 5181}/`)
const OUT = arg('out', 'docs/SCREENSHOTS')
const VIDEO = arg('video', 'docs/RECORDING')
const NAME = arg('name', 'opening')
const SETTLE = Number(arg('settle', '3500'))
const SECONDS = Number(arg('seconds', '7'))
const LOCK = arg('lock', '/tmp/morton-browser-gate')
const NO_VIDEO = process.argv.includes('--no-video')

const VIEWS = [
  ['desktop-1920', 1920, 1080],
  ['desktop-1440', 1440, 900],
  ['laptop-1366', 1366, 768],
  ['tablet-1024', 1024, 768],
  ['mobile-390', 390, 844],
]

const report = { url: URL_, startedAt: new Date().toISOString(), runs: [], problems: [] }
const noisy = (t) => /favicon|React DevTools|WebGL: INVALID|software WebGL|Automatic fallback/i.test(t)

async function acquireLock(dir, timeoutMs = 20 * 60 * 1000) {
  const start = Date.now()
  for (;;) {
    try {
      await mkdir(dir)
      return async () => rm(dir, { recursive: true, force: true }).catch(() => {})
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      // break a stale lock left by a crashed run
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

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: process.env.PW_HEADED ? false : true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

async function shoot(browser, name, width, height, dpr) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr })
  const page = await ctx.newPage()
  const consoleErrors = []
  const pageErrors = []
  const failed = []
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const loc = m.location()?.url || ''
    if (noisy(m.text()) || /favicon/i.test(loc) || /favicon/i.test(m.text())) return
    consoleErrors.push(`${m.text().slice(0, 300)} @ ${loc}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/i.test(r.url())) failed.push(`HTTP ${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 400)))
  page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`))

  const t0 = Date.now()
  await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  const loadMs = Date.now() - t0
  await page.waitForTimeout(SETTLE)

  await mkdir(OUT, { recursive: true })
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file })

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const res = performance.getEntriesByType('resource')
    const probe = window.__MORTON__ ?? null
    return {
      probe: probe && { state: probe.state, timings: probe.timings, letters: probe.letters, detail: probe.detail, extra: probe.extra },
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadEvent: nav ? Math.round(nav.loadEventEnd) : null,
      resources: res.length,
      transferKB: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      dpr: window.devicePixelRatio,
      canvas: [...document.querySelectorAll('canvas')].map((c) => `${c.width}x${c.height}`),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    }
  })
  await ctx.close()
  const run = { view: name, width, height, dpr, loadMs, screenshot: file, consoleErrors, pageErrors, failedRequests: failed, ...data }
  if (consoleErrors.length || pageErrors.length) report.problems.push({ view: name, consoleErrors, pageErrors })
  report.runs.push(run)
  return run
}

async function record(browser) {
  await mkdir(VIDEO, { recursive: true })
  const rawDir = path.join(VIDEO, '.raw')
  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } },
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 400)))
  // Reload from scratch inside the recording so the clip starts at the opening.
  await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  const start = Date.now()
  await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 15000 }).catch(() => {})
  const heroMs = Date.now() - start
  await page.waitForTimeout(Math.max(1200, SECONDS * 1000 - heroMs))
  const probe = await page.evaluate(() => window.__MORTON__?.timings ?? null).catch(() => null)
  await ctx.close()
  const files = await readdir(rawDir)
  const webm = files.find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('no video produced by playwright')
  const webmPath = path.join(VIDEO, `${NAME}.webm`)
  await rename(path.join(rawDir, webm), webmPath)
  await rm(rawDir, { recursive: true, force: true })
  const mp4Path = path.join(VIDEO, `${NAME}.mp4`)
  try {
    await exec('ffmpeg', ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4Path])
  } catch {
    report.problems.push({ video: 'mp4 conversion failed, webm kept' })
  }
  report.video = { webm: webmPath, mp4: mp4Path, probe, heroMs, pageErrors: errors }
  return report.video
}

async function leakCheck(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const heaps = []
  for (let i = 0; i < 5; i++) {
    await page.goto(URL_, { waitUntil: 'load' })
    await page.waitForTimeout(2600)
    heaps.push(await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : null)).catch(() => null))
  }
  await ctx.close()
  report.reloadHeapSamples = heaps
}

try {
  for (const [name, w, h] of VIEWS) await shoot(browser, name, w, h, name === 'mobile-390' ? 2 : 1)
  if (!NO_VIDEO) await record(browser)
  await leakCheck(browser)
} catch (e) {
  report.fatal = String(e)
} finally {
  await browser.close()
  await release()
}

report.finishedAt = new Date().toISOString()
await mkdir('docs', { recursive: true })
await writeFile('docs/TEST_REPORT_RAW.json', JSON.stringify(report, null, 2))
const timing = report.runs[0]?.probe?.timings ?? null
console.log(JSON.stringify({
  fatal: report.fatal,
  states: report.runs.map((r) => `${r.view}:${r.probe?.state ?? 'no-probe'}`),
  openingTimings: timing,
  lettersExposed: report.runs[0]?.probe?.letters?.length ?? 0,
  problems: report.problems,
  runs: report.runs.map((r) => ({
    view: r.view,
    loadMs: r.loadMs,
    canvas: r.canvas,
    overflowX: r.overflowX,
    consoleErrors: r.consoleErrors.length,
    pageErrors: r.pageErrors.length,
  })),
  video: report.video,
  reloadHeapSamples: report.reloadHeapSamples,
}, null, 2))
if (report.fatal) process.exit(1)
