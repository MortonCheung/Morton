#!/usr/bin/env node
/**
 * Fast single-view screenshot for design iteration (not the delivery capture).
 *
 *   node scripts/shot.mjs --name hero-1440 --width 1440 --height 900 --wait 2600
 *   node scripts/shot.mjs --name drawing --phase drawing --wait 700
 *
 * Uses the same machine-wide browser lock as scripts/capture.mjs so it never
 * competes with the five parallel prototypes' captures.
 */
import { chromium } from 'playwright-core'
import { mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const URL_ = arg('url', 'http://127.0.0.1:5183/')
const NAME = arg('name', 'shot')
const WIDTH = Number(arg('width', '1440'))
const HEIGHT = Number(arg('height', '900'))
const DPR = Number(arg('dpr', '1'))
const WAIT = Number(arg('wait', '2600'))
const PHASE = arg('phase', 'hero')
const OUT = arg('out', '.tmp/shots')
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

const release = await acquireLock(LOCK)
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  headless: process.env.PW_HEADED ? false : true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
})

try {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: DPR })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
  await page.goto(URL_, { waitUntil: 'load', timeout: 45000 })
  await page.waitForFunction(
    (phase) => {
      const current = window.__MORTON__?.state
      if (phase === 'hero') return current === 'hero' || current === 'reduced'
      return current === phase
    },
    PHASE,
    { timeout: 25000 },
  )
  await page.waitForTimeout(WAIT)
  await mkdir(OUT, { recursive: true })
  const file = path.join(OUT, `${NAME}.png`)
  await page.screenshot({ path: file })
  const probe = await page.evaluate(() => ({
    state: window.__MORTON__?.state,
    timings: window.__MORTON__?.timings,
    letters: window.__MORTON__?.letters?.length,
    extra: window.__MORTON__?.extra,
  }))
  console.log(JSON.stringify({ file, errors, probe }, null, 2))
  await context.close()
} finally {
  await browser.close()
  await release()
}
