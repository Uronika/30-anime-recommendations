import { describe, expect, it } from 'vitest'
import { worker } from '../worker'

describe('Bangumi proxy worker', () => {
  it('returns CORS headers for a preflight without reaching the upstream', async () => {
    const response = await worker.fetch(new Request('https://proxy.test/v0/search/subjects', { method: 'OPTIONS' }))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('rejects unapproved routes and malformed image IDs', async () => {
    const unknown = await worker.fetch(new Request('https://proxy.test/anything'))
    const malformedImage = await worker.fetch(new Request('https://proxy.test/image/subject/not-a-number'))
    expect(unknown.status).toBe(404)
    expect(malformedImage.status).toBe(400)
  })
})
