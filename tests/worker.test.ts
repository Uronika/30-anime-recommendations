import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error EdgeOne discovers edge functions from JavaScript files.
import onRequest from '../edge-functions/api/[[default]].js'

describe('Bangumi EdgeOne proxy', () => {
  it('returns CORS headers for a preflight without reaching the upstream', async () => {
    const response = await onRequest({ request: new Request('https://proxy.test/api/v0/search/subjects', { method: 'OPTIONS' }) })
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects unapproved routes and malformed image IDs', async () => {
    const unknown = await onRequest({ request: new Request('https://proxy.test/api/anything') })
    const malformedImage = await onRequest({ request: new Request('https://proxy.test/api/image/subject/not-a-number') })
    expect(unknown.status).toBe(404)
    expect(malformedImage.status).toBe(400)
  })

  it('forwards an approved detail route to the fixed Bangumi origin', async () => {
    const upstream = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('{"id":12}', { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', upstream)
    try {
      const response = await onRequest({ request: new Request('https://proxy.test/api/v0/subjects/12?responseGroup=small') })
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toContain('max-age=86400')
      expect(String(upstream.mock.calls[0][0])).toBe('https://api.bgm.tv/v0/subjects/12?responseGroup=small')
      expect(new Headers(upstream.mock.calls[0][1]?.headers).get('user-agent')).toContain('30-anime-recommendations/')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
