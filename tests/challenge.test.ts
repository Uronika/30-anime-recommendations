import { describe, expect, it } from 'vitest'
import { CHALLENGE_DAYS, MAX_COMMENT_LENGTH } from '../src/domain/challenge'
import { createEmptyProfile, selectionArtwork, selectionName } from '../src/domain/types'

describe('challenge template', () => {
  it('contains 30 ordered entries with character and music specializations', () => {
    expect(CHALLENGE_DAYS).toHaveLength(30)
    expect(CHALLENGE_DAYS.filter((day) => day.kind === 'character').map((day) => day.day)).toEqual([6, 7, 8, 9])
    expect(CHALLENGE_DAYS[27].kind).toBe('music')
  })
  it('creates a complete empty profile and keeps music display data coherent', () => {
    const profile = createEmptyProfile(); expect(profile.entries).toHaveLength(30); expect(MAX_COMMENT_LENGTH).toBe(100)
    const subject = { source: 'bangumi-subject' as const, id: 1, name: '中文名', originalName: 'Original', artwork: { imageUrl: 'https://example.test/a.jpg', alt: '中文名' } }
    const music = { source: 'music' as const, title: 'Song', relatedSubject: subject }
    expect(selectionName(music)).toBe('Song'); expect(selectionArtwork(music)).toEqual(subject.artwork)
  })
})
