import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const provider = option('--provider') ?? 'anilist'
const limit = Number(option('--limit') ?? 10)
const offset = Number(option('--offset') ?? 0)
const delayMs = Number(option('--delay-ms') ?? 900)
const outputPath = option('--output')

if (!['anilist', 'jikan', 'moegirl', 'tmdb'].includes(provider)) {
  throw new Error('--provider must be anilist, jikan, moegirl, or tmdb.')
}
if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error('--limit must be an integer from 1 to 100.')
}
if (!Number.isInteger(offset) || offset < 0 || offset >= 100) {
  throw new Error('--offset must be an integer from 0 to 99.')
}
if (!Number.isFinite(delayMs) || delayMs < 0) {
  throw new Error('--delay-ms must be a non-negative number.')
}
if (provider === 'tmdb' && !process.env.TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY is required when benchmarking tmdb.')
}

const userAgent = '30-anime-recommendations-data-source-research/0.1 (https://github.com/Uronika/30-anime-recommendations)'
const cases = JSON.parse(await readFile(new URL('../research/provider-test-cases.json', import.meta.url), 'utf8'))
const selectedCases = cases.slice(offset, offset + limit)

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s\p{P}\p{S}_]+/gu, '')
const matches = (result, expectedNames) => {
  const availableNames = [result.name, result.originalName, ...(result.aliases ?? [])]
    .filter(Boolean)
    .map(normalize)
  return expectedNames.map(normalize).some((expected) => availableNames.some((name) => name.includes(expected) || expected.includes(name)))
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'user-agent': userAgent, ...options.headers } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function searchAniList(testCase) {
  const isSubject = testCase.kind === 'subject'
  const query = isSubject
    ? 'query ($search: String!) { Page(page: 1, perPage: 10) { media(search: $search, type: ANIME) { id title { romaji english native userPreferred } synonyms coverImage { large medium } } } }'
    : 'query ($search: String!) { Page(page: 1, perPage: 10) { characters(search: $search) { id name { full native alternative } image { large medium } } } }'
  const response = await fetchJson('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { search: testCase.query } }),
  })
  if (response.errors?.length) throw new Error(response.errors.map((item) => item.message).join('; '))
  const data = isSubject ? response.data.Page.media : response.data.Page.characters
  return data.map((item) => isSubject
    ? {
        id: String(item.id),
        name: item.title.userPreferred ?? item.title.romaji ?? item.title.native,
        originalName: item.title.native,
        aliases: [item.title.romaji, item.title.english, ...item.synonyms].filter(Boolean),
        artworkUrl: item.coverImage.large ?? item.coverImage.medium,
      }
    : {
        id: String(item.id),
        name: item.name.full,
        originalName: item.name.native,
        aliases: item.name.alternative ?? [],
        artworkUrl: item.image.large ?? item.image.medium,
      })
}

async function searchJikan(testCase) {
  const endpoint = testCase.kind === 'subject' ? 'anime' : 'characters'
  const response = await fetchJson(`https://api.jikan.moe/v4/${endpoint}?q=${encodeURIComponent(testCase.query)}&limit=10`)
  return response.data.map((item) => ({
    id: String(item.mal_id),
    name: item.title ?? item.name,
    originalName: item.title_japanese ?? item.name_kanji,
    aliases: [...(item.titles?.map((title) => title.title) ?? []), ...(item.nicknames ?? [])].filter(Boolean),
    artworkUrl: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url,
  }))
}

async function searchMoegirl(testCase) {
  const params = new URLSearchParams({
    action: 'query', list: 'search', srsearch: testCase.query, srlimit: '10', format: 'json', utf8: '1', origin: '*',
  })
  const response = await fetchJson(`https://zh.moegirl.org.cn/api.php?${params}`)
  return response.query.search.map((item) => ({ id: String(item.pageid), name: item.title, aliases: [] }))
}

async function searchTmdb(testCase) {
  if (testCase.kind === 'character') return []
  const params = new URLSearchParams({ api_key: process.env.TMDB_API_KEY, language: 'zh-CN', query: testCase.query })
  const response = await fetchJson(`https://api.themoviedb.org/3/search/tv?${params}`)
  return response.results.map((item) => ({
    id: String(item.id), name: item.name, originalName: item.original_name, aliases: [],
    artworkUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
  }))
}

const searchers = { anilist: searchAniList, jikan: searchJikan, moegirl: searchMoegirl, tmdb: searchTmdb }
const results = []

for (const [index, testCase] of selectedCases.entries()) {
  const startedAt = Date.now()
  try {
    const candidates = await searchers[provider](testCase)
    results.push({
      id: testCase.id,
      kind: testCase.kind,
      category: testCase.category,
      query: testCase.query,
      expectedNames: testCase.expectedNames,
      state: candidates.length ? 'completed' : 'no-result',
      candidateCount: candidates.length,
      matched: candidates.some((candidate) => matches(candidate, testCase.expectedNames)),
      artworkAvailable: candidates.some((candidate) => Boolean(candidate.artworkUrl)),
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    results.push({
      id: testCase.id,
      kind: testCase.kind,
      category: testCase.category,
      query: testCase.query,
      expectedNames: testCase.expectedNames,
      state: 'error',
      candidateCount: 0,
      matched: false,
      artworkAvailable: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  if (index < selectedCases.length - 1 && delayMs > 0) await pause(delayMs)
}

const completed = results.filter((item) => item.state !== 'error')
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  provider,
  caseOffset: offset,
  requestedCases: selectedCases.length,
  delayMs,
  summary: {
    completed: completed.length,
    errors: results.length - completed.length,
    matches: results.filter((item) => item.matched).length,
    matchRate: results.length ? Number((results.filter((item) => item.matched).length / results.length).toFixed(4)) : 0,
    artworkCoverage: results.length ? Number((results.filter((item) => item.artworkAvailable).length / results.length).toFixed(4)) : 0,
  },
  results,
}

const text = `${JSON.stringify(report, null, 2)}\n`
if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, text, 'utf8')
}
process.stdout.write(text)
