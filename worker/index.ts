const API = 'https://api.bgm.tv'
const imageKinds = { subject: 'subjects', character: 'characters' } as const
const imageTypes = new Set(['large', 'common', 'medium', 'grid', 'small'])
type ImageKind = keyof typeof imageKinds
type WorkerHandler = { fetch(request: Request): Promise<Response> }
type CloudflareRequestInit = RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } }

function cors(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
  return new Response(response.body, { status: response.status, headers })
}

function error(message: string, status: number) {
  return cors(Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } }))
}

function parseImageRequest(request: Request): { kind: ImageKind; id: string; type: string } | undefined {
  const url = new URL(request.url)
  const match = /^\/image\/(subject|character)\/(\d{1,10})$/.exec(url.pathname)
  if (!match) return undefined
  const type = url.searchParams.get('type') ?? 'large'
  if (!imageTypes.has(type)) return undefined
  return { kind: match[1] as ImageKind, id: match[2], type }
}

/**
 * Image-only CORS relay. It never accepts a target URL, request body, or search
 * route, and does not retain any personal profile data.
 */
export const worker: WorkerHandler = {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return parseImageRequest(request) ? cors(new Response(null, { status: 204 })) : error('Unsupported image resource.', 404)
    if (request.method !== 'GET') return error('Only GET image requests are supported.', 405)
    const image = parseImageRequest(request)
    if (!image) return error('Unsupported image resource.', 404)

    const target = new URL(`/v0/${imageKinds[image.kind]}/${image.id}/image`, API)
    target.searchParams.set('type', image.type)
    try {
      const init: CloudflareRequestInit = {
        redirect: 'follow',
        cf: { cacheTtl: 86_400, cacheEverything: true },
      }
      const response = await fetch(target, init)
      if (!response.ok) return error('Bangumi image upstream returned an error.', response.status)
      if (!response.headers.get('content-type')?.startsWith('image/')) return error('Bangumi image upstream returned an invalid response.', 502)

      const headers = new Headers()
      for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
        const value = response.headers.get(name)
        if (value) headers.set(name, value)
      }
      headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800')
      return cors(new Response(response.body, { status: response.status, headers }))
    } catch {
      return error('Bangumi image upstream is unavailable.', 502)
    }
  },
}

export default worker
