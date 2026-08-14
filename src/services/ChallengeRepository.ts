import { openDB } from 'idb'
import { createEmptyProfile, type ChallengeProfile } from '../domain/types'

const DB_NAME = 'anime-30-day-archive'
const STORE = 'profile'
const KEY = 'current'

export class ChallengeRepository {
  async load(): Promise<ChallengeProfile> {
    const db = await this.db()
    return (await db.get(STORE, KEY)) ?? createEmptyProfile()
  }

  async save(profile: ChallengeProfile): Promise<void> {
    const db = await this.db()
    await db.put(STORE, { ...profile, updatedAt: new Date().toISOString() }, KEY)
  }

  async replace(profile: ChallengeProfile): Promise<void> {
    if (profile.version !== 1 || !Array.isArray(profile.entries) || profile.entries.length !== 30) throw new Error('这不是兼容的 30 部动漫推荐备份文件。')
    await this.save(profile)
  }

  private db() {
    return openDB(DB_NAME, 1, { upgrade(db) { db.createObjectStore(STORE) } })
  }
}

export const challengeRepository = new ChallengeRepository()
