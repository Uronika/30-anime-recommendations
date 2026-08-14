export interface Artwork {
  imageUrl: string
  alt: string
}

export type SubjectType = 'book' | 'anime' | 'game' | 'music'
export type CatalogKind = 'subject' | 'character'

/** A snapshot or official-API record selected after the v2 catalogue migration. */
export interface CatalogSelection {
  source: 'archive' | 'bangumi-api'
  id: number
  kind: CatalogKind
  subjectType?: SubjectType
  name: string
  originalName?: string
  summary?: string
  aliases?: string[]
  nsfw: boolean
  popularity: number
  snapshot?: string
  /** Personal upload only. It is never sent to a catalogue service. */
  localArtwork?: Artwork
}

/** v1 records are retained so old JSON and legacy Day 28 records remain displayable. */
export interface BangumiSubjectSelection {
  source: 'bangumi-subject'
  id: number
  name: string
  originalName?: string
  artwork: Artwork
}

export interface BangumiCharacterSelection {
  source: 'bangumi-character'
  id: number
  name: string
  originalName?: string
  artwork: Artwork
}

export interface ManualSelection {
  source: 'manual'
  name: string
  artwork?: Artwork
}

/** Legacy v1 Day 28 shape. New Day 28 uses CatalogSelection like every other day. */
export interface MusicSelection {
  source: 'music'
  title: string
  credit?: string
  relatedSubject: BangumiSubjectSelection | ManualSelection
}

export type Selection = CatalogSelection | BangumiSubjectSelection | BangumiCharacterSelection | ManualSelection | MusicSelection

export interface DailyEntry {
  day: number
  selection?: Selection
  comment: string
}

export interface ChallengeProfile {
  version: 2
  nickname: string
  subtitle: string
  showCovers: boolean
  entries: DailyEntry[]
  updatedAt: string
}

type LegacyProfile = Omit<ChallengeProfile, 'version' | 'showCovers'> & { version: 1 }

export function createEmptyProfile(): ChallengeProfile {
  return {
    version: 2,
    nickname: '',
    subtitle: '',
    showCovers: false,
    entries: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, comment: '' })),
    updatedAt: new Date().toISOString(),
  }
}

function isSelection(value: unknown): value is Selection {
  if (!value || typeof value !== 'object') return false
  const source = (value as { source?: unknown }).source
  return source === 'archive' || source === 'bangumi-api' || source === 'bangumi-subject' || source === 'bangumi-character' || source === 'manual' || source === 'music'
}

function normalizeEntries(value: unknown): DailyEntry[] {
  const indexed = new Map<number, DailyEntry>()
  if (Array.isArray(value)) for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Partial<DailyEntry>
    if (!Number.isInteger(raw.day) || raw.day! < 1 || raw.day! > 30) continue
    indexed.set(raw.day!, {
      day: raw.day!,
      selection: isSelection(raw.selection) ? raw.selection : undefined,
      comment: typeof raw.comment === 'string' ? raw.comment.slice(0, 100) : '',
    })
  }
  return Array.from({ length: 30 }, (_, index) => indexed.get(index + 1) ?? { day: index + 1, comment: '' })
}

/** Accepts current v2 backups and upgrades valid v1 backups without catalog cache data. */
export function migrateProfile(value: unknown): ChallengeProfile {
  if (!value || typeof value !== 'object') throw new Error('这不是兼容的 30 部动漫推荐备份文件。')
  const raw = value as Partial<ChallengeProfile | LegacyProfile>
  if (raw.version !== 1 && raw.version !== 2) throw new Error('这不是兼容的 30 部动漫推荐备份文件。')
  const base: ChallengeProfile = {
    version: 2,
    nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, 30) : '',
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.slice(0, 60) : '',
    showCovers: raw.version === 2 && raw.showCovers === true,
    entries: normalizeEntries(raw.entries),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
  return base
}

export function selectionName(selection?: Selection): string {
  if (!selection) return ''
  return selection.source === 'music' ? selection.title : selection.name
}

export function selectionArtwork(selection?: Selection): Artwork | undefined {
  if (!selection) return undefined
  switch (selection.source) {
    case 'archive': case 'bangumi-api': return selection.localArtwork
    case 'music': return selection.relatedSubject.artwork
    case 'bangumi-subject': case 'bangumi-character': case 'manual': return selection.artwork
  }
}

export function selectionTypeLabel(selection?: Selection): string {
  if (!selection) return ''
  switch (selection.source) {
    case 'music': return '旧版曲目记录'
    case 'manual': return '手工填写'
    case 'bangumi-character': return '角色'
    case 'bangumi-subject': return '动画'
    case 'archive': case 'bangumi-api':
      if (selection.kind === 'character') return '角色'
      return ({ anime: '动画', book: '书籍 / 漫画', game: '游戏', music: '音乐' } as const)[selection.subjectType ?? 'anime']
  }
}
