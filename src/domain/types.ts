/** Core data types. Everything the app stores is described here. */

export type Currency = 'USD' | 'KHR'

/** The three buckets of the 50/30/20 rule. */
export type BucketId = 'needs' | 'wants' | 'savings'

export type TransactionKind = 'expense' | 'income' | 'deposit' | 'withdrawal'

export interface Transaction {
  id: string
  kind: TransactionKind
  /** Value in riel. Always stored in KHR so past entries never change when the rate changes. */
  amountKHR: number
  /** What the user actually typed, kept for display ("$25" vs "៛4,000"). */
  entered: { amount: number; currency: Currency }
  categoryId: string
  note: string
  /** YYYY-MM-DD (local date). */
  date: string
  createdAt: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

export interface Settings {
  /** Money you receive each month, in USD. */
  monthlyIncomeUSD: number
  /** Riel per 1 USD. */
  exchangeRate: number
  /** Planned spending per day, in KHR. Individual days can override it. */
  defaultDailyPlanKHR: number
  /** Percent per bucket. Must total 100. */
  split: Record<BucketId, number>
}

export interface AppData {
  settings: Settings
  transactions: Transaction[]
  /** Per-day plan overrides: YYYY-MM-DD -> planned KHR (0 = rest day). */
  dailyPlans: Record<string, number>
}
