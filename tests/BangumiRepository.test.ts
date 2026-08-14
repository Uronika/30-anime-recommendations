import { describe, expect, it, vi } from 'vitest'
import { BangumiRepository } from '../src/services/BangumiRepository'

describe('BangumiRepository', () => {
  it('uses a Chinese name when present and caches a repeated query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 12, name: 'Original', name_cn: '中文名', images: { grid: 'https://image.test/12.jpg' } }] }) })
    vi.stubGlobal('fetch', fetchMock)
    const repository = new BangumiRepository(); const first = await repository.searchSubjects('test'); const second = await repository.searchSubjects('test')
    expect(first[0]).toMatchObject({ id: 12, name: '中文名', originalName: 'Original' }); expect(second).toEqual(first); expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
