import type { CatalogSelection } from '../domain/types'
import { archiveRepository, type CatalogueSearchResult, type IndexProgress } from './ArchiveRepository'
import { bangumiRepository } from './BangumiRepository'

export type CatalogueSearchState = 'archive' | 'online-fallback'

export interface CatalogueSearchResponse {
  results: CatalogueSearchResult[]
  state: CatalogueSearchState
  archiveError?: Error
}

/** Keeps the static-first / official-online-fallback rule outside UI components. */
export class CatalogRepository {
  async search(query: string, onProgress?: (progress: IndexProgress) => void): Promise<CatalogueSearchResponse> {
    try {
      const staticResults = await archiveRepository.search(query, onProgress)
      if (staticResults.length) return { results: staticResults, state: 'archive' }
      return { results: await bangumiRepository.search(query), state: 'online-fallback' }
    } catch (cause) {
      const archiveError = cause instanceof Error ? cause : new Error('Archive 静态资料库加载失败。')
      try {
        return { results: await bangumiRepository.search(query), state: 'online-fallback', archiveError }
      } catch (onlineCause) {
        const message = onlineCause instanceof Error ? onlineCause.message : '在线补充也无法使用。'
        throw new Error(`${archiveError.message}；${message}`)
      }
    }
  }

  async select(result: CatalogueSearchResult): Promise<CatalogSelection> {
    return result.source === 'archive' ? archiveRepository.select(result) : bangumiRepository.select(result)
  }
}

export const catalogRepository = new CatalogRepository()
