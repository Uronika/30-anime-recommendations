import { describe, expect, it } from 'vitest'
import cases from '../research/provider-test-cases.json'
import { PROVIDER_PROFILES, mainlandStatus, normalizeSearchText, resultMatchesExpected } from '../src/research/dataSourceContract'

describe('domestic data-source research contract', () => {
  it('keeps a fixed and representative 100-case benchmark', () => {
    expect(cases).toHaveLength(100)
    expect(new Set(cases.map((item) => item.id)).size).toBe(100)
    expect(cases.filter((item) => item.kind === 'subject')).toHaveLength(65)
    expect(cases.filter((item) => item.kind === 'character')).toHaveLength(35)
    for (const category of ['中文名', '日文原名', '别名', '长尾', '同名', 'NSFW', '热门角色']) expect(cases.some((item) => item.category === category)).toBe(true)
  })

  it('normalizes full-width text and compares aliases without punctuation noise', () => {
    expect(normalizeSearchText(' ＳＰＹ×ＦＡＭＩＬＹ ')).toBe('spyfamily')
    expect(resultMatchesExpected({ id: '1', name: 'SPY×FAMILY', aliases: ['间谍过家家'] }, ['间谍过家家'])).toBe(true)
  })

  it('requires two independent mainland carriers before claiming mainland availability', () => {
    expect(mainlandStatus([{ carrier: '中国电信', province: '广东', testedAt: '2026-08-14', status: 'passed' }])).toBe('未验证')
    expect(mainlandStatus([
      { carrier: '中国电信', province: '广东', testedAt: '2026-08-14', status: 'passed' },
      { carrier: '中国移动', province: '浙江', testedAt: '2026-08-14', status: 'passed' },
    ])).toBe('大陆可用')
  })

  it('records official, community and excluded sources separately', () => {
    expect(PROVIDER_PROFILES.find((item) => item.id === 'anilist')?.tier).toBe('official')
    expect(PROVIDER_PROFILES.find((item) => item.id === 'jikan')?.tier).toBe('community')
    expect(PROVIDER_PROFILES.find((item) => item.id === 'bilibili-web')?.tier).toBe('excluded')
  })
})
