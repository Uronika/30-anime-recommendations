import type { BangumiCharacterSelection, BangumiSubjectSelection } from '../domain/types'

export interface SearchResult {
  id: number
  name: string
  originalName?: string
  imageUrl: string
  summary?: string
}

interface SubjectItem { id: number; name: string; name_cn?: string; images?: { grid?: string; medium?: string }; summary?: string }
interface CharacterItem { id: number; name: string; images?: { grid?: string; medium?: string }; summary?: string }
interface SearchResponse { data: SubjectItem[] }
interface CharacterResponse { data: CharacterItem[] }

const configuredBase = import.meta.env.VITE_BANGUMI_PROXY_URL as string | undefined
// EdgeOne Makers serves the production proxy at the same origin. A configured
// URL remains available only while the legacy GitHub Pages deployment is live.
const API_BASE = (configuredBase || '/api').replace(/\/$/, '')

export class BangumiRepository {
  private cache = new Map<string, SearchResult[]>()

  async searchSubjects(keyword: string): Promise<SearchResult[]> {
    return this.search('subjects', keyword)
  }

  async searchCharacters(keyword: string): Promise<SearchResult[]> {
    return this.search('characters', keyword)
  }

  toSubject(result: SearchResult): BangumiSubjectSelection {
    return { source: 'bangumi-subject', id: result.id, name: result.name, originalName: result.originalName, artwork: { imageUrl: result.imageUrl, alt: result.name } }
  }

  toCharacter(result: SearchResult): BangumiCharacterSelection {
    return { source: 'bangumi-character', id: result.id, name: result.name, originalName: result.originalName, artwork: { imageUrl: result.imageUrl, alt: result.name } }
  }

  private async search(type: 'subjects' | 'characters', keyword: string): Promise<SearchResult[]> {
    const normalized = keyword.trim()
    if (!normalized) return []
    const cacheKey = `${type}:${normalized}`
    const prior = this.cache.get(cacheKey)
    if (prior) return prior
    let response: Response
    try {
      response = await fetch(`${API_BASE}/v0/search/${type}?limit=12`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keyword: normalized }), signal: AbortSignal.timeout(12_000),
      })
    } catch {
      throw new Error('Bangumi 代理连接超时，请重试或使用手工填写。')
    }
    if (!response.ok) throw new Error('暂时无法连接 Bangumi，请稍后重试或使用手工填写。')
    const body = type === 'subjects' ? await response.json() as SearchResponse : await response.json() as CharacterResponse
    const results: SearchResult[] = body.data.map((item: SubjectItem | CharacterItem) => ({
      id: item.id,
      name: ('name_cn' in item && typeof item.name_cn === 'string' && item.name_cn) || item.name,
      originalName: ('name_cn' in item && typeof item.name_cn === 'string' && item.name_cn) ? item.name : undefined,
      imageUrl: this.imageUrl(type === 'subjects' ? 'subject' : 'character', item.id),
      summary: item.summary,
    }))
    this.cache.set(cacheKey, results)
    return results
  }

  private imageUrl(kind: 'subject' | 'character', id: number): string {
    return `${API_BASE}/image/${kind}/${id}?type=grid`
  }
}

export const bangumiRepository = new BangumiRepository()
