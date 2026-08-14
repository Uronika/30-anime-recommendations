import { createHash } from 'node:crypto'
import { createWriteStream, createReadStream } from 'node:fs'
import { access, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { createInterface } from 'node:readline'
import { pinyin } from 'pinyin-pro'
import unzipper from 'unzipper'
import { ALIAS_FIELDS, ARCHIVE_SNAPSHOT, detailShardFor, extractWhitelistedAliases, normalizeSearchText, popularityOf, subjectTypeFromBangumi } from './archive-snapshot.mjs'

const SEARCH_SHARD_COUNT = 64
const DETAIL_SHARD_COUNT = 64
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const cacheDirectory = resolve(option('--cache-dir') ?? '.cache/bangumi-archive')
const outputDirectory = resolve(option('--output') ?? 'public/archive-data')
const suppliedArchive = option('--archive')
const archivePath = resolve(suppliedArchive ?? join(cacheDirectory, ARCHIVE_SNAPSHOT.name))

const hasHan = (value) => /\p{Script=Han}/u.test(value)

function pinyinForms(value) {
  if (!hasHan(value)) return []
  const pieces = pinyin(value, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
    .map((part) => String(part).trim())
    .filter(Boolean)
  if (!pieces.length) return []
  return [normalizeSearchText(pieces.join('')), normalizeSearchText(pieces.map((part) => part[0]).join(''))].filter(Boolean)
}

function searchableForms(values) {
  const text = []
  const pinyin = []
  for (const value of values.filter(Boolean)) {
    const normalized = normalizeSearchText(value)
    if (normalized) text.push(normalized)
    pinyin.push(...pinyinForms(value))
  }
  return { text: [...new Set(text)], pinyin: [...new Set(pinyin)] }
}

async function sha256(file) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(file), hash)
  return hash.digest('hex')
}

async function downloadArchive(destination) {
  await mkdir(dirname(destination), { recursive: true })
  const temporary = `${destination}.download`
  await rm(temporary, { force: true })
  const response = await fetch(ARCHIVE_SNAPSHOT.url, { headers: { 'user-agent': '30-anime-recommendations-archive-builder/1.0' } })
  if (!response.ok || !response.body) throw new Error(`Archive download failed with HTTP ${response.status}.`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary))
  await rename(temporary, destination)
}

async function ensureArchive() {
  try { await access(archivePath) } catch { await downloadArchive(archivePath) }
  const [file, digest] = await Promise.all([stat(archivePath), sha256(archivePath)])
  if (file.size !== ARCHIVE_SNAPSHOT.size) throw new Error(`Archive size mismatch: expected ${ARCHIVE_SNAPSHOT.size}, received ${file.size}.`)
  if (digest !== ARCHIVE_SNAPSHOT.sha256) throw new Error(`Archive SHA-256 mismatch: expected ${ARCHIVE_SNAPSHOT.sha256}, received ${digest}.`)
}

async function* archiveLines(entry) {
  const archive = await unzipper.Open.file(archivePath)
  const target = archive.files.find((file) => file.path === entry)
  if (!target) throw new Error(`Unable to read ${entry} from Archive ZIP.`)
  const lines = createInterface({ input: target.stream(), crlfDelay: Infinity })
  for await (const line of lines) {
    if (line.trim()) yield JSON.parse(line)
  }
}

function recordFromSubject(subject) {
  const subjectType = subjectTypeFromBangumi(subject.type)
  if (!subjectType) return undefined
  const aliases = extractWhitelistedAliases(subject.infobox)
  const name = subject.name_cn?.trim() || subject.name?.trim()
  if (!name) return undefined
  const originalName = subject.name_cn?.trim() ? subject.name?.trim() : undefined
  return {
    id: subject.id,
    kind: 'subject',
    subjectType,
    name,
    originalName,
    aliases,
    nsfw: Boolean(subject.nsfw),
    popularity: popularityOf(subject.favorite),
    forms: searchableForms([name, originalName, ...aliases]),
    detail: { id: subject.id, kind: 'subject', summary: subject.summary?.trim() || '', relatedCharacterIds: [] },
  }
}

function recordFromCharacter(character) {
  const aliases = extractWhitelistedAliases(character.infobox)
  const name = character.name?.trim()
  if (!name) return undefined
  return {
    id: character.id,
    kind: 'character',
    name,
    originalName: aliases.find((alias) => /\p{Script=Han}/u.test(alias) && alias !== name),
    aliases,
    nsfw: false,
    popularity: Number(character.collects) || 0,
    forms: searchableForms([name, ...aliases]),
    detail: { id: character.id, kind: 'character', summary: character.summary?.trim() || '', relatedSubjectIds: [] },
  }
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value)}\n`, 'utf8')
}

async function main() {
  await ensureArchive()
  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(join(outputDirectory, 'search'), { recursive: true })
  await mkdir(join(outputDirectory, 'details'), { recursive: true })

  const subjects = []
  const subjectDetails = new Map()
  for await (const subject of archiveLines('subject.jsonlines')) {
    const record = recordFromSubject(subject)
    if (!record) continue
    subjects.push(record)
    subjectDetails.set(record.id, record.detail)
  }

  const characters = []
  const characterDetails = new Map()
  for await (const character of archiveLines('character.jsonlines')) {
    const record = recordFromCharacter(character)
    if (!record) continue
    characters.push(record)
    characterDetails.set(record.id, record.detail)
  }

  for await (const relation of archiveLines('subject-characters.jsonlines')) {
    if (!subjectDetails.has(relation.subject_id) || !characterDetails.has(relation.character_id)) continue
    subjectDetails.get(relation.subject_id).relatedCharacterIds.push(relation.character_id)
    characterDetails.get(relation.character_id).relatedSubjectIds.push(relation.subject_id)
  }

  const searchShards = Array.from({ length: SEARCH_SHARD_COUNT }, () => [])
  for (const { detail, ...record } of [...subjects, ...characters]) {
    searchShards[detailShardFor(record.id, SEARCH_SHARD_COUNT)].push(record)
  }
  const details = Array.from({ length: DETAIL_SHARD_COUNT }, () => ({ subjects: {}, characters: {} }))
  for (const detail of subjectDetails.values()) details[detailShardFor(detail.id, DETAIL_SHARD_COUNT)].subjects[detail.id] = detail
  for (const detail of characterDetails.values()) details[detailShardFor(detail.id, DETAIL_SHARD_COUNT)].characters[detail.id] = detail

  await Promise.all(searchShards.map((shard, indexNumber) => writeJson(join(outputDirectory, 'search', `${indexNumber}.json`), {
    schemaVersion: 1,
    snapshot: ARCHIVE_SNAPSHOT.name,
    entries: shard,
  })))
  await Promise.all(details.map((shard, indexNumber) => writeJson(join(outputDirectory, 'details', `${indexNumber}.json`), shard)))
  await writeJson(join(outputDirectory, 'manifest.json'), {
    schemaVersion: 1,
    snapshot: ARCHIVE_SNAPSHOT,
    generatedAt: new Date().toISOString(),
    recordCounts: { subjects: subjects.length, characters: characters.length },
    files: {
      searchDirectory: 'search',
      searchShardCount: SEARCH_SHARD_COUNT,
      detailsDirectory: 'details',
      detailShardCount: DETAIL_SHARD_COUNT,
    },
    indexedAliasFields: [...ALIAS_FIELDS],
  })
  process.stdout.write(`Built Archive index: ${subjects.length} subjects and ${characters.length} characters into ${basename(outputDirectory)}.\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
