import { describe, expect, it } from 'vitest'
import { ARCHIVE_SNAPSHOT, extractWhitelistedAliases, normalizeSearchText, subjectTypeFromBangumi } from '../scripts/archive-snapshot.mjs'
import { migrateProfile, selectionArtwork } from '../src/domain/types'

describe('fixed Bangumi Archive snapshot', () => {
  it('pins the approved snapshot with its exact size and SHA-256', () => {
    expect(ARCHIVE_SNAPSHOT).toMatchObject({ name: 'dump-2026-08-11.210343Z.zip', size: 432714422, sha256: 'd1f6865e64c7b9a848621bb7d4bd55e31cbef3395935df37e49bdc597ce609c8' })
  })
  it('keeps only supported subject types and never imports three-dimensional subjects', () => {
    expect(subjectTypeFromBangumi(1)).toBe('book'); expect(subjectTypeFromBangumi(2)).toBe('anime')
    expect(subjectTypeFromBangumi(3)).toBe('music'); expect(subjectTypeFromBangumi(4)).toBe('game'); expect(subjectTypeFromBangumi(6)).toBeUndefined()
  })
  it('extracts aliases only from the agreed white-list fields', () => {
    const aliases = extractWhitelistedAliases('| 中文名 = 葬送的芙莉莲\n| 别名 = {\n[英文名|Frieren]\n}\n| 制作 = 不可索引\n| 未知字段 = 不可索引')
    expect(aliases).toEqual(['葬送的芙莉莲', 'Frieren'])
  })
  it('normalizes full-width punctuation for archive and pinyin forms', () => {
    expect(normalizeSearchText(' ＳＰＹ×ＦＡＭＩＬＹ ')).toBe('spyfamily')
  })
  it('keeps a chosen local image during v2 backup import', () => {
    const profile = migrateProfile({ version: 2, nickname: '', subtitle: '', showCovers: true, updatedAt: '2026-08-14', entries: [{ day: 1, comment: '', selection: { source: 'archive', id: 1, kind: 'subject', subjectType: 'anime', name: '作品', aliases: [], nsfw: false, popularity: 0, snapshot: ARCHIVE_SNAPSHOT.name, localArtwork: { imageUrl: 'data:image/jpeg;base64,test', alt: '作品' } } }] })
    expect(selectionArtwork(profile.entries[0].selection)).toEqual({ imageUrl: 'data:image/jpeg;base64,test', alt: '作品' })
  })
})
