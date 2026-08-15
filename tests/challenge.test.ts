import { describe, expect, it } from 'vitest'
import { CHALLENGE_DAYS, MAX_COMMENT_LENGTH } from '../src/domain/challenge'
import { createEmptyProfile, migrateProfile, selectionArtwork, selectionName } from '../src/domain/types'

describe('challenge template', () => {
  it('contains 30 ordered entries with one mixed catalogue picker', () => {
    expect(CHALLENGE_DAYS).toHaveLength(30)
    expect(CHALLENGE_DAYS.every((day) => day.kind === 'catalog')).toBe(true)
  })
  it('creates a complete empty profile and keeps music display data coherent', () => {
    const profile = createEmptyProfile(); expect(profile.entries).toHaveLength(30); expect(MAX_COMMENT_LENGTH).toBe(100)
    const subject = { source: 'bangumi-subject' as const, id: 1, name: '中文名', originalName: 'Original', artwork: { imageUrl: 'https://example.test/a.jpg', alt: '中文名' } }
    const music = { source: 'music' as const, title: 'Song', relatedSubject: subject }
    expect(selectionName(music)).toBe('Song'); expect(selectionArtwork(music)).toEqual(subject.artwork)
  })
  it('prefers a personal image over an API-provided remote cover', () => {
    const apiSelection = { source: 'bangumi-api' as const, id: 1, kind: 'subject' as const, subjectType: 'anime' as const, name: '作品', aliases: [], nsfw: false, popularity: 0, remoteArtwork: { imageUrl: 'https://images.example.test/remote.jpg', alt: '作品' } }
    expect(selectionArtwork(apiSelection)).toEqual({ imageUrl: 'https://api.bgm.tv/v0/subjects/1/image?type=grid', alt: '作品' })
    expect(selectionArtwork({ ...apiSelection, localArtwork: { imageUrl: 'data:image/jpeg;base64,test', alt: '自定义' } })).toEqual({ imageUrl: 'data:image/jpeg;base64,test', alt: '自定义' })
  })
  it('migrates v1 backups to v2 while preserving legacy music records and defaulting covers off', () => {
    const migrated = migrateProfile({ version: 1, nickname: '旧用户', subtitle: '', updatedAt: '2026-01-01', entries: [{ day: 28, comment: '旧歌', selection: { source: 'music', title: 'Song', relatedSubject: { source: 'manual', name: 'Anime' } } }] })
    expect(migrated).toMatchObject({ version: 2, nickname: '旧用户', showCovers: false })
    expect(migrated.entries).toHaveLength(30)
    expect(migrated.entries[27].selection).toMatchObject({ source: 'music', title: 'Song' })
  })
})
