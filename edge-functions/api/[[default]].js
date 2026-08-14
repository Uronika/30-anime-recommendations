const BANGUMI_API = 'https://api.bgm.tv'
const SEARCH_PATHS = new Set(['/v0/search/subjects', '/v0/search/characters'])
const BANGUMI_USER_AGENT = '30-anime-recommendations/0.1.0 (https://github.com/Uronika/30-anime-recommendations)'

function withCors(response) {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

function error(message, status) {
  return withCors(Response.json({ error: message }, { status }))
}

function resolveTarget(request) {
  const incoming = new URL(request.url)
  const pathname = incoming.pathname.slice('/api'.length) || '/'

  if (pathname.startsWith('/image/')) {
    const [, , kind, id] = pathname.split('/')
    if (!['subject', 'character'].includes(kind) || !/^\d+$/.test(id || '')) return { error: error('Unsupported image resource.', 400) }
    if (request.method !== 'GET') return { error: error('Unsupported upstream method.', 405) }
    const resource = kind === 'subject' ? 'subjects' : 'characters'
    return { target: new URL(`/v0/${resource}/${id}/image${incoming.search || '?type=grid'}`, BANGUMI_API), cacheable: true }
  }

  const isDetail = /^\/v0\/(subjects|characters)\/\d+$/.test(pathname)
  if (!SEARCH_PATHS.has(pathname) && !isDetail) return { error: error('Unsupported upstream route.', 404) }
  if (SEARCH_PATHS.has(pathname) && request.method !== 'POST') return { error: error('Unsupported upstream method.', 405) }
  if (isDetail && request.method !== 'GET') return { error: error('Unsupported upstream method.', 405) }
  return { target: new URL(`${pathname}${incoming.search}`, BANGUMI_API), cacheable: isDetail }
}

export default async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }))

  const resolved = resolveTarget(request)
  if (resolved.error) return resolved.error

  try {
    const response = await fetch(resolved.target, {
      method: request.method,
      headers: request.method === 'POST'
        ? { 'content-type': 'application/json', 'user-agent': BANGUMI_USER_AGENT }
        : { 'user-agent': BANGUMI_USER_AGENT },
      body: request.method === 'POST' ? request.body : undefined,
      redirect: 'follow',
    })
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', resolved.cacheable ? 'public, max-age=86400, s-maxage=604800' : 'no-store')
    return withCors(new Response(response.body, { status: response.status, headers }))
  } catch {
    return error('Bangumi upstream unavailable.', 502)
  }
}
