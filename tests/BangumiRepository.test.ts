import { afterEach, describe, expect, it, vi } from 'vitest'
import { BangumiRepository } from '../src/services/BangumiRepository'

describe('BangumiRepository', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses Chinese subject names and filters online results to supported subject types', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve({
      ok: true,
      json: async () => url.includes('/subjects')
        ? { data: [{ id: 12, type: 2, name: 'Original', name_cn: '中文名', images: { large: 'https://images.example.test/subject.jpg' } }, { id: 99, type: 6, name: '不应出现' }] }
        : { data: [{ id: 7, name: '角色', images: { medium: 'https://images.example.test/character.jpg' } }] },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const results = await new BangumiRepository().search('test')
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 12, kind: 'subject', name: '中文名', originalName: 'Original', subjectType: 'anime', source: 'bangumi-api', remoteArtwork: { imageUrl: 'https://api.bgm.tv/v0/subjects/12/image?type=grid', alt: '中文名' } }),
      expect.objectContaining({ id: 7, kind: 'character', source: 'bangumi-api', remoteArtwork: { imageUrl: 'https://api.bgm.tv/v0/characters/7/image?type=grid', alt: '角色' } }),
    ]))
    expect(results.some((item) => item.id === 99)).toBe(false)
    const selected = await new BangumiRepository().select(results.find((item) => item.id === 12)!)
    expect(selected.remoteArtwork).toEqual({ imageUrl: 'https://api.bgm.tv/v0/subjects/12/image?type=grid', alt: '中文名' })
  })
})
