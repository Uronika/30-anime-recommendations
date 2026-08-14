import { afterEach, describe, expect, it, vi } from 'vitest'
import { worker } from '../worker'

describe('Bangumi proxy worker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns CORS headers for a preflight without reaching the upstream', async () => {
    const response = await worker.fetch(new Request('https://proxy.test/image/subject/42', { method: 'OPTIONS' }))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects unapproved routes, methods, malformed IDs and unsupported image types', async () => {
    const unknown = await worker.fetch(new Request('https://proxy.test/anything'))
    const malformedImage = await worker.fetch(new Request('https://proxy.test/image/subject/not-a-number'))
    const unsupportedType = await worker.fetch(new Request('https://proxy.test/image/subject/42?type=original'))
    const post = await worker.fetch(new Request('https://proxy.test/image/subject/42', { method: 'POST' }))
    expect(unknown.status).toBe(404)
    expect(malformedImage.status).toBe(404)
    expect(unsupportedType.status).toBe(404)
    expect(post.status).toBe(405)
  })

  it('relays only a validated Bangumi image endpoint with CORS and caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('image-bytes', {
      status: 200,
      headers: { 'content-type': 'image/jpeg', etag: 'test-etag' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await worker.fetch(new Request('https://proxy.test/image/character/123?type=medium&ignored=https://other.test'))

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.bgm.tv/v0/characters/123/image?type=medium')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin')
    expect(response.headers.get('Cache-Control')).toContain('max-age=86400')
    expect(await response.text()).toBe('image-bytes')
  })

  it('does not relay a non-image upstream response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"no image"}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    const response = await worker.fetch(new Request('https://proxy.test/image/subject/42'))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ error: 'Bangumi image upstream returned an invalid response.' })
  })
})
