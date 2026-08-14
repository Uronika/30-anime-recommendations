import type { Artwork, CatalogKind, CatalogSelection, SubjectType } from '../domain/types'
import { challengeRepository } from './ChallengeRepository'

export interface CatalogueSearchResult {
  id: number
  kind: CatalogKind
  subjectType?: SubjectType
  name: string
  originalName?: string
  aliases: string[]
  nsfw: boolean
  popularity: number
  source: 'archive' | 'bangumi-api'
  snapshot?: string
  summary?: string
  remoteArtwork?: Artwork
}

interface SearchForms { text: string[]; pinyin: string[] }
interface ArchiveIndexRecord extends Omit<CatalogueSearchResult, 'source' | 'snapshot' | 'summary'> { forms: SearchForms }
interface ArchiveSearchShard { schemaVersion: 1; snapshot: string; entries: ArchiveIndexRecord[] }
interface ArchiveDetail { id: number; kind: CatalogKind; summary: string; relatedCharacterIds?: number[]; relatedSubjectIds?: number[] }
interface ArchiveDetailShard { subjects: Record<string, ArchiveDetail>; characters: Record<string, ArchiveDetail> }

export interface ArchiveManifest {
  schemaVersion: 1
  snapshot: { name: string; url: string; sha256: string; size: number }
  recordCounts: { subjects: number; characters: number }
  files: { searchDirectory: string; searchShardCount: number; detailsDirectory: string; detailShardCount: number }
}

export interface IndexProgress { completed: number; total: number; cached: boolean }

const DATA_ROOT = `${import.meta.env.BASE_URL}archive-data/`
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s\p{P}\p{S}_]+/gu, '')
const rank = (item: Pick<CatalogueSearchResult, 'kind' | 'subjectType'>) => item.kind === 'character' ? 4 : ({ anime: 0, book: 1, game: 2, music: 3 } as const)[item.subjectType ?? 'anime']

function score(record: ArchiveIndexRecord, query: string): number {
  const forms = record.forms
  const fields = [...forms.text, ...forms.pinyin]
  let best = -1
  for (const field of fields) {
    if (field === query) best = Math.max(best, 100)
    else if (field.startsWith(query)) best = Math.max(best, 80)
    else if (field.includes(query)) best = Math.max(best, 60)
  }
  return best
}

function shardFor(id: number, count: number) { return Math.abs(id) % count }

export class ArchiveRepository {
  private manifest?: ArchiveManifest
  private index?: ArchiveIndexRecord[]
  private details = new Map<number, ArchiveDetailShard>()

  async ensureIndex(onProgress?: (progress: IndexProgress) => void): Promise<void> {
    if (this.index) { onProgress?.({ completed: 1, total: 1, cached: true }); return }
    const manifest = await this.getManifest()
    const all: ArchiveIndexRecord[] = []
    const { searchShardCount, searchDirectory } = manifest.files
    onProgress?.({ completed: 0, total: searchShardCount, cached: false })
    for (let shard = 0; shard < searchShardCount; shard += 1) {
      const key = `archive-search:${manifest.snapshot.name}:${shard}`
      let payload = await challengeRepository.getArchiveCache<ArchiveSearchShard>(key)
      const cached = Boolean(payload)
      if (!payload || payload.snapshot !== manifest.snapshot.name) {
        payload = await this.fetchJson<ArchiveSearchShard>(`${searchDirectory}/${shard}.json`)
        if (payload.snapshot !== manifest.snapshot.name || !Array.isArray(payload.entries)) throw new Error('Archive 搜索索引格式无效。')
        await challengeRepository.setArchiveCache(key, payload)
      }
      all.push(...payload.entries)
      onProgress?.({ completed: shard + 1, total: searchShardCount, cached })
    }
    this.index = all
  }

  resetMemoryCache(): void {
    this.manifest = undefined
    this.index = undefined
    this.details.clear()
  }

  async search(query: string, onProgress?: (progress: IndexProgress) => void): Promise<CatalogueSearchResult[]> {
    const normalized = normalize(query)
    if (!normalized) return []
    await this.ensureIndex(onProgress)
    return this.index!
      .map((record) => ({ record, score: score(record, normalized) }))
      .filter((match) => match.score >= 0)
      .sort((left, right) => right.score - left.score || rank(left.record) - rank(right.record) || right.record.popularity - left.record.popularity || left.record.id - right.record.id)
      .map(({ record }) => ({
        id: record.id, kind: record.kind, subjectType: record.subjectType, name: record.name, originalName: record.originalName,
        aliases: record.aliases, nsfw: record.nsfw, popularity: record.popularity, source: 'archive' as const, snapshot: this.manifest!.snapshot.name,
      }))
  }

  async select(result: CatalogueSearchResult): Promise<CatalogSelection> {
    const detail = await this.detail(result.id, result.kind)
    return {
      source: 'archive', id: result.id, kind: result.kind, subjectType: result.subjectType, name: result.name,
      originalName: result.originalName, aliases: result.aliases, nsfw: result.nsfw, popularity: result.popularity,
      summary: detail.summary, snapshot: result.snapshot,
    }
  }

  async getManifest(): Promise<ArchiveManifest> {
    if (!this.manifest) {
      const manifest = await this.fetchJson<ArchiveManifest>('manifest.json')
      if (manifest.schemaVersion !== 1 || !manifest.snapshot?.name || !manifest.files?.searchShardCount) throw new Error('Archive 快照清单无效。')
      this.manifest = manifest
    }
    return this.manifest
  }

  private async detail(id: number, kind: CatalogKind): Promise<ArchiveDetail> {
    const manifest = await this.getManifest()
    const shard = shardFor(id, manifest.files.detailShardCount)
    let payload = this.details.get(shard)
    if (!payload) {
      const key = `archive-detail:${manifest.snapshot.name}:${shard}`
      payload = await challengeRepository.getArchiveCache<ArchiveDetailShard>(key)
      if (!payload) {
        payload = await this.fetchJson<ArchiveDetailShard>(`${manifest.files.detailsDirectory}/${shard}.json`)
        await challengeRepository.setArchiveCache(key, payload)
      }
      this.details.set(shard, payload)
    }
    const record = (kind === 'subject' ? payload.subjects : payload.characters)[String(id)]
    if (!record) throw new Error('Archive 详情分片中未找到该记录。')
    return record
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${DATA_ROOT}${path}`, { signal: AbortSignal.timeout(45_000) })
    if (!response.ok) throw new Error(`Archive 静态资料库加载失败（HTTP ${response.status}）。`)
    return response.json() as Promise<T>
  }
}

export const archiveRepository = new ArchiveRepository()
