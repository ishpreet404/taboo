// Shareable end-of-game card: drawn on a canvas (no dependencies), shared through
// the native share sheet / Web Share API, or downloaded as a PNG.

import { APP_NAME, APP_TAGLINE, WEB_URL } from '../appConfig'
import { isNative } from './device'

export interface ResultsCardData {
  teams: Array<{ name: string; score: number }>
  winnerName: string | null // null = tie
  mvp: { name: string; points: number } | null
  packName: string
  modeName: string
}

const W = 1080
const H = 1350
const TEAM_COLORS = ['#60a5fa', '#f87171', '#4ade80']

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

export function drawResultsCard(data: ResultsCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

  // Background follows the player's current theme
  const css = getComputedStyle(document.documentElement)
  const rgb = (name: string, fallback: string) => `rgb(${css.getPropertyValue(name).trim() || fallback})`
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, rgb('--background-start-rgb', '10, 10, 30'))
  bg.addColorStop(1, rgb('--background-end-rgb', '15, 52, 96'))
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W)
  glow.addColorStop(0, `rgba(${css.getPropertyValue('--glow-rgb').trim() || '59, 130, 246'}, 0.35)`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'

  // Header
  ctx.font = font(800, 64)
  ctx.fillText(APP_NAME.toUpperCase(), W / 2, 130)
  ctx.font = font(400, 30)
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText(APP_TAGLINE, W / 2, 180)

  // Headline
  ctx.font = font(400, 150)
  ctx.fillText(data.winnerName ? '🏆' : '🤝', W / 2, 380)
  ctx.fillStyle = '#fbbf24'
  ctx.font = font(800, 84)
  ctx.fillText(fitText(ctx, data.winnerName ? `${data.winnerName} wins!` : "It's a tie!", W - 140), W / 2, 500)

  // Scoreboard
  const rowH = 130
  let y = 580
  const sorted = [...data.teams].map((t, i) => ({ ...t, color: TEAM_COLORS[i % TEAM_COLORS.length] })).sort((a, b) => b.score - a.score)
  for (const team of sorted) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.roundRect(90, y, W - 180, rowH - 20, 28)
    ctx.fill()
    ctx.fillStyle = team.color
    ctx.beginPath()
    ctx.roundRect(90, y, 14, rowH - 20, 7)
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.font = font(700, 50)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(fitText(ctx, team.name, W - 480), 140, y + 72)
    ctx.textAlign = 'right'
    ctx.font = font(800, 60)
    ctx.fillStyle = team.color
    ctx.fillText(String(team.score), W - 130, y + 76)
    y += rowH
  }

  // MVP
  ctx.textAlign = 'center'
  if (data.mvp) {
    y += 40
    ctx.font = font(600, 34)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('⭐  MOST VALUABLE PLAYER', W / 2, y)
    ctx.font = font(800, 60)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(fitText(ctx, `${data.mvp.name} · ${data.mvp.points} pts`, W - 160), W / 2, y + 78)
  }

  // Footer
  ctx.font = font(500, 32)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(`${data.packName} · ${data.modeName} mode`, W / 2, H - 150)
  ctx.font = font(700, 38)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`Play free: ${WEB_URL.replace(/^https?:\/\//, '')}`, W / 2, H - 90)

  return canvas
}

const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

/** Returns how the card left the app: 'shared', 'downloaded' or 'failed'. */
export async function shareResultsCard(data: ResultsCardData): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const canvas = drawResultsCard(data)
    const text = data.winnerName ? `${data.winnerName} just won at ${APP_NAME}! Think you can beat us?` : `A dead heat at ${APP_NAME}! Think you can beat us?`
    const fileName = `${APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-results.png`

    if (isNative()) {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
      const base64 = canvas.toDataURL('image/png').split(',')[1]
      const { uri } = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
      await Share.share({ title: APP_NAME, text, url: WEB_URL, files: [uri], dialogTitle: 'Share results' })
      return 'shared'
    }

    const blob = await toBlob(canvas)
    if (!blob) return 'failed'
    const file = new File([blob], fileName, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: APP_NAME, text: `${text} ${WEB_URL}`, files: [file] })
      return 'shared'
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 5000)
    return 'downloaded'
  } catch (e: any) {
    // Closing the share sheet is not a failure
    return e?.name === 'AbortError' || /cancel/i.test(e?.message || '') ? 'shared' : 'failed'
  }
}
