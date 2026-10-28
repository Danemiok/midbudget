import { LEGACY_STORAGE_KEY, STORAGE_KEY, createDefaultData } from '../config'
import type { AppData } from '../domain/types'
import { migrateLegacy, parseAppData, parseBackup, wrap } from './validate'

/**
 * Minimal interface the app needs from a storage backend. `localStorage` fits it,
 * and so would IndexedDB or a server wrapper, so the backend can be swapped later.
 */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface FinanceStorage {
  load(): AppData
  save(data: AppData): void
  exportJson(data: AppData): string
  /** Returns null when the text is not a valid backup. */
  importJson(text: string): AppData | null
}

const readJson = (store: KeyValueStore, key: string): unknown => {
  try {
    const text = store.getItem(key)
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

export const createStorage = (store: KeyValueStore): FinanceStorage => ({
  load() {
    const current = parseAppData((readJson(store, STORAGE_KEY) as { data?: unknown } | null)?.data)
    if (current) return current
    return migrateLegacy(readJson(store, LEGACY_STORAGE_KEY)) ?? createDefaultData()
  },

  save(data) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(wrap(data)))
    } catch {
      // Storage can be full or blocked (private mode). The app keeps working in memory.
    }
  },

  exportJson: (data) => JSON.stringify(wrap(data), null, 2),

  importJson(text) {
    try {
      return parseBackup(JSON.parse(text))
    } catch {
      return null
    }
  },
})

/** The storage used by the running app. */
export const browserStorage = (): FinanceStorage => createStorage(window.localStorage)
