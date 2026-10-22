#!/usr/bin/env node
/**
 * Real-browser verification + evidence capture for B1 (full-site skeleton).
 *
 *   node scripts/capture-b1.mjs --url http://127.0.0.1:5185/ --name B1-scroll
 *
 * Requires these DOM contracts (testability, not design):
 *   [data-morton-root]        page root
 *   [data-project-card]       each work-overview card, clickable
 *   [data-detail]             detail overlay root, present only while open
 *   [data-detail-close]       close button inside the overlay
 *   window.__MORTON__         probe from src/lib/timeline.ts (state/timings/detail)
 *
 * Writes docs/SCREENSHOTS/B1-*.png, docs/RECORDING/<name>.webm|.mp4, docs/TEST_REPORT_RAW.json
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const arg = (n, f) => {
  const i = process.argv.indexOf(`--${n}`)
  return i === -1 ? f : process.argv[i + 1]
}

const URL_ = arg('url', 'http://127.0.0.1:5185/')
const OUT = arg('out', 'docs/SCREENSHOTS')
const VIDEO = arg('video', 'docs/RECORDING')
const NAME = arg('name', 'B1-scroll')
const LOCK = '/tmp/morton-browser-gate'
const NO_VIDEO = process.argv.includes('--no-video')

const report = { url: URL_, startedAt: new Date().toISOString(), steps: [], problems: [] }
const noisy = (t) => /favicon|React DevTools|WebGL: INVALID|software WebGL|Automatic fallback/i.test(t)

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

async function instrument(page) {
  const state = { consoleErrors: [], pageErrors: [], failed: [] }
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const loc = m.location()?.url || ''
    if (noisy(m.text()) || /favicon/i.test(loc) || /favicon/i.test(m.text())) return
    state.consoleErrors.push(`${m.text().slice(0, 300)} @ ${loc}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/i.test(r.url())) state.failed.push(`HTTP ${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) => state.pageErrors.push(String(e).slice(0, 400)))
  page.on('requestfailed', (r) => state.failed.push(`${r.url()} :: ${r.failure()?.errorText}`))
  return state
}

async function scrollPass(page, prefix, col) {
  const shots = []
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = page.viewportSize()?.height ?? 900
  const steps = 16
  for (let i = 1; i <= steps; i++) {
    const y = Math.round((height - vh) * (i / steps))
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y)
    await page.waitForTimeout(420)
    if (i % 4 === 0 || i === steps) {
      await mkdir(OUT, { recursive: true })
      const f = path.join(OUT, `${prefix}-scroll-${String(i).padStart(2, '0')}.png`)
      await page.screenshot({ path: f })
      shots.push(f)
    }
  }
  col.push({ step: 'scroll', scrollHeight: height, screenshots: shots })
}

async function detailCycle(page, index, col) {
  const before = await page.evaluate(() => window.scrollY)
  const cards = page.locator('[data-project-card]')
  const count = await cards.count()
  if (!count) {
    col.push({ step: 'detail', error: 'no [data-project-card] found' })
    report.problems.push({ step: 'detail', error: 'no [data-project-card]' })
    return
  }
  const card = cards.nth(index % count)
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const atCard = await page.evaluate(() => window.scrollY)
  await card.click({ trial: false })
  await page.waitForTimeout(1000)
  const opened = await page.evaluate(() => ({
    probe: window.__MORTON__?.detail ?? null,
    overlay: !!document.querySelector('[data-detail]'),
    active: document.activeElement ? document.activeElement.tagName : null,
    bodyOverflow: getComputedStyle(document.body).overflow,
    scrollY: window.scrollY,
  }))
  await mkdir(OUT, { recursive: true })
  const openShot = path.join(OUT, `${NAME}-detail-open-${index}.png`)
  await page.screenshot({ path: openShot })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  const closed = await page.evaluate(() => ({
    probe: window.__MORTON__?.detail ?? null,
    overlay: !!document.querySelector('[data-detail]'),
    active: document.activeElement ? document.activeElement.tagName : null,
    scrollY: window.scrollY,
  }))
  const closedShot = path.join(OUT, `${NAME}-detail-closed-${index}.png`)
  await page.screenshot({ path: closedShot })
  col.push({ step: 'detail', index, scrollBefore: before, scrollAtCard: atCard, scrollAfterClose: closed.scrollY, restored: Math.abs(closed.scrollY - atCard) <= 40, opened, closed, openShot, closedShot })
  if (Math.abs(closed.scrollY - atCard) > 40) report.problems.push({ step: `detail-${index}`, error: 'scroll position not restored', atCard, after: closed.scrollY })
}

const releaseAll = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: process.env.PW_HEADED ? false : true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

try {
  // ---- desktop, recorded ----
  await mkdir(VIDEO, { recursive: true })
  const rawDir = path.join(VIDEO, '.raw')
  await rm(rawDir, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(NO_VIDEO ? {} : { recordVideo: { dir: rawDir, size: { width: 1440, height: 900 } } }) })
  const page = await ctx.newPage()
  const col = await instrument(page)
  await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const heroProbe = await page.evaluate(() => window.__MORTON__ ?? null)
  await mkdir(OUT, { recursive: true })
  await page.screenshot({ path: path.join(OUT, `${NAME}-01-hero.png`) })

  await scrollPass(page, NAME, report.steps)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(600)
  for (let i = 0; i < 3; i++) await detailCycle(page, i, report.steps)
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, `${NAME}-99-end.png`) })
  const desktopState = await page.evaluate(() => ({ scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight, probe: window.__MORTON__ ?? null }))
  await ctx.close()

  const files = await readdir(rawDir)
  const webm = files.find((f) => f.endsWith('.webm'))
  if (webm) {
    const webmPath = path.join(VIDEO, `${NAME}.webm`)
    await rename(path.join(rawDir, webm), webmPath)
    await rm(rawDir, { recursive: true, force: true })
    const mp4Path = path.join(VIDEO, `${NAME}.mp4`)
    try {
      await exec('ffmpeg', ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4Path])
      report.video = { webm: webmPath, mp4: mp4Path }
    } catch {
      report.video = { webm: webmPath, mp4: null }
    }
  }

  // ---- mobile pass ----
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const mpage = await mctx.newPage()
  const mcol = await instrument(mpage)
  await mpage.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  await mpage.waitForTimeout(3500)
  await mpage.screenshot({ path: path.join(OUT, `${NAME}-mobile-01-hero.png`) })
  const mHeight = await mpage.evaluate(() => document.documentElement.scrollHeight)
  for (let i = 1; i <= 8; i++) {
    await mpage.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(((mHeight - 844) * i) / 8))
    await mpage.waitForTimeout(380)
    if (i === 4) await mpage.screenshot({ path: path.join(OUT, `${NAME}-mobile-02-mid.png`) })
  }
  await mpage.screenshot({ path: path.join(OUT, `${NAME}-mobile-03-end.png`) })
  const mOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await mctx.close()

  report.desktopState = desktopState
  report.heroProbe = heroProbe
  report.desktopConsole = col
  report.mobile = { scrollHeight: mHeight, overflowX: mOverflow, consoleErrors: mcol.consoleErrors, pageErrors: mcol.pageErrors }
  if (col.consoleErrors.length || col.pageErrors.length) report.problems.push({ desktop: col })
  if (mcol.consoleErrors.length || mcol.pageErrors.length) report.problems.push({ mobile: mcol })
} catch (e) {
  report.fatal = String(e)
} finally {
  await browser.close()
  if (releaseAll) await releaseAll()
}

report.finishedAt = new Date().toISOString()
await mkdir('docs', { recursive: true })
await writeFile('docs/TEST_REPORT_RAW.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  fatal: report.fatal,
  heroState: report.heroProbe?.state,
  openingTimings: report.heroProbe?.timings,
  scrollHeight: report.desktopState?.scrollHeight,
  detailSteps: report.steps.filter((s) => s.step === 'detail'),
  mobile: report.mobile,
  problems: report.problems,
  video: report.video,
}, null, 2))
if (report.fatal) process.exit(1)
