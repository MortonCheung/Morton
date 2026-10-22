#!/usr/bin/env node
/**
 * Quick single-frame visual shutter for the A2 owner's iteration loop.
 * Uses the same machine-wide browser lock as scripts/capture.mjs.
 *
 *   node scripts/shot.mjs --out .tmp/iter1.png --width 1440 --height 900
 *   node scripts/shot.mjs --settle-state drawing --delay 400 --out .tmp/drawing.png
 */
import { chromium } from 'playwright-core'
import { mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const URL_ = arg('url', 'http://127.0.0.1:5182/')
const OUT = path.resolve(arg('out', '.tmp/shot.png'))
const WIDTH = Number(arg('width', '1440'))
const HEIGHT = Number(arg('height', '900'))
const DPR = Number(arg('dpr', String(WIDTH <= 760 ? 2 : 1)))
const STATE = arg('state', 'hero')
const DELAY = Number(arg('delay', '900'))
const REDUCED = process.argv.includes('--reduced')
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
      if (Date.now() - start > timeoutMs) throw new Error(`browser lock timeout (${dir})`)
      await sleep(4000)
    }
  }
}

const release = await acquireLock(LOCK)
let browser
try {
  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  })
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
    reducedMotion: REDUCED ? 'reduce' : 'no-preference',
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url()}`)
  })
  await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  await page.waitForFunction(
    (wanted) => window.__MORTON__?.state === wanted,
    STATE,
    { timeout: 20000 },
  ).catch(() => {})
  await page.waitForTimeout(DELAY)
  await mkdir(path.dirname(OUT), { recursive: true })
  await page.screenshot({ path: OUT })
  const probe = await page.evaluate(() => window.__MORTON__ ?? null)
  console.log(JSON.stringify({ out: OUT, probe, errors }, null, 2))
  await ctx.close()
} finally {
  await browser?.close()
  await release()
}
