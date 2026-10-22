#!/usr/bin/env node
/**
 * Supplementary QA capture for B1 (does not replace scripts/capture-b1.mjs).
 *
 *   node scripts/qa-shots.mjs --url http://127.0.0.1:5185/
 *
 * Adds what capture-b1 does not cover:
 *   - the five required viewports (1920/1440/1366/1024/390) at 3 scroll depths
 *   - reduced-motion pass (?motion=reduce) at 1440 and 390
 *   - detail opened via the close BUTTON (not only Escape) + focus return check
 *   - a smooth, continuous full-page scroll recording (for visual review)
 *   - console/page errors per pass
 *
 * Shares the machine-level browser gate with the other MORTON captures.
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
const OUT = 'docs/SCREENSHOTS'
const VIDEO = 'docs/RECORDING'
const LOCK = '/tmp/morton-browser-gate'
const report = { url: URL_, startedAt: new Date().toISOString(), passes: [], problems: [] }
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
      } catch {}
      if (Date.now() - start > timeoutMs) throw new Error('browser lock timeout')
      await sleep(4000)
    }
  }
}

function instrument(page, bucket) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !noisy(m.text())) bucket.consoleErrors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => bucket.pageErrors.push(String(e).slice(0, 300)))
}

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

try {
  await mkdir(OUT, { recursive: true })

  // ---- 1. five viewports, three depths each ----
  const viewports = [
    ['desktop-1920', 1920, 1080],
    ['desktop-1440', 1440, 900],
    ['laptop-1366', 1366, 768],
    ['tablet-1024', 1024, 768],
    ['mobile-390', 390, 844],
  ]
  for (const [name, width, height] of viewports) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1 })
    const page = await ctx.newPage()
    page.setDefaultTimeout(90000)
    const bucket = { consoleErrors: [], pageErrors: [] }
    instrument(page, bucket)
    await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
    await page.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(900)
    const probe = await page.evaluate(() => window.__MORTON__ ?? null)
    const height_ = await page.evaluate(() => document.documentElement.scrollHeight)
    const sections = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-chapter]')).map((el) => ({
        id: el.getAttribute('data-chapter'),
        top: Math.round(el.getBoundingClientRect().top + window.scrollY),
        height: Math.round(el.getBoundingClientRect().height),
      })),
    )
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    await page.screenshot({ path: path.join(OUT, `B1-${name}-01-hero.png`) })

    const depths = ['M', 'O1', 'R', 'T', 'O2', 'N']
    for (const id of depths) {
      const info = sections.find((s) => s.id === id)
      if (!info) continue
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), info.top + Math.round(info.height * 0.35))
      await page.waitForTimeout(700)
      await page.screenshot({ path: path.join(OUT, `B1-${name}-sec-${id}.png`) })
    }
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUT, `B1-${name}-99-end.png`) })

    if (name === 'mobile-390') {
      const cards = page.locator('[data-project-card]')
      if (await cards.count()) {
        await page.evaluate(() => document.querySelector('[data-project-card]')?.scrollIntoView({ block: 'center', behavior: 'instant' }))
        await page.waitForTimeout(600)
        await page.evaluate(() => document.querySelector('[data-project-card]')?.click())
        await page.waitForTimeout(900)
        await page.screenshot({ path: path.join(OUT, 'B1-mobile-390-detail-open.png') , timeout: 90000})
        const close = page.locator('[data-detail-close]')
        if (await close.count()) await close.click()
        await page.waitForTimeout(800)
        await page.screenshot({ path: path.join(OUT, 'B1-mobile-390-detail-closed.png') , timeout: 90000})
      }
    }
    report.passes.push({
      name,
      viewport: { width, height },
      state: probe?.state,
      timings: probe?.timings,
      letters: probe?.letters?.length,
      scrollHeight: height_,
      overflowX: scrollWidth - clientWidth,
      sections,
      consoleErrors: bucket.consoleErrors,
      pageErrors: bucket.pageErrors,
    })
    if (bucket.consoleErrors.length || bucket.pageErrors.length) report.problems.push({ name, ...bucket })
    await ctx.close()
  }

  // ---- 2. reduced motion ----
  for (const [name, width, height] of [['rm-1440', 1440, 900], ['rm-390', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height } })
    const page = await ctx.newPage()
    page.setDefaultTimeout(90000)
    const bucket = { consoleErrors: [], pageErrors: [] }
    instrument(page, bucket)
    await page.goto(`${URL_}${URL_.includes('?') ? '&' : '?'}motion=reduce`, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(2200)
    const probe = await page.evaluate(() => ({
      state: window.__MORTON__?.state,
      scrollHeight: document.documentElement.scrollHeight,
      detail: window.__MORTON__?.detail ?? null,
    }))
    await page.screenshot({ path: path.join(OUT, `B1-${name}-hero.png`) })
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.55, behavior: 'instant' }))
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(OUT, `B1-${name}-mid.png`) })
    const cards = page.locator('[data-project-card]')
    const cardCount = await cards.count()
    let detailCheck = null
    if (cardCount) {
      await cards.first().click()
      await page.waitForTimeout(700)
      detailCheck = await page.evaluate(() => ({
        open: !!document.querySelector('[data-detail]'),
        scrollY: window.scrollY,
        bodyOverflow: getComputedStyle(document.body).overflow,
      }))
      await page.screenshot({ path: path.join(OUT, `B1-${name}-detail.png`) })
      const close = page.locator('[data-detail-close]')
      if (await close.count()) await close.click()
      await page.waitForTimeout(700)
      detailCheck.closed = await page.evaluate(() => ({
        open: !!document.querySelector('[data-detail]'),
        scrollY: window.scrollY,
        active: document.activeElement?.getAttribute('data-project-id') ?? document.activeElement?.tagName,
      }))
    }
    report.passes.push({ name, reduced: true, probe, cardCount, detailCheck, ...bucket })
    if (bucket.consoleErrors.length || bucket.pageErrors.length) report.problems.push({ name, ...bucket })
    await ctx.close()
  }

  // ---- 3. detail close via BUTTON + focus return + smooth scroll recording ----
  const vctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.join(VIDEO, '.raw-smooth'), size: { width: 1440, height: 900 } },
  })
  const vpage = await vctx.newPage()
  vpage.setDefaultTimeout(90000)
  const vbucket = { consoleErrors: [], pageErrors: [] }
  instrument(vpage, vbucket)
  await vpage.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  await vpage.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 20000 }).catch(() => {})
  await vpage.waitForTimeout(800)

  const cardCount = await vpage.locator('[data-project-card]').count()
  const total = await vpage.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  // Frame-time sample while scrolling (real browser, headless SwiftShader).
  await vpage.evaluate(() => {
    window.__FPS__ = { frames: [], last: performance.now() }
    const tick = (now) => {
      window.__FPS__.frames.push(now - window.__FPS__.last)
      window.__FPS__.last = now
      window.__FPS__.raf = requestAnimationFrame(tick)
    }
    window.__FPS__.raf = requestAnimationFrame(tick)
  })
  const steps = 120
  for (let i = 1; i <= steps; i++) {
    const y = Math.round((total * i) / steps)
    await vpage.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y)
    await vpage.waitForTimeout(90)
  }
  await vpage.waitForTimeout(400)
  report.frameStats = await vpage.evaluate(() => {
    cancelAnimationFrame(window.__FPS__.raf)
    const frames = window.__FPS__.frames.slice(8)
    frames.sort((a, b) => a - b)
    const at = (q) => frames[Math.min(frames.length - 1, Math.floor(frames.length * q))]
    return {
      samples: frames.length,
      avg: Number((frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length)).toFixed(2)),
      p50: Number(at(0.5).toFixed(2)),
      p95: Number(at(0.95).toFixed(2)),
      max: Number(frames[frames.length - 1].toFixed(2)),
      under25ms: Number((frames.filter((f) => f < 25).length / Math.max(1, frames.length)).toFixed(3)),
    }
  })
  // back to the gallery, open with the button close path
  await vpage.evaluate(() => {
    const el = document.querySelector('[data-project-card]')
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' })
  })
  await vpage.waitForTimeout(900)
  const before = await vpage.evaluate(() => window.scrollY)
  const sourceId = await vpage.locator('[data-project-card]').first().getAttribute('data-project-id')
  // JS click: no Playwright auto-scroll, so the saved scroll offset is the one
  // that was actually observed (capture-b1 already covers the pointer path).
  await vpage.evaluate(() => document.querySelector('[data-project-card]')?.click())
  await vpage.waitForTimeout(1000)
  const opened = await vpage.evaluate(() => ({
    open: !!document.querySelector('[data-detail]'),
    probe: window.__MORTON__?.detail ?? null,
    focus: document.activeElement?.getAttribute('data-detail-close') !== null,
    bodyOverflow: getComputedStyle(document.body).overflow,
    scrollY: window.scrollY,
  }))
  await vpage.screenshot({ path: path.join(OUT, 'B1-detail-button-open.png') , timeout: 90000})
  const thumb = vpage.locator('.detail__thumb').nth(1)
  if (await thumb.count()) await thumb.click()
  await vpage.waitForTimeout(350)
  await vpage.screenshot({ path: path.join(OUT, 'B1-detail-button-view2.png') , timeout: 90000})
  await vpage.locator('[data-detail-close]').click()
  await vpage.waitForTimeout(900)
  const closed = await vpage.evaluate(() => ({
    open: !!document.querySelector('[data-detail]'),
    probe: window.__MORTON__?.detail ?? null,
    scrollY: window.scrollY,
    focus: document.activeElement?.getAttribute('data-project-id') ?? document.activeElement?.tagName,
    bodyPosition: getComputedStyle(document.body).position,
  }))
  await vpage.screenshot({ path: path.join(OUT, 'B1-detail-button-closed.png') , timeout: 90000})
  report.passes.push({ name: 'detail-button', cardCount, sourceId, before, opened, closed, restored: Math.abs(closed.scrollY - before) <= 40, ...vbucket })
  if (Math.abs(closed.scrollY - before) > 40) report.problems.push({ name: 'detail-button', before, after: closed.scrollY })
  if (vbucket.consoleErrors.length || vbucket.pageErrors.length) report.problems.push({ name: 'detail-button', ...vbucket })
  await vctx.close()

  // ---- 4. five reloads: no stacked stage, no console errors ----
  {
    const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const rpage = await rctx.newPage()
    rpage.setDefaultTimeout(90000)
    const rbucket = { consoleErrors: [], pageErrors: [] }
    instrument(rpage, rbucket)
    const runs = []
    for (let i = 0; i < 5; i++) {
      await rpage.goto(URL_, { waitUntil: 'load', timeout: 45000 })
      await rpage.waitForFunction(() => window.__MORTON__?.state === 'hero', null, { timeout: 20000 }).catch(() => {})
      await rpage.waitForTimeout(700)
      runs.push(
        await rpage.evaluate(() => ({
          state: window.__MORTON__?.state,
          canvases: document.querySelectorAll('canvas').length,
          sections: document.querySelectorAll('[data-chapter]').length,
          scrollHeight: document.documentElement.scrollHeight,
          timings: window.__MORTON__?.timings,
        })),
      )
    }
    report.passes.push({ name: 'reloads-5', runs, consoleErrors: rbucket.consoleErrors, pageErrors: rbucket.pageErrors })
    if (rbucket.consoleErrors.length || rbucket.pageErrors.length) report.problems.push({ name: 'reloads-5', ...rbucket })
    await rctx.close()
  }

  // video: webm + mp4
  const rawDir = path.join(VIDEO, '.raw-smooth')
  const files = await readdir(rawDir).catch(() => [])
  const webm = files.find((f) => f.endsWith('.webm'))
  if (webm) {
    const webmPath = path.join(VIDEO, 'B1-smooth-scroll.webm')
    await rename(path.join(rawDir, webm), webmPath)
    await rm(rawDir, { recursive: true, force: true })
    const mp4Path = path.join(VIDEO, 'B1-smooth-scroll.mp4')
    try {
      await exec('ffmpeg', ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', mp4Path])
      report.smoothVideo = { webm: webmPath, mp4: mp4Path }
    } catch {
      report.smoothVideo = { webm: webmPath, mp4: null }
    }
  }
} catch (e) {
  report.fatal = String(e)
} finally {
  await browser.close()
  await release()
}

report.finishedAt = new Date().toISOString()
await mkdir('docs', { recursive: true })
await writeFile('docs/QA_SHOTS.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ fatal: report.fatal, passes: report.passes.map((p) => ({ name: p.name, state: p.state, overflowX: p.overflowX, consoleErrors: p.consoleErrors?.length, pageErrors: p.pageErrors?.length, detailCheck: p.detailCheck, opened: p.opened, closed: p.closed, restored: p.restored })), problems: report.problems, video: report.smoothVideo }, null, 2))
