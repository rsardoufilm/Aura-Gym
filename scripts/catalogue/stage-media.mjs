#!/usr/bin/env node
// Copies the exercise stills and animations next to a built app, as exercise-media/still and /clip:
//
//   node scripts/catalogue/stage-media.mjs frontend/dist                 web demo, 180 px from catalogue/media
//   APP_MEDIA_DIR=/private/app node scripts/catalogue/stage-media.mjs frontend/dist
//                                                                        Android package: larger animations
//   VITE_CLIP_EXT=webp APP_MEDIA_DIR=/private/app-webp ...              ... as animated WebP (the release)
//
// Stages the exercise media files alongside the built app. The repository's catalogue is the
// source of truth for the stills and animations; the build does not copy a separate media notice.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.resolve(process.argv[2] || 'frontend/dist')
const media = path.join(ROOT, 'catalogue/media')
const appDir = process.env.APP_MEDIA_DIR
const clipExt = process.env.VITE_CLIP_EXT === 'webp' ? '.webp' : '.mp4'
if (clipExt === '.webp' && !appDir) {
  console.error('VITE_CLIP_EXT=webp needs APP_MEDIA_DIR: the repository only has the MP4 animations')
  process.exit(1)
}

const copyDir = (from, to, ext) => {
  fs.mkdirSync(to, { recursive: true })
  let n = 0
  for (const f of fs.readdirSync(from)) {
    if (!f.endsWith(ext)) continue
    fs.copyFileSync(path.join(from, f), path.join(to, f))
    n++
  }
  return n
}

const dest = path.join(out, 'exercise-media')
const stills = copyDir(path.join(media, 'still'), path.join(dest, 'still'), '.webp')
const clips = copyDir(appDir || path.join(media, 'clip'), path.join(dest, 'clip'), clipExt)

// Fail the deployment if even one catalogue drawing is missing its still or animation.
// The catalogue contains both canonical exercises and figure variants; each JSON record has
// its own media ID, so this checks the complete set, not only the canonical EXDB rows.
try {
  const catalogueDir = path.join(ROOT, 'catalogue/exercises')
  const records = fs.readdirSync(catalogueDir).filter(name => /^\d+\.json$/.test(name))
  if (!records.length) throw new Error('No exercise JSON records found in catalogue/exercises.')

  const ids = new Set()
  const missing = []
  for (const file of records) {
    const record = JSON.parse(fs.readFileSync(path.join(catalogueDir, file), 'utf8'))
    const id = String(record.id || file.replace(/\.json$/, '')).padStart(4, '0')
    if (ids.has(id)) throw new Error('Duplicate exercise media ID: ' + id)
    ids.add(id)

    for (const [folder, ext] of [['still', '.webp'], ['clip', clipExt]]) {
      const target = path.join(dest, folder, id + ext)
      if (!fs.existsSync(target)) {
        missing.push(folder + '/' + id + ext)
        continue
      }
      const stat = fs.statSync(target)
      if (!stat.isFile() || stat.size <= 0) missing.push(folder + '/' + id + ext + ' (empty or invalid)')
    }
  }

  if (missing.length) {
    throw new Error(missing.length + ' missing/invalid media files. First 30: ' + missing.slice(0, 30).join(', '))
  }
  if (stills !== records.length || clips !== records.length) {
    throw new Error('Media count mismatch: ' + records.length + ' catalogue records, ' + stills + ' stills, ' + clips + ' animations.')
  }
  console.log('media verification: OK — ' + records.length.toLocaleString('en-US') + ' catalogue records, all stills and animations present.')
} catch (error) {
  console.error('[stage-media] Verification failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}

console.log(\`media: \${stills} stills, \${clips} animations\${appDir ? ' (app size)' : ''} -> \${path.relative(ROOT, out) || out}\`)
