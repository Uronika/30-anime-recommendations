import { afterEach, describe, expect, it, vi } from 'vitest'
import { BangumiRepository } from '../src/services/BangumiRepository'

describe('BangumiRepository', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses Chinese subject names and filters online results to supported subject types', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve({
      ok: true,
      json: async () => url.includes('/subjects')
        ? { data: [{ id: 12, type: 2, name: 'Original', name_cn: '中文名' }, { id: 99, type: 6, name: '不应出现' }] }
        : { data: [{ id: 7, name: '角色' }] },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const results = await new BangumiRepository().search('test')
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 12, kind: 'subject', name: '中文名', originalName: 'Original', subjectType: 'anime', source: 'bangumi-api' }),
      expect.objectContaining({ id: 7, kind: 'character', source: 'bangumi-api' }),
    ]))
    expect(results.some((item) => item.id === 99)).toBe(false)
  })
})
