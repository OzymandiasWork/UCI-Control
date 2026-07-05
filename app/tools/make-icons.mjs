// Genera los PNG del ícono desde los SVG (sharp).
import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const rounded = readFileSync('public/favicon.svg')
const maskable = readFileSync('tools/icon-maskable.svg')

const jobs = [
  [rounded, 192, 'public/icon-192.png'],
  [rounded, 512, 'public/icon-512.png'],
  [maskable, 512, 'public/icon-maskable-512.png'],
  [maskable, 180, 'public/apple-touch-icon.png'],
]

for (const [src, size, out] of jobs) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(out)
  console.log(`OK ${out} (${size}x${size})`)
}
