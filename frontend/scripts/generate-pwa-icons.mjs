#!/usr/bin/env node
/**
 * Aura Gym — generate PWA icons from the canonical SVG glyph.
 *
 * Reuses the repository's deterministic PNG renderer from app-icons.mjs,
 * avoiding a second rasterization engine or an extra runtime dependency.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_ICON_VARIANTS } from '../src/lib/app-icon-variants.js'
import { draw } from './app-icons.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = resolve(ROOT, 'public')
const SIZES = [180, 512]
const DEFAULT_ICON = APP_ICON_VARIANTS.find(icon => icon.id === 'default')

async function main() {
  if (!DEFAULT_ICON) throw new Error('Default Aura Gym icon variant is missing')
  await mkdir(OUTPUT, { recursive: true })

  for (const size of SIZES) {
    const target = resolve(OUTPUT, `icon-${size}.png`)
    const png = draw(DEFAULT_ICON, size)
    if (!Buffer.isBuffer(png) || png.length < 100) {
      throw new Error(`Renderer returned an invalid PNG for ${size}px`)
    }
    await writeFile(target, png)
    console.log(`[Aura Gym] Generated ${size}x${size}: ${target}`)
  }
}

main().catch(error => {
  console.error('[Aura Gym] PWA icon generation failed:', error)
  process.exitCode = 1
})
