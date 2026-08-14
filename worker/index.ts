const API = 'https://api.bgm.tv'
const allowedPaths = new Set(['/v0/search/subjects', '/v0/search/characters'])
type WorkerHandler = { fetch(request: Request): Promise<Response> }

function cors(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*'); headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); headers.set('Access-Control-Allow-Headers', 'Content-Type'); headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

function error(message: string, status: number) { return cors(Response.json({ error: message }, { status })) }

export const worker: WorkerHandler = {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
    const incoming = new URL(request.url)
    let target: URL
    if (incoming.pathname.startsWith('/image/')) {
      const [, , type, id] = incoming.pathname.split('/')
      if (!['subject', 'character'].includes(type) || !/^\d+$/.test(id ?? '')) return error('Unsupported image resource.', 400)
      target = new URL(`/v0/${type === 'subject' ? 'subjects' : 'characters'}/${id}/image`, API)
      target.search = incoming.search || '?type=grid'
    } else {
      const isDetail = /^\/v0\/(subjects|characters)\/\d+$/.test(incoming.pathname)
      if (!allowedPaths.has(incoming.pathname) && !isDetail) return error('Unsupported upstream route.', 404)
      if (isDetail && request.method !== 'GET') return error('Unsupported upstream method.', 405)
      target = new URL(incoming.pathname + incoming.search, API)
    }
    try {
      const init: RequestInit & { cf?: { cacheTtl: number; cacheEverything: boolean } } = { method: request.method, headers: request.method === 'POST' ? { 'content-type': 'application/json' } : undefined, body: request.method === 'POST' ? request.body : undefined, redirect: 'follow', cf: { cacheTtl: request.method === 'GET' ? 86400 : 0, cacheEverything: request.method === 'GET' } }
      const response = await fetch(target, init)
      return cors(response)
    } catch { return error('Bangumi upstream unavailable.', 502) }
  },
}

export default worker
