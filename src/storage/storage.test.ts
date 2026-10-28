import { describe, expect, it } from 'vitest'
import { LEGACY_STORAGE_KEY, STORAGE_KEY, createDefaultData } from '../config'
import { createStorage, type KeyValueStore } from './storage'

const memoryStore = (initial: Record<string, string> = {}): KeyValueStore & { map: Map<string, string> } => {
  const map = new Map(Object.entries(initial))
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) }
}

const sampleTx = {
  id: 'a', kind: 'expense' as const, amountKHR: 4000, entered: { amount: 4000, currency: 'KHR' as const },
  categoryId: 'food', note: 'lunch', date: '2026-10-03', createdAt: '2026-10-03T05:00:00Z',
}

describe('storage', () => {
  it('returns defaults ($110, 50/30/20, ៛3,000) when nothing is saved', () => {
    const data = createStorage(memoryStore()).load()
    expect(data.settings.monthlyIncomeUSD).toBe(110)
    expect(data.settings.split).toEqual({ needs: 50, wants: 30, savings: 20 })
    expect(data.settings.defaultDailyPlanKHR).toBe(3000)
  })

  it('saves and loads the same data', () => {
    const store = memoryStore()
    const storage = createStorage(store)
    const data = { ...createDefaultData(), transactions: [sampleTx], dailyPlans: { '2026-10-04': 0 } }
    storage.save(data)
    expect(storage.load()).toEqual(data)
  })

  it('survives corrupted storage', () => {
    const storage = createStorage(memoryStore({ [STORAGE_KEY]: '{not json' }))
    expect(storage.load().transactions).toEqual([])
  })

  it('exports then imports a backup', () => {
    const storage = createStorage(memoryStore())
    const data = { ...createDefaultData(), transactions: [sampleTx] }
    expect(storage.importJson(storage.exportJson(data))).toEqual(data)
  })

  it('rejects invalid backups and drops broken transactions', () => {
    const storage = createStorage(memoryStore())
    expect(storage.importJson('hello')).toBeNull()
    expect(storage.importJson('{"foo":1}')).toBeNull()
    const partial = storage.exportJson({ ...createDefaultData(), transactions: [sampleTx, { ...sampleTx, id: 'bad', amountKHR: -5 }] })
    expect(storage.importJson(partial)?.transactions).toHaveLength(1)
  })

  it('falls back to default split when an imported split does not total 100', () => {
    const storage = createStorage(memoryStore())
    const data = createDefaultData()
    data.settings.split = { needs: 70, wants: 30, savings: 20 }
    expect(storage.importJson(storage.exportJson(data))?.settings.split).toEqual({ needs: 50, wants: 30, savings: 20 })
  })

  it('migrates the old v1 format', () => {
    const legacy = {
      transactions: [
        { id: 'x1', type: 'expense', amount: 3000, currency: 'KHR', category: 'Food', note: '', date: '2026-10-01', createdAt: '2026-10-01T01:00:00Z' },
        { id: 'x2', type: 'saving', amount: 5, currency: 'USD', category: 'Other', note: '', date: '2026-10-02', createdAt: '2026-10-02T01:00:00Z' },
      ],
      budget: { exchangeRate: 4000, dailyLimitKHR: 3500 },
    }
    const data = createStorage(memoryStore({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) })).load()
    expect(data.settings.exchangeRate).toBe(4000)
    expect(data.settings.defaultDailyPlanKHR).toBe(3500)
    expect(data.transactions.map((t) => [t.kind, t.categoryId, t.amountKHR])).toEqual([
      ['expense', 'food', 3000],
      ['deposit', 'savings', 20000],
    ])
  })
})
