import type { AppData, BucketId, Settings } from '../domain/types'
import { BUCKETS } from './buckets'

/** Quick-pick amounts (riel) shown when adding a daily expense. */
export const QUICK_AMOUNTS_KHR: readonly number[] = [500, 1000, 1500, 2000, 3000, 4000]

export const STORAGE_KEY = 'my-money:v2'
/** Key used by the previous version of the app, read once for migration. */
export const LEGACY_STORAGE_KEY = 'my-money-finance-v1'
export const DATA_VERSION = 2

export const DEFAULT_SETTINGS: Settings = {
  monthlyIncomeUSD: 110,
  exchangeRate: 4100,
  defaultDailyPlanKHR: 3000,
  split: Object.fromEntries(BUCKETS.map((b) => [b.id, b.defaultPercent])) as Record<BucketId, number>,
}

export const createDefaultData = (): AppData => ({
  settings: { ...DEFAULT_SETTINGS, split: { ...DEFAULT_SETTINGS.split } },
  transactions: [],
  dailyPlans: {},
})
