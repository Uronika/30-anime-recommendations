import { CHALLENGE_DAYS } from '../domain/challenge'
import { selectionArtwork, selectionName, type ChallengeProfile } from '../domain/types'

const CANVAS_WIDTH = 3000
const COLUMNS = 5
const CELL_WIDTH = 520
const GUTTER = 50
const HEADER_HEIGHT = 360
const CELL_HEIGHT = 820
const CANVAS_HEIGHT = HEADER_HEIGHT + (6 * CELL_HEIGHT) + (7 * GUTTER)

function font(size: number, weight = 400) { return `${weight} ${size}px "Noto Sans SC", "Microsoft YaHei", sans-serif` }

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    const next = line + char
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = char } else line = next
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) return [...lines.slice(0, maxLines - 1), `${lines[maxLines - 1].slice(0, -1)}…`]
  return lines
}

async function loadImage(url: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(undefined)
    image.src = url
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.closePath()
}

export class PosterRenderer {
  async download(profile: ChallengeProfile): Promise<void> {
    const canvas = await this.render(profile)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('海报生成失败，请重试。')
    const date = new Date().toISOString().slice(0, 10)
    const name = (profile.nickname || '我的').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30)
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(blob); anchor.download = `${name}-30部动漫推荐-${date}.png`; anchor.click()
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000)
  }

  async render(profile: ChallengeProfile): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas'); canvas.width = CANVAS_WIDTH; canvas.height = CANVAS_HEIGHT
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f7f8f7'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#233224'; ctx.font = font(112, 800); ctx.fillText(`${profile.nickname || '我的'} · 30部动漫推荐`, GUTTER, 135)
    ctx.fillStyle = '#526053'; ctx.font = font(42, 400); ctx.fillText(profile.subtitle || '把动画记忆整理成一页档案', GUTTER, 205)
    const completed = profile.entries.filter((entry) => entry.selection).length
    ctx.fillStyle = '#6d776e'; ctx.font = font(32, 600); ctx.fillText(`${completed} / 30 已填写 · 动画档案册`, GUTTER, 285)

    await Promise.all(CHALLENGE_DAYS.map(async (day) => {
      const entry = profile.entries[day.day - 1]
      const col = (day.day - 1) % COLUMNS; const row = Math.floor((day.day - 1) / COLUMNS)
      const x = GUTTER + col * (CELL_WIDTH + GUTTER); const y = HEADER_HEIGHT + GUTTER + row * (CELL_HEIGHT + GUTTER)
      ctx.fillStyle = '#ffffff'; roundedRect(ctx, x, y, CELL_WIDTH, CELL_HEIGHT, 16); ctx.fill()
      const imageY = y + 84; const artwork = selectionArtwork(entry.selection)
      const image = artwork && await loadImage(artwork.imageUrl)
      ctx.save(); roundedRect(ctx, x + 26, imageY, CELL_WIDTH - 52, 330, 12); ctx.clip()
      if (image) {
        const scale = Math.max((CELL_WIDTH - 52) / image.width, 330 / image.height)
        ctx.drawImage(image, x + 26 + ((CELL_WIDTH - 52) - image.width * scale) / 2, imageY + (330 - image.height * scale) / 2, image.width * scale, image.height * scale)
      } else { ctx.fillStyle = '#dfe5df'; ctx.fillRect(x + 26, imageY, CELL_WIDTH - 52, 330) }
      ctx.restore()
      ctx.fillStyle = '#4f7254'; ctx.font = font(26, 750); ctx.fillText(`DAY ${String(day.day).padStart(2, '0')}  ${day.title}`, x + 26, y + 50)
      ctx.fillStyle = '#213025'; ctx.font = font(37, 760)
      const nameLines = wrap(ctx, selectionName(entry.selection) || '待补完', CELL_WIDTH - 52, 2)
      nameLines.forEach((line, i) => ctx.fillText(line, x + 26, y + 478 + i * 45))
      ctx.fillStyle = '#4c594e'; ctx.font = font(25, 400)
      const comment = entry.comment || (entry.selection ? '尚未留下理由。' : '这一格正等你写下答案。')
      wrap(ctx, comment, CELL_WIDTH - 52, 7).forEach((line, i) => ctx.fillText(line, x + 26, y + 585 + i * 33))
    }))
    return canvas
  }
}

export const posterRenderer = new PosterRenderer()
