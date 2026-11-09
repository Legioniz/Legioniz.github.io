#!/usr/bin/env node
import { gzipSync } from 'node:zlib'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const failures = []
const checks = []
const MiB = 1024 * 1024

function check(ok, label, detail = '') {
  checks.push({ ok, label, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

async function walk(directory, prefix = '') {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name)
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await walk(absolute, relative))
    else if (entry.isFile()) result.push({ path: relative, absolute, size: (await stat(absolute)).size })
  }
  return result
}

try {
  const files = await walk(DIST)
  const byPath = new Map(files.map((file) => [file.path, file]))
  check(Boolean(byPath.get('index.html')), 'Production HTML exists')
  check(Boolean(byPath.get('og-card.png')) && byPath.get('og-card.png').size <= 250 * 1024, 'Crawler-compatible 1200x630 PNG preview ships within its 250 KiB budget')
  check(Boolean(byPath.get('robots.txt') && byPath.get('sitemap.xml') && byPath.get('site.webmanifest')), 'SEO and install metadata ship in the production root')
  check(!files.some((file) => /\.(?:pdf|docx?|odt)$/i.test(file.path)), 'No downloadable personal application documents ship in the production artifact')
  check(!files.some((file) => /\.(?:docx?|odt)$/i.test(file.path)), 'No Word or OpenDocument files ship')
  check(!files.some((file) => /(?:private|phone|personal-cv)/i.test(path.basename(file.path))), 'No private CV-named asset ships')
  check(!files.some((file) => file.path.endsWith('.map')), 'Production source maps are not exposed')

  const scripts = files.filter((file) => file.path.endsWith('.js'))
  const styles = files.filter((file) => file.path.endsWith('.css'))
  const images = files.filter((file) => /\.(?:png|jpe?g|webp|svg)$/i.test(file.path) && file.path.startsWith('profile/'))
  const jsRaw = scripts.reduce((sum, file) => sum + file.size, 0)
  let jsGzip = 0
  for (const file of scripts) jsGzip += gzipSync(await readFile(file.absolute)).length
  const cssRaw = styles.reduce((sum, file) => sum + file.size, 0)
  let cssGzip = 0
  for (const file of styles) cssGzip += gzipSync(await readFile(file.absolute)).length
  const profileBytes = images.reduce((sum, file) => sum + file.size, 0)
  const largestJs = Math.max(0, ...scripts.map((file) => file.size))

  check(scripts.length > 0, 'Has compiled JavaScript assets', `${scripts.length} chunks`)
  check(largestJs <= 450 * 1024, 'Largest JavaScript chunk stays within budget', `${(largestJs / 1024).toFixed(1)} KiB / 450 KiB`)
  check(jsRaw <= 800 * 1024, 'Total JavaScript stays within budget', `${(jsRaw / 1024).toFixed(1)} KiB / 800 KiB`)
  check(jsGzip <= 240 * 1024, 'Compressed JavaScript stays within transfer budget', `${(jsGzip / 1024).toFixed(1)} KiB / 240 KiB`)
  check(cssRaw <= 280 * 1024, 'Total CSS stays within budget', `${(cssRaw / 1024).toFixed(1)} KiB / 280 KiB`)
  check(cssGzip <= 70 * 1024, 'Compressed CSS stays within transfer budget', `${(cssGzip / 1024).toFixed(1)} KiB / 70 KiB`)
  check(profileBytes <= 900 * 1024, 'Responsive profile image set stays within budget', `${(profileBytes / 1024).toFixed(1)} KiB / 900 KiB`)

  const html = await readFile(path.join(DIST, 'index.html'), 'utf8')
  const assetRefs = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1].replace(/^\//, ''))
  check(assetRefs.length >= 2 && assetRefs.every((asset) => byPath.has(asset)), 'HTML entry references resolve to emitted build assets')
  check(html.includes('rel="canonical"') && html.includes('application/ld+json') && html.includes('twitter:card') && html.includes('og-card.png'), 'Production HTML retains canonical, structured data, and crawler-compatible social metadata')

  const bundleText = (await Promise.all(scripts.map((file) => readFile(file.absolute, 'utf8')))).join('\n')
  check(!/SUPABASE_SERVICE_ROLE_KEY\s*[:=]/.test(bundleText), 'No Supabase service-role key name/value is embedded in browser JavaScript')
  check(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(bundleText), 'No private-key material is embedded in browser JavaScript')
  check(files.reduce((sum, file) => sum + file.size, 0) < 3.2 * MiB, 'Total production artifact stays within 3.2 MiB', `${(files.reduce((sum, file) => sum + file.size, 0) / MiB).toFixed(2)} MiB`)

  console.log(`\nProduction asset summary: ${scripts.length} JS chunks · ${styles.length} CSS chunks · ${files.length} files.`)
  if (failures.length) {
    console.error(`\nProduction audit failed: ${failures.length} issue(s).`)
    process.exitCode = 1
  } else {
    console.log(`\nProduction audit passed: ${checks.length} checks.`)
  }
} catch (error) {
  console.error(`Production audit could not complete: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
