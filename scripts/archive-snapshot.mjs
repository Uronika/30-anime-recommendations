export const ARCHIVE_SNAPSHOT = Object.freeze({
  name: 'dump-2026-08-11.210343Z.zip',
  url: 'https://github.com/bangumi/Archive/releases/download/archive/dump-2026-08-11.210343Z.zip',
  sha256: 'd1f6865e64c7b9a848621bb7d4bd55e31cbef3395935df37e49bdc597ce609c8',
  size: 432714422,
})

export const SUBJECT_TYPES = Object.freeze({
  1: { id: 'book', label: '书籍 / 漫画' },
  2: { id: 'anime', label: '动画' },
  3: { id: 'music', label: '音乐' },
  4: { id: 'game', label: '游戏' },
})

export const ALIAS_FIELDS = new Set([
  '中文名', '简体中文名', '别名', '英文名', '英文名二', '日文名', '罗马字', '纯假名', '昵称', '第二中文名',
])

export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s\p{P}\p{S}_]+/gu, '')
}

function cleanAlias(value) {
  const withoutMarkup = value
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2')
    .replace(/[\[\]{}]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp|lt|gt);/g, ' ')
    .trim()
  if (!withoutMarkup || withoutMarkup.length > 120 || /^https?:\/\//i.test(withoutMarkup)) return undefined
  return withoutMarkup
}

/** Extracts only known, named infobox fields; it never indexes arbitrary raw wiki text. */
export function extractWhitelistedAliases(infobox) {
  const aliases = []
  const lines = String(infobox ?? '').replace(/\r/g, '').split('\n')
  let active = false
  let collectingList = false

  const add = (value) => {
    const cleaned = cleanAlias(value)
    if (cleaned) aliases.push(cleaned)
  }

  for (const line of lines) {
    const field = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/)
    if (field) {
      active = ALIAS_FIELDS.has(field[1].trim())
      collectingList = active && field[2].trim().startsWith('{')
      if (active && !collectingList) add(field[2])
      continue
    }
    if (!active) continue
    if (collectingList) {
      if (line.trim() === '}') {
        active = false
        collectingList = false
      } else if (line.trim()) {
        add(line.trim())
      }
    }
  }

  return [...new Set(aliases)]
}

export function subjectTypeFromBangumi(type) {
  return SUBJECT_TYPES[type]?.id
}

export function popularityOf(favorite) {
  if (!favorite || typeof favorite !== 'object') return 0
  return ['wish', 'done', 'doing', 'on_hold', 'dropped'].reduce((sum, key) => sum + (Number(favorite[key]) || 0), 0)
}

export function detailShardFor(id, shardCount) {
  return Math.abs(Number(id)) % shardCount
}
