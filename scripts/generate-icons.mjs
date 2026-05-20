#!/usr/bin/env node
/**
 * Generate raster icons from the SVG sources in /assets.
 *
 * Outputs:
 *   assets/icons/icon.png            (1024x1024 master PNG used by electron-builder for mac/win/linux)
 *   assets/icons/icon-512.png        (512, generic large icon)
 *   assets/icons/icon-256.png        (256)
 *   assets/icons/icon-128.png        (128)
 *   assets/icons/icon-64.png         (64)
 *   assets/icons/icon-32.png         (32)
 *   assets/icons/icon-16.png         (16, favicon)
 *   assets/icons/wordmark-1280.png   (1280x320, for GitHub social preview and README hero)
 *
 * electron-builder will automatically derive .icns (macOS) and .ico (Windows)
 * from icon.png when packaging. See electron-builder.yml.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'assets', 'icons');

const iconSizes = [1024, 512, 256, 128, 64, 32, 16];

async function svgToPng(svgPath, size, outPath) {
  const svg = await readFile(svgPath);
  const buffer = await sharp(svg, { density: 300 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outPath, buffer);
  console.log(`  ok ${outPath.replace(root + '/', '')}  (${size}x${size}, ${buffer.length} bytes)`);
}

async function svgToPngExact(svgPath, width, height, outPath) {
  const svg = await readFile(svgPath);
  const buffer = await sharp(svg, { density: 300 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outPath, buffer);
  console.log(`  ok ${outPath.replace(root + '/', '')}  (${width}x${height}, ${buffer.length} bytes)`);
}

async function main() {
  await mkdir(out, { recursive: true });

  const logo = join(root, 'assets', 'logo.svg');
  console.log('Generating icons from assets/logo.svg');

  for (const size of iconSizes) {
    const name = size === 1024 ? 'icon.png' : `icon-${size}.png`;
    await svgToPng(logo, size, join(out, name));
  }

  const wordmark = join(root, 'assets', 'logo-wordmark.svg');
  console.log('\nGenerating wordmark from assets/logo-wordmark.svg');
  await svgToPngExact(wordmark, 1280, 320, join(out, 'wordmark-1280.png'));
  await svgToPngExact(wordmark, 640, 160, join(out, 'wordmark-640.png'));

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
