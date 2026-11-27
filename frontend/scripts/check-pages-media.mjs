#!/usr/bin/env node
// Verifies the complete exercise-media payload produced for Cloudflare Pages.
// Run from frontend/: node scripts/check-pages-media.mjs dist
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.resolve(process.argv[2] || 'dist')
const CATALOGUE = path.join(ROOT, 'catalogue/exercises')
const MEDIA = path.join(OUT, 'exercise-media')

function fail(message) {
  console.error('[exercise-media-check] ' + message)
  process.exitCode = 1
}

try {
  if (!fs.existsSync(CATALOGUE)) throw new Error('Catalogue directory not found: ' + CATALOGUE)
  if (!fs.existsSync(MEDIA)) throw new Error('Staged media directory not found: ' + MEDIA)

  const records = fs.readdirSync(CATALOGUE).filter(name => /^\d+\.json$/.test(name))
  if (!records.length) throw new Error('No exercise JSON records found.')

  const missing = []
  for (const file of records) {
    const record = JSON.parse(fs.readFileSync(path.join(CATALOGUE, file), 'utf8'))
    const id = String(record.id || file.replace(/\.json$/, '')).padStart(4, '0')
    for (const [folder, ext] of [['still', '.webp'], ['clip', '.mp4']]) {
      const target = path.join(MEDIA, folder, id + ext)
      if (!fs.existsSync(target)) {
        missing.push(folder + '/' + id + ext)
        continue
      }
      const stat = fs.statSync(target)
      if (!stat.isFile() || stat.size <= 0) missing.push(folder + '/' + id + ext + ' (empty or not a file)')
    }
  }

  if (missing.length) {
    fail(missing.length + ' media files are missing or invalid. First 30: ' + missing.slice(0, 30).join(', '))
    process.exit(1)
  }

  const stillCount = fs.readdirSync(path.join(MEDIA, 'still')).filter(f => /^\d+\.webp$/.test(f)).length
  const clipCount = fs.readdirSync(path.join(MEDIA, 'clip')).filter(f => /^\d+\.mp4$/.test(f)).length
  console.log('[exercise-media-check] OK — ' + records.length.toLocaleString('en-US') +
    ' catalogue records; ' + stillCount.toLocaleString('en-US') + ' stills; ' +
    clipCount.toLocaleString('en-US') + ' MP4 clips.')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
