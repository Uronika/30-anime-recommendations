import { CHALLENGE_DAYS } from '../domain/challenge'
import { selectionArtwork, selectionName, selectionTypeLabel, type DailyEntry, type ChallengeProfile } from '../domain/types'

const CANVAS_WIDTH = 3000
const COLUMNS = 5
const CELL_WIDTH = 520
const GUTTER = 50
const HEADER_HEIGHT = 360
const PAD = 26
const COVER_HEIGHT = 300
const TEXT_CARD_PADDING = 32
const TEXT_CARD_TOP = 32
const TEXT_CARD_BOTTOM = 40
const TEXT_DAY_LINE_HEIGHT = 32
const TEXT_DAY_TO_NAME_GAP = 20
const TEXT_NAME_LINE_HEIGHT = 52
const TEXT_NAME_TO_COMMENT_GAP = 28
const TEXT_COMMENT_LINE_HEIGHT = 40

function font(size: number, weight = 400) { return `${weight} ${size}px "Noto Sans SC", "Microsoft YaHei", sans-serif` }

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text) {
    const next = line + char
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = char } else line = next
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

async function loadImage(url: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(undefined)
    image.src = url
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.closePath()
}

function entryText(entry: DailyEntry) { return entry.comment || (entry.selection ? '尚未留下理由。' : '这一格正等你写下答案。') }

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
    const measure = document.createElement('canvas').getContext('2d')!
    const cards = CHALLENGE_DAYS.map((day) => {
      const entry = profile.entries[day.day - 1]
      const horizontalPadding = profile.showCovers ? PAD : TEXT_CARD_PADDING
      measure.font = font(profile.showCovers ? 37 : 40, 760)
      const nameLines = wrap(measure, selectionName(entry.selection) || '待补完', CELL_WIDTH - horizontalPadding * 2)
      measure.font = font(profile.showCovers ? 25 : 26, 400)
      const commentLines = wrap(measure, entryText(entry), CELL_WIDTH - horizontalPadding * 2)
      const height = profile.showCovers
        ? PAD + 34 + COVER_HEIGHT + 24 + nameLines.length * 45 + 22 + commentLines.length * 33 + PAD
        : TEXT_CARD_TOP + TEXT_DAY_LINE_HEIGHT + TEXT_DAY_TO_NAME_GAP + nameLines.length * TEXT_NAME_LINE_HEIGHT + TEXT_NAME_TO_COMMENT_GAP + commentLines.length * TEXT_COMMENT_LINE_HEIGHT + TEXT_CARD_BOTTOM
      return { day, entry, nameLines, commentLines, height }
    })
    const rowHeights = Array.from({ length: 6 }, (_, row) => Math.max(...cards.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map((card) => card.height)))
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = HEADER_HEIGHT + rowHeights.reduce((total, height) => total + height, 0) + GUTTER * 7
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f7f8f7'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#233224'; ctx.font = font(112, 800); ctx.fillText(`${profile.nickname || '我的'} · 30部动漫推荐`, GUTTER, 135)
    ctx.fillStyle = '#526053'; ctx.font = font(42, 400); ctx.fillText(profile.subtitle || '把动画记忆整理成一页档案', GUTTER, 205)
    const completed = profile.entries.filter((entry) => entry.selection).length
    ctx.fillStyle = '#6d776e'; ctx.font = font(32, 600); ctx.fillText(`${completed} / 30 已填写 · 动画档案册`, GUTTER, 285)

    const imageEntries = profile.showCovers ? cards.map((card) => selectionArtwork(card.entry.selection)?.imageUrl).filter((url): url is string => Boolean(url)) : []
    const images = new Map(await Promise.all(imageEntries.map(async (url) => [url, await loadImage(url)] as const)))
    let rowY = HEADER_HEIGHT + GUTTER
    for (let row = 0; row < 6; row += 1) {
      const rowCards = cards.slice(row * COLUMNS, row * COLUMNS + COLUMNS)
      for (const card of rowCards) {
        const col = (card.day.day - 1) % COLUMNS
        const x = GUTTER + col * (CELL_WIDTH + GUTTER); const y = rowY
        const cellHeight = rowHeights[row]
        ctx.fillStyle = '#ffffff'; roundedRect(ctx, x, y, CELL_WIDTH, cellHeight, 16); ctx.fill()
        if (profile.showCovers) {
          ctx.fillStyle = '#4f7254'; ctx.font = font(26, 750); ctx.fillText(`DAY ${String(card.day.day).padStart(2, '0')}  ${card.day.title}`, x + PAD, y + PAD + 25)
          let cursorY = y + PAD + 54
          const coverX = x + PAD; const coverWidth = CELL_WIDTH - PAD * 2
          const image = selectionArtwork(card.entry.selection) ? images.get(selectionArtwork(card.entry.selection)!.imageUrl) : undefined
          ctx.save(); roundedRect(ctx, coverX, cursorY, coverWidth, COVER_HEIGHT, 12); ctx.clip()
          if (image) {
            const scale = Math.max(coverWidth / image.width, COVER_HEIGHT / image.height)
            ctx.drawImage(image, coverX + (coverWidth - image.width * scale) / 2, cursorY + (COVER_HEIGHT - image.height * scale) / 2, image.width * scale, image.height * scale)
          } else {
            ctx.fillStyle = '#dfe5df'; ctx.fillRect(coverX, cursorY, coverWidth, COVER_HEIGHT)
            ctx.fillStyle = '#58715b'; ctx.font = font(34, 700); ctx.textAlign = 'center'; ctx.fillText(card.entry.selection ? selectionTypeLabel(card.entry.selection) : '待补完', coverX + coverWidth / 2, cursorY + COVER_HEIGHT / 2); ctx.textAlign = 'left'
          }
          ctx.restore(); cursorY += COVER_HEIGHT + 24
          ctx.fillStyle = '#213025'; ctx.font = font(37, 760)
          card.nameLines.forEach((line, index) => ctx.fillText(line, x + PAD, cursorY + index * 45)); cursorY += card.nameLines.length * 45 + 22
          ctx.fillStyle = '#4c594e'; ctx.font = font(25, 400)
          card.commentLines.forEach((line, index) => ctx.fillText(line, x + PAD, cursorY + index * 33))
        } else {
          const contentX = x + TEXT_CARD_PADDING
          let cursorY = y + TEXT_CARD_TOP
          ctx.textBaseline = 'top'
          ctx.fillStyle = '#4f7254'; ctx.font = font(26, 750)
          ctx.fillText(`DAY ${String(card.day.day).padStart(2, '0')}  ${card.day.title}`, contentX, cursorY)
          cursorY += TEXT_DAY_LINE_HEIGHT + TEXT_DAY_TO_NAME_GAP
          ctx.fillStyle = '#213025'; ctx.font = font(40, 760)
          card.nameLines.forEach((line, index) => ctx.fillText(line, contentX, cursorY + index * TEXT_NAME_LINE_HEIGHT))
          cursorY += card.nameLines.length * TEXT_NAME_LINE_HEIGHT + TEXT_NAME_TO_COMMENT_GAP
          ctx.fillStyle = '#4c594e'; ctx.font = font(26, 400)
          card.commentLines.forEach((line, index) => ctx.fillText(line, contentX, cursorY + index * TEXT_COMMENT_LINE_HEIGHT))
          ctx.textBaseline = 'alphabetic'
        }
      }
      rowY += rowHeights[row] + GUTTER
    }
    return canvas
  }
}

export const posterRenderer = new PosterRenderer()
