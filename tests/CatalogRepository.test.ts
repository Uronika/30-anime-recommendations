import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogRepository } from '../src/services/CatalogRepository'
import { archiveRepository } from '../src/services/ArchiveRepository'
import { bangumiRepository } from '../src/services/BangumiRepository'

const onlineResult = { id: 1, kind: 'subject' as const, subjectType: 'anime' as const, name: '在线条目', aliases: [], nsfw: false, popularity: 1, source: 'bangumi-api' as const }

describe('CatalogRepository static-first behaviour', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the official API only after a successful static search returns no result', async () => {
    const staticSearch = vi.spyOn(archiveRepository, 'search').mockResolvedValue([])
    const onlineSearch = vi.spyOn(bangumiRepository, 'search').mockResolvedValue([onlineResult])
    const response = await new CatalogRepository().search('不存在')
    expect(staticSearch).toHaveBeenCalledOnce(); expect(onlineSearch).toHaveBeenCalledOnce()
    expect(response).toMatchObject({ state: 'online-fallback', results: [onlineResult] })
  })

  it('falls back after a static-load failure and exposes both failures when neither source works', async () => {
    vi.spyOn(archiveRepository, 'search').mockRejectedValue(new Error('静态失败'))
    vi.spyOn(bangumiRepository, 'search').mockRejectedValue(new Error('在线失败'))
    await expect(new CatalogRepository().search('关键词')).rejects.toThrow('静态失败；在线失败')
  })
})
