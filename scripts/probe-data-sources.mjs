import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const outputIndex = args.indexOf('--output')
const outputPath = outputIndex === -1 ? undefined : args[outputIndex + 1]
const timeoutIndex = args.indexOf('--timeout-ms')
const timeoutMs = timeoutIndex === -1 ? 12_000 : Number(args[timeoutIndex + 1])

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  throw new Error('--timeout-ms must be a positive number.')
}

const userAgent = '30-anime-recommendations-data-source-research/0.1 (https://github.com/Uronika/30-anime-recommendations)'

const anilistQuery = {
  query: 'query { Page(page: 1, perPage: 1) { media(type: ANIME) { id } } }',
}

const targets = [
  {
    id: 'bangumi-archive',
    url: 'https://raw.githubusercontent.com/bangumi/Archive/master/aux/latest.json',
    expected: [200],
  },
  {
    id: 'anilist',
    url: 'https://graphql.anilist.co',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(anilistQuery),
    expected: [200],
  },
  {
    id: 'tmdb',
    url: process.env.TMDB_API_KEY
      ? 'https://api.themoviedb.org/3/search/tv?api_key=key-configured&query=naruto'
      : 'https://api.themoviedb.org/3/search/tv?query=naruto',
    requestUrl: process.env.TMDB_API_KEY
      ? `https://api.themoviedb.org/3/search/tv?api_key=${encodeURIComponent(process.env.TMDB_API_KEY)}&query=naruto`
      : 'https://api.themoviedb.org/3/search/tv?query=naruto',
    expected: process.env.TMDB_API_KEY ? [200] : [401],
  },
  {
    id: 'jikan',
    url: 'https://api.jikan.moe/v4/anime?q=naruto&limit=1',
    expected: [200],
  },
  {
    id: 'moegirl',
    url: 'https://zh.moegirl.org.cn/api.php?action=query&meta=siteinfo&format=json',
    expected: [200],
  },
  {
    id: 'bangumi-data',
    url: 'https://unpkg.com/bangumi-data@0.3/dist/data.json',
    expected: [200, 301, 302, 307, 308],
  },
  {
    id: 'anime-offline-database',
    url: 'https://api.github.com/repos/ipkpjersi/anime-offline-database/releases/latest',
    expected: [200],
  },
  {
    id: 'bilibili-web',
    url: 'https://api.bilibili.com/x/web-interface/search/type?search_type=media_bangumi&keyword=naruto',
    expected: [412],
    expectedState: 'blocked',
  },
]

async function request(target) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(target.requestUrl ?? target.url, {
      method: target.method ?? 'GET',
      headers: { 'user-agent': userAgent, ...target.headers },
      body: target.body,
      redirect: 'manual',
      signal: controller.signal,
    })
    await response.body?.cancel()

    const expected = target.expected.includes(response.status)
    const state = expected ? (target.expectedState ?? 'reachable') : 'unexpected-status'
    return {
      id: target.id,
      observedAt: new Date().toISOString(),
      url: target.url,
      httpStatus: response.status,
      state,
      expected,
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      id: target.id,
      observedAt: new Date().toISOString(),
      url: target.url,
      httpStatus: null,
      state: error?.name === 'AbortError' ? 'timeout' : 'network-error',
      expected: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

const results = []
for (const target of targets) {
  results.push(await request(target))
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  networkScope: 'single-network HTTP probe; this is not mainland carrier validation',
  timeoutMs,
  results,
}

const text = `${JSON.stringify(report, null, 2)}\n`
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, text, 'utf8')
}
process.stdout.write(text)
