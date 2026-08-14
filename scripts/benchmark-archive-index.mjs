import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { normalizeSearchText } from './archive-snapshot.mjs'

const args = process.argv.slice(2)
const option = (name) => { const index = args.indexOf(name); return index === -1 ? undefined : args[index + 1] }
const dataDirectory = resolve(option('--data') ?? 'public/archive-data')
const outputPath = option('--output') ? resolve(option('--output')) : undefined
const shouldAssert = args.includes('--assert')
const manifest = JSON.parse(await readFile(resolve(dataDirectory, 'manifest.json'), 'utf8'))
const cases = JSON.parse(await readFile(new URL('../research/provider-test-cases.json', import.meta.url), 'utf8'))
const rank = (item) => item.kind === 'character' ? 4 : ({ anime: 0, book: 1, game: 2, music: 3 })[item.subjectType ?? 'anime']

function score(record, query) {
  let best = -1
  for (const form of [...record.forms.text, ...record.forms.pinyin]) {
    if (form === query) best = Math.max(best, 100)
    else if (form.startsWith(query)) best = Math.max(best, 80)
    else if (form.includes(query)) best = Math.max(best, 60)
  }
  return best
}

function expectedMatch(record, expectedNames) {
  const names = [record.name, record.originalName, ...(record.aliases ?? [])].filter(Boolean).map(normalizeSearchText)
  return expectedNames.map(normalizeSearchText).some((expected) => names.some((name) => name.includes(expected) || expected.includes(name)))
}

const all = []
for (let shard = 0; shard < manifest.files.searchShardCount; shard += 1) {
  const file = JSON.parse(await readFile(resolve(dataDirectory, manifest.files.searchDirectory, `${shard}.json`), 'utf8'))
  all.push(...file.entries)
}

const details = cases.map((testCase) => {
  const query = normalizeSearchText(testCase.query)
  const candidates = all
    .map((record) => ({ record, value: score(record, query) }))
    .filter((match) => match.value >= 0)
    .sort((left, right) => right.value - left.value || rank(left.record) - rank(right.record) || right.record.popularity - left.record.popularity || left.record.id - right.record.id)
    .slice(0, 20)
  return {
    id: testCase.id, category: testCase.category, subjectType: testCase.subjectType,
    query: testCase.query, passed: candidates.some((candidate) => expectedMatch(candidate.record, testCase.expectedNames)),
    firstResult: candidates[0] ? { id: candidates[0].record.id, name: candidates[0].record.name, kind: candidates[0].record.kind, subjectType: candidates[0].record.subjectType } : undefined,
  }
})

const summary = Object.fromEntries([...new Set(details.map((item) => item.category))].map((category) => {
  const group = details.filter((item) => item.category === category)
  return [category, { passed: group.filter((item) => item.passed).length, total: group.length, rate: group.length ? group.filter((item) => item.passed).length / group.length : 0 }]
}))
const report = { snapshot: manifest.snapshot.name, generatedAt: new Date().toISOString(), total: details.length, passed: details.filter((item) => item.passed).length, summary, details }
if (outputPath) { await mkdir(dirname(outputPath), { recursive: true }); await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8') }
process.stdout.write(`Archive benchmark: ${report.passed}/${report.total}; ${Object.entries(summary).map(([name, value]) => `${name} ${value.passed}/${value.total}`).join(', ')}\n`)
if (shouldAssert) {
  const strict = ['中文名', '日文原名']
  const other = ['别名', '长尾', '同名', 'NSFW', '热门角色']
  const below = [...strict.filter((category) => (summary[category]?.rate ?? 0) < 0.95), ...other.filter((category) => (summary[category]?.rate ?? 0) < 0.8)]
  if (below.length) throw new Error(`Archive benchmark did not meet acceptance thresholds: ${below.join('、')}`)
}
