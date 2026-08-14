export type ProviderTier = 'baseline' | 'official' | 'community' | 'excluded'
export type Capability = 'supported' | 'partial' | 'unsupported'
export type MainlandStatus = '大陆可用' | '未验证'

export interface ProviderCapabilities {
  subjectSearch: Capability
  characterSearch: Capability
  subjectCharacterRelations: Capability
  artwork: Capability
  chineseMetadata: Capability
}

export interface ProviderProfile {
  id: string
  name: string
  tier: ProviderTier
  homepage: string
  requiresToken: boolean
  capabilities: ProviderCapabilities
  licenseNote: string
}

export interface ProviderSearchResult {
  id: string
  name: string
  originalName?: string
  aliases: string[]
  artworkUrl?: string
  sourceUrl?: string
}

export interface ProviderArtwork {
  url?: string
  corsSafeForCanvas: 'unknown' | 'yes' | 'no'
}

/**
 * 所有候选来源在研究期遵循的最小接口。能力不支持时实现应抛出
 * `ProviderOperationUnsupported`，而不是悄悄改用未经评估的第三方接口。
 */
export interface AnimeDataProvider {
  readonly profile: ProviderProfile
  searchSubjects(query: string): Promise<ProviderSearchResult[]>
  searchCharacters(query: string): Promise<ProviderSearchResult[]>
  getArtwork(kind: 'subject' | 'character', id: string): Promise<ProviderArtwork>
  getById(kind: 'subject' | 'character', id: string): Promise<ProviderSearchResult | undefined>
}

export class ProviderOperationUnsupported extends Error {
  constructor(public readonly providerId: string, public readonly operation: string) {
    super(`${providerId} does not support ${operation}.`)
  }
}

export interface MainlandValidation {
  carrier: '中国电信' | '中国联通' | '中国移动' | '其他'
  province: string
  testedAt: string
  status: 'passed' | 'failed'
  evidenceUrl?: string
}

export function mainlandStatus(validations: readonly MainlandValidation[]): MainlandStatus {
  const independentCarriers = new Set(validations.filter((item) => item.status === 'passed' && item.carrier !== '其他').map((item) => item.carrier))
  return independentCarriers.size >= 2 ? '大陆可用' : '未验证'
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s\p{P}\p{S}_]+/gu, '')
}

export function resultMatchesExpected(result: ProviderSearchResult, expectedNames: readonly string[]): boolean {
  const candidates = [result.name, result.originalName, ...result.aliases].filter((value): value is string => Boolean(value)).map(normalizeSearchText)
  return expectedNames.map(normalizeSearchText).some((expected) => candidates.some((candidate) => candidate.includes(expected) || expected.includes(candidate)))
}

export const PROVIDER_PROFILES: readonly ProviderProfile[] = [
  {
    id: 'bangumi-archive', name: 'Bangumi Archive / API', tier: 'baseline', homepage: 'https://github.com/bangumi/Archive', requiresToken: false,
    capabilities: { subjectSearch: 'supported', characterSearch: 'supported', subjectCharacterRelations: 'supported', artwork: 'supported', chineseMetadata: 'supported' },
    licenseNote: '官方归档与 API 基准；用户浏览器直连稳定性尚未满足。',
  },
  {
    id: 'anilist', name: 'AniList GraphQL', tier: 'official', homepage: 'https://docs.anilist.co/', requiresToken: false,
    capabilities: { subjectSearch: 'supported', characterSearch: 'supported', subjectCharacterRelations: 'supported', artwork: 'supported', chineseMetadata: 'partial' },
    licenseNote: '官方 GraphQL；中文标题和大陆可达性须实测。',
  },
  {
    id: 'tmdb', name: 'TMDB API', tier: 'official', homepage: 'https://developer.themoviedb.org/', requiresToken: true,
    capabilities: { subjectSearch: 'partial', characterSearch: 'unsupported', subjectCharacterRelations: 'partial', artwork: 'supported', chineseMetadata: 'supported' },
    licenseNote: '非商业用途须遵守 TMDB 署名要求；不是动漫角色专用数据库。',
  },
  {
    id: 'jikan', name: 'Jikan', tier: 'community', homepage: 'https://jikan.moe/', requiresToken: false,
    capabilities: { subjectSearch: 'supported', characterSearch: 'supported', subjectCharacterRelations: 'supported', artwork: 'supported', chineseMetadata: 'partial' },
    licenseNote: '非官方 MyAnimeList 抓取 API，不作为默认生产来源。',
  },
  {
    id: 'moegirl', name: '萌娘百科 MediaWiki API', tier: 'community', homepage: 'https://zh.moegirl.org.cn/api.php', requiresToken: false,
    capabilities: { subjectSearch: 'partial', characterSearch: 'partial', subjectCharacterRelations: 'partial', artwork: 'partial', chineseMetadata: 'supported' },
    licenseNote: '中文内容强但目录不标准；仅非商业补充并单独核对 CC BY-NC-SA。',
  },
  {
    id: 'bangumi-data', name: 'bangumi-data', tier: 'community', homepage: 'https://github.com/bangumi-data/bangumi-data', requiresToken: false,
    capabilities: { subjectSearch: 'partial', characterSearch: 'unsupported', subjectCharacterRelations: 'unsupported', artwork: 'partial', chineseMetadata: 'partial' },
    licenseNote: '静态日本动画数据与映射，不足以单独覆盖角色题目。',
  },
  {
    id: 'anime-offline-database', name: 'Anime Offline Database', tier: 'community', homepage: 'https://github.com/ipkpjersi/anime-offline-database', requiresToken: false,
    capabilities: { subjectSearch: 'supported', characterSearch: 'unsupported', subjectCharacterRelations: 'unsupported', artwork: 'partial', chineseMetadata: 'partial' },
    licenseNote: '适合离线作品与别名映射，不提供可替代的角色库。',
  },
  {
    id: 'bilibili-web', name: 'Bilibili 非公开 Web 搜索', tier: 'excluded', homepage: 'https://www.bilibili.com/', requiresToken: false,
    capabilities: { subjectSearch: 'partial', characterSearch: 'unsupported', subjectCharacterRelations: 'unsupported', artwork: 'partial', chineseMetadata: 'supported' },
    licenseNote: '探测返回 412，且没有公开第三方元数据接口，不接入生产。',
  },
]
