export interface ArchiveSnapshot {
  name: string
  url: string
  sha256: string
  size: number
}

export const ARCHIVE_SNAPSHOT: ArchiveSnapshot
export const SUBJECT_TYPES: Readonly<Record<number, { id: 'book' | 'anime' | 'music' | 'game'; label: string }>>
export const ALIAS_FIELDS: ReadonlySet<string>
export function normalizeSearchText(value: unknown): string
export function extractWhitelistedAliases(infobox: unknown): string[]
export function subjectTypeFromBangumi(type: number): 'book' | 'anime' | 'music' | 'game' | undefined
export function popularityOf(favorite: unknown): number
export function detailShardFor(id: number, shardCount: number): number
