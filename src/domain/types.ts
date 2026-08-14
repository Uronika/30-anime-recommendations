export interface Artwork {
  imageUrl: string
  alt: string
}

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

export interface MusicSelection {
  source: 'music'
  title: string
  credit?: string
  relatedSubject: BangumiSubjectSelection | ManualSelection
}

export type Selection = BangumiSubjectSelection | BangumiCharacterSelection | ManualSelection | MusicSelection

export interface DailyEntry {
  day: number
  selection?: Selection
  comment: string
}

export interface ChallengeProfile {
  version: 1
  nickname: string
  subtitle: string
  entries: DailyEntry[]
  updatedAt: string
}

export function createEmptyProfile(): ChallengeProfile {
  return {
    version: 1,
    nickname: '',
    subtitle: '',
    entries: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, comment: '' })),
    updatedAt: new Date().toISOString(),
  }
}

export function selectionName(selection?: Selection): string {
  if (!selection) return ''
  return selection.source === 'music' ? selection.title : selection.name
}

export function selectionArtwork(selection?: Selection): Artwork | undefined {
  if (!selection) return undefined
  return selection.source === 'music' ? selection.relatedSubject.artwork : selection.artwork
}
