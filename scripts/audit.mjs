#!/usr/bin/env node
/**
 * Lead-side independent delivery audit. READ-ONLY against the five projects.
 *
 *   node scripts/audit.mjs            # inspect artefacts + git + evidence
 *   node scripts/audit.mjs --build    # also rebuild every project (production build)
 *
 * Writes DELIVERY_AUDIT.json next to this script and prints a summary table.
 * Nothing here trusts the sub-agents' self-reports: it reads git, the filesystem,
 * the PNG/MP4 headers and the raw capture JSON written by the browser harness.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile, stat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

const exec = promisify(execFile)
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const PROJECTS = [
  ['A1', 'A1-luxury-opening', 5181],
  ['A2', 'A2-sculptural-opening', 5182],
  ['A3', 'A3-premium-tech-opening', 5183],
  ['A4', 'A4-hybrid-opening', 5184],
  ['B1', 'B1-site-skeleton', 5185],
]
const DO_BUILD = process.argv.includes('--build')

async function pngSize(file) {
  try {
    const fd = await readFile(file)
    if (fd.length < 24) return null
    return { w: fd.readUInt32BE(16), h: fd.readUInt32BE(20) }
  } catch {
    return null
  }
}

async function probe(file) {
  try {
    const { stdout } = await exec('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,duration', '-show_entries', 'format=duration,size',
      '-of', 'json', file,
    ])
    const j = JSON.parse(stdout)
    const s = j.streams?.[0] ?? {}
    return { width: s.width, height: s.height, duration: Number(s.duration ?? j.format?.duration ?? 0), bytes: Number(j.format?.size ?? 0) }
  } catch {
    return null
  }
}

async function sh(cmd, args, cwd) {
  try {
    const { stdout } = await exec(cmd, args, { cwd, timeout: 180000 })
    return { ok: true, out: stdout.trim() }
  } catch (e) {
    return { ok: false, out: String(e.stdout || e.message).trim().slice(0, 800) }
  }
}

const audit = { generatedAt: new Date().toISOString(), root: ROOT, projects: [] }

for (const [id, dir, port] of PROJECTS) {
  const abs = path.join(ROOT, dir)
  const entry = { id, dir, port, exists: existsSync(abs) }
  if (!entry.exists) {
    audit.projects.push(entry)
    continue
  }

  const gitHead = await sh('git', ['rev-parse', 'HEAD'], abs)
  entry.gitHead = gitHead.ok ? gitHead.out : null
  const gitStatus = await sh('git', ['status', '--porcelain'], abs)
  entry.gitDirty = gitStatus.ok ? gitStatus.out.split('\n').filter(Boolean) : null
  const commits = await sh('git', ['rev-list', '--count', 'HEAD'], abs)
  entry.commitCount = commits.ok ? Number(commits.out) : 0

  const required = [
    'README.md',
    'docs/ISOLATION.md',
    'docs/DESIGN_DECISIONS.md',
    'docs/TEST_REPORT.md',
    'docs/KNOWN_ISSUES.md',
  ]
  entry.missingDocs = required.filter((f) => !existsSync(path.join(abs, f)))

  const shotDir = path.join(abs, 'docs/SCREENSHOTS')
  const shots = existsSync(shotDir) ? (await readdir(shotDir)).filter((f) => f.endsWith('.png')) : []
  entry.screenshots = []
  for (const f of shots.sort()) {
    const size = await pngSize(path.join(shotDir, f))
    const st = await stat(path.join(shotDir, f))
    entry.screenshots.push({ file: `docs/SCREENSHOTS/${f}`, ...size, kb: Math.round(st.size / 1024) })
  }

  const vidDir = path.join(abs, 'docs/RECORDING')
  const vids = existsSync(vidDir) ? (await readdir(vidDir)).filter((f) => /\.(webm|mp4)$/.test(f)) : []
  entry.videos = []
  for (const f of vids.sort()) {
    const p = await probe(path.join(vidDir, f))
    entry.videos.push({ file: `docs/RECORDING/${f}`, ...p })
  }

  const rawPath = path.join(abs, 'docs/TEST_REPORT_RAW.json')
  if (existsSync(rawPath)) {
    try {
      const raw = JSON.parse(await readFile(rawPath, 'utf8'))
      const firstProbe = raw.runs?.[0]?.probe ?? raw.heroProbe ?? null
      entry.evidence = {
        states: raw.runs?.map((r) => `${r.view}:${r.probe?.state ?? 'none'}`) ?? null,
        timings: firstProbe?.timings ?? null,
        letters: firstProbe?.letters?.length ?? null,
        consoleErrors:
          raw.runs?.reduce((a, r) => a + (r.consoleErrors?.length ?? 0), 0) ??
          (raw.desktopConsole?.consoleErrors?.length ?? 0) + (raw.mobile?.consoleErrors?.length ?? 0),
        pageErrors:
          raw.runs?.reduce((a, r) => a + (r.pageErrors?.length ?? 0), 0) ??
          (raw.desktopConsole?.pageErrors?.length ?? 0) + (raw.mobile?.pageErrors?.length ?? 0),
        failedRequests:
          raw.runs?.reduce((a, r) => a + (r.failedRequests?.length ?? 0), 0) ??
          (raw.desktopConsole?.failed?.length ?? 0),
        overflowX: raw.runs?.map((r) => r.overflowX) ?? (raw.mobile ? [raw.mobile.overflowX] : null),
        video: raw.video ?? null,
        detailCycles: raw.steps?.filter((s) => s.step === 'detail') ?? null,
        reloadHeapSamples: raw.reloadHeapSamples ?? null,
        mobile: raw.mobile ?? null,
        fatal: raw.fatal ?? null,
      }
      const t = entry.evidence.timings || {}
      entry.checks = {
        drawAtLeast1000: t.builtAt != null && t.drawingAt != null ? t.builtAt - t.drawingAt >= 1000 : null,
        expandBetween400and700: t.heroAt != null && t.expandingAt != null ? t.heroAt - t.expandingAt >= 400 && t.heroAt - t.expandingAt <= 700 : null,
        sixLetters: entry.evidence.letters === 6,
        noConsoleErrors: entry.evidence.consoleErrors === 0 && entry.evidence.pageErrors === 0,
        noHorizontalOverflow: Array.isArray(entry.evidence.overflowX) ? entry.evidence.overflowX.every((v) => v === 0) : null,
      }
      if (id === 'B1') {
        entry.checks.detailScrollRestored = entry.evidence.detailCycles?.length
          ? entry.evidence.detailCycles.every((c) => c.restored === true)
          : null
        entry.checks.detailEscapeWorks = entry.evidence.detailCycles?.length
          ? entry.evidence.detailCycles.every((c) => c.closed?.probe?.open === false || c.closed?.overlay === false)
          : null
      }
    } catch (e) {
      entry.evidence = { parseError: String(e) }
    }
  } else {
    entry.evidence = null
  }

  if (DO_BUILD) {
    const build = await sh('npm', ['run', 'build'], abs)
    entry.build = { ok: build.ok, tail: build.out.split('\n').slice(-12).join('\n') }
  }

  audit.projects.push(entry)
}

const outPath = path.join(ROOT, 'DELIVERY_AUDIT.json')
await writeFile(outPath, JSON.stringify(audit, null, 2))

const rows = audit.projects.map((p) => ({
  id: p.id,
  git: p.gitHead ? p.gitHead.slice(0, 8) : 'NO-GIT',
  commits: p.commitCount,
  dirty: p.gitDirty ? p.gitDirty.length : null,
  docsMissing: p.missingDocs?.length ?? '-',
  shots: p.screenshots?.length ?? 0,
  videos: p.videos?.length ?? 0,
  draw: p.checks?.drawAtLeast1000,
  expand: p.checks?.expandBetween400and700,
  letters: p.evidence?.letters ?? null,
  errs: p.evidence?.consoleErrors ?? null,
  overflow: p.checks?.noHorizontalOverflow,
  restored: p.checks?.detailScrollRestored ?? '-',
  build: p.build ? p.build.ok : '-',
}))
console.log(JSON.stringify({ outPath, rows }, null, 2))
