#!/usr/bin/env node
/**
 * Aura Gym — generate installable PWA icons from resources/icon.svg.
 * Keeps the existing public filenames referenced by manifest.json.
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(ROOT, 'resources/icon.svg')
const OUTPUT = resolve(ROOT, 'public')
const BACKGROUND = '#0c0e12'
const SIZES = [180, 512]

async function main() {
  await mkdir(OUTPUT, { recursive: true })
  const source = sharp(SOURCE, { density: 384 })
  const metadata = await source.metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('resources/icon.svg is not a valid rasterizable SVG')
  }

  for (const size of SIZES) {
    const target = resolve(OUTPUT, `icon-${size}.png`)
    await sharp(SOURCE, { density: 384 })
      .resize(size, size, {
        fit: 'contain',
        background: BACKGROUND,
        withoutEnlargement: false,
      })
      .png({ compressionLevel: 9 })
      .toFile(target)

    const check = await sharp(target).metadata()
    if (check.format !== 'png' || check.width !== size || check.height !== size) {
      throw new Error(`Generated icon failed validation: ${target}`)
    }
    console.log(`[Aura Gym] ${size}x${size}: ${target}`)
  }
}

main().catch(error => {
  console.error('[Aura Gym] PWA icon generation failed:', error)
  process.exitCode = 1
})
