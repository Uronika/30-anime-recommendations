import { openDB } from 'idb'
import { createEmptyProfile, migrateProfile, type ChallengeProfile } from '../domain/types'

const DB_NAME = 'anime-30-day-archive'
const STORE = 'profile'
const KEY = 'current'
const ARCHIVE_CACHE_STORE = 'archive-cache'

export class ChallengeRepository {
  async load(): Promise<ChallengeProfile> {
    const db = await this.db()
    const stored = await db.get(STORE, KEY)
    return stored ? migrateProfile(stored) : createEmptyProfile()
  }

  async save(profile: ChallengeProfile): Promise<void> {
    const db = await this.db()
    await db.put(STORE, { ...profile, updatedAt: new Date().toISOString() }, KEY)
  }

  async replace(profile: ChallengeProfile): Promise<void> {
    await this.save(migrateProfile(profile))
  }

  async clear(): Promise<void> {
    const db = await this.db()
    await Promise.all([db.clear(STORE), db.clear(ARCHIVE_CACHE_STORE)])
  }

  async getArchiveCache<T>(key: string): Promise<T | undefined> {
    return (await this.db()).get(ARCHIVE_CACHE_STORE, key)
  }

  async setArchiveCache<T>(key: string, value: T): Promise<void> {
    await (await this.db()).put(ARCHIVE_CACHE_STORE, value, key)
  }

  private db() {
    return openDB(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
        if (!db.objectStoreNames.contains(ARCHIVE_CACHE_STORE)) db.createObjectStore(ARCHIVE_CACHE_STORE)
      },
    })
  }
}

export const challengeRepository = new ChallengeRepository()
