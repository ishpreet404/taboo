// Generates every brand image from one vector design:
//   node scripts/make-brand-assets.mjs
//
//   assets/icon-only.png, icon-foreground.png, icon-background.png, splash*.png
//                           -> input for `npx @capacitor/assets generate`
//   public/logo.png         -> website logo + favicon
//   store/                  -> Play Store icon (512) and feature graphic (1024x500)
//
// Edit the shapes/colours below and re-run to restyle everything at once.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INK = '#2E1065' // eyes + zipper
const ACCENT = '#FBBF24' // the "!"
const PULL = '#EC4899' // zipper pull

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4338CA"/>
      <stop offset="0.55" stop-color="#9333EA"/>
      <stop offset="1" stop-color="#EC4899"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.15" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bubble" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#EDE9FE"/>
    </linearGradient>
  </defs>`

const background = (w, h) => `<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#glow)"/>`

// The mark, drawn on a 1024 box: a speech-bubble face with a zipped mouth and a "!".
const teeth = Array.from({ length: 7 }, (_, i) => {
  const x = 392 + i * 40
  return `<line x1="${x}" y1="508" x2="${x}" y2="552" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>`
}).join('')

const mark = `
  <g>
    <!-- soft shadow -->
    <path d="M332 252h400a120 120 0 0 1 120 120v200a120 120 0 0 1-120 120H500L330 826l36-134h-34A120 120 0 0 1 212 572V372a120 120 0 0 1 120-120z"
          fill="#1E1B4B" opacity="0.28" transform="translate(0 22)"/>
    <!-- bubble with tail -->
    <path d="M332 232h400a120 120 0 0 1 120 120v200a120 120 0 0 1-120 120H500L330 806l36-134h-34A120 120 0 0 1 212 552V352a120 120 0 0 1 120-120z"
          fill="url(#bubble)"/>
    <!-- eyes -->
    <circle cx="420" cy="396" r="36" fill="${INK}"/>
    <circle cx="624" cy="396" r="36" fill="${INK}"/>
    <circle cx="432" cy="384" r="11" fill="#fff"/>
    <circle cx="636" cy="384" r="11" fill="#fff"/>
    <!-- zipped mouth -->
    <line x1="372" y1="530" x2="660" y2="530" stroke="${INK}" stroke-width="20" stroke-linecap="round"/>
    ${teeth}
    <!-- zipper pull -->
    <circle cx="676" cy="530" r="30" fill="${PULL}"/>
    <circle cx="676" cy="530" r="11" fill="#fff"/>
    <rect x="662" y="556" width="28" height="74" rx="14" fill="${PULL}"/>
    <!-- the "!" -->
    <g transform="rotate(14 878 176)">
      <rect x="848" y="38" width="60" height="176" rx="30" fill="${ACCENT}"/>
      <circle cx="878" cy="272" r="34" fill="${ACCENT}"/>
    </g>
  </g>`

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${body}</svg>`
// Place the 1024-box mark at a given scale, centred on (cx, cy)
const placed = (scale, cx, cy) => `<g transform="translate(${cx - 512 * scale} ${cy - 512 * scale}) scale(${scale})">${mark}</g>`

const out = async (file, markup, size) => {
  const target = resolve(root, file)
  mkdirSync(dirname(target), { recursive: true })
  let image = sharp(Buffer.from(markup))
  if (size) image = image.resize(size, size)
  await image.png().toFile(target)
  console.log('wrote', file)
}

// App icon (legacy/iOS: full bleed, no transparency)
await out('assets/icon-only.png', svg(1024, 1024, background(1024, 1024) + placed(0.76, 512, 528)))
// Android adaptive icon: the mark must sit inside the central safe zone
await out('assets/icon-foreground.png', svg(1024, 1024, placed(0.6, 512, 516)))
await out('assets/icon-background.png', svg(1024, 1024, background(1024, 1024)))
// Splash screens
await out('assets/splash.png', svg(2732, 2732, background(2732, 2732) + placed(0.9, 1366, 1366)))
await out('assets/splash-dark.png', svg(2732, 2732, `<rect width="2732" height="2732" fill="#0A0A1E"/>` + placed(0.9, 1366, 1366)))

// Website logo (transparent) + favicon source
await out('public/logo.png', svg(1024, 1024, placed(0.98, 512, 512)), 512)

// Play Store listing
await out('store/play-icon-512.png', svg(1024, 1024, background(1024, 1024) + placed(0.76, 512, 528)), 512)
const feature = svg(
  1024,
  500,
  background(1024, 500) +
    placed(0.4, 230, 250) +
    `<text x="440" y="235" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="78" fill="#fff">Don't Say it!</text>
     <text x="444" y="300" font-family="Segoe UI, Arial, sans-serif" font-weight="500" font-size="33" fill="#fff" opacity="0.9">The forbidden-words party game</text>`,
)
mkdirSync(resolve(root, 'store'), { recursive: true })
await sharp(Buffer.from(feature)).png().toFile(resolve(root, 'store/play-feature-1024x500.png'))
console.log('wrote store/play-feature-1024x500.png')
writeFileSync(resolve(root, 'assets/logo.svg'), svg(1024, 1024, background(1024, 1024) + placed(0.76, 512, 528)))
console.log('wrote assets/logo.svg')
