import type { Artwork, CatalogSelection, SubjectType } from '../domain/types'
import type { CatalogueSearchResult } from './ArchiveRepository'

interface ImageVariants { large?: string; common?: string; medium?: string; grid?: string; small?: string }
interface SubjectItem {
  id: number
  type?: number
  name: string
  name_cn?: string
  summary?: string
  nsfw?: boolean
  collection_total?: number
  images?: ImageVariants | null
}
interface CharacterItem { id: number; name: string; summary?: string; collects?: number; images?: ImageVariants | null }
interface SearchResponse<T> { data?: T[] }

const API_BASE = 'https://api.bgm.tv'
const subjectTypes: Record<number, SubjectType | undefined> = { 1: 'book', 2: 'anime', 3: 'music', 4: 'game' }

function remoteArtwork(images: ImageVariants | null | undefined, alt: string): Artwork | undefined {
  const imageUrl = [images?.large, images?.common, images?.medium, images?.grid, images?.small].find((value) => typeof value === 'string' && value.trim())
  return imageUrl ? { imageUrl, alt } : undefined
}

export class BangumiRepository {
  async search(keyword: string): Promise<CatalogueSearchResult[]> {
    const normalized = keyword.trim()
    if (!normalized) return []
    try {
      const [subjects, characters] = await Promise.all([this.searchSubjects(normalized), this.searchCharacters(normalized)])
      return [...subjects, ...characters]
    } catch {
      throw new Error('Bangumi 官方 API 无法连接，请重试或使用手工填写。')
    }
  }

  async select(result: CatalogueSearchResult): Promise<CatalogSelection> {
    return {
      source: 'bangumi-api', id: result.id, kind: result.kind, subjectType: result.subjectType, name: result.name,
      originalName: result.originalName, aliases: result.aliases, nsfw: result.nsfw, popularity: result.popularity,
      summary: result.summary, remoteArtwork: result.remoteArtwork,
    }
  }

  private async searchSubjects(keyword: string): Promise<CatalogueSearchResult[]> {
    const response = await this.post<SubjectItem>('subjects', { keyword, filter: { type: [1, 2, 3, 4] } })
    const results: CatalogueSearchResult[] = []
    for (const item of response) {
      const subjectType = subjectTypes[item.type ?? 0]
      if (!subjectType) continue
      const chinese = item.name_cn?.trim()
      const name = chinese || item.name
      results.push({
        id: item.id, kind: 'subject' as const, subjectType, name, originalName: chinese ? item.name : undefined,
        aliases: [], nsfw: Boolean(item.nsfw), popularity: Number(item.collection_total) || 0, source: 'bangumi-api' as const, summary: item.summary,
        remoteArtwork: remoteArtwork(item.images, name),
      })
    }
    return results
  }

  private async searchCharacters(keyword: string): Promise<CatalogueSearchResult[]> {
    const response = await this.post<CharacterItem>('characters', { keyword })
    return response.map((item) => ({
      id: item.id, kind: 'character' as const, name: item.name, aliases: [], nsfw: false,
      popularity: Number(item.collects) || 0, source: 'bangumi-api' as const, summary: item.summary,
      remoteArtwork: remoteArtwork(item.images, item.name),
    }))
  }

  private async post<T>(kind: 'subjects' | 'characters', body: object): Promise<T[]> {
    const response = await fetch(`${API_BASE}/v0/search/${kind}?limit=20`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) throw new Error(`Bangumi 官方 API 返回 HTTP ${response.status}。`)
    const payload = await response.json() as SearchResponse<T>
    return Array.isArray(payload.data) ? payload.data : []
  }
}

export const bangumiRepository = new BangumiRepository()
