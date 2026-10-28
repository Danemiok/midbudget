import { BUCKET_IDS, bucketOfCategory } from '../config'
import { remainingDays } from './dates'
import { toKHR } from './money'
import type { AppData, BucketId, Settings, Transaction } from './types'

export interface BucketSummary {
  id: BucketId
  percent: number
  /** Money set aside for this bucket this month. */
  allocatedKHR: number
  /** Needs/Wants: money spent. Savings: money saved (deposits - withdrawals). */
  usedKHR: number
  /** allocated - used. Negative means over budget (for Savings it means "saved extra"). */
  remainingKHR: number
  usedPercent: number
}

export interface MonthSummary {
  month: string
  incomeKHR: number
  buckets: Record<BucketId, BucketSummary>
  expensesKHR: number
  netSavedKHR: number
  /** Real cash left: income - expenses - saved. */
  cashLeftKHR: number
  /** Needs + Wants budget that is still unspent. */
  spendableLeftKHR: number
  remainingDays: number
  /** spendableLeft / remainingDays, never below zero. */
  suggestedDailyKHR: number
}

export const isSplitValid = (split: Record<BucketId, number>): boolean =>
  BUCKET_IDS.every((id) => Number.isFinite(split[id]) && split[id] >= 0) &&
  BUCKET_IDS.reduce((sum, id) => sum + split[id], 0) === 100

/** Divide `totalKHR` by the percentages. Savings takes the remainder so nothing is lost to rounding. */
export const allocate = (totalKHR: number, split: Record<BucketId, number>): Record<BucketId, number> => {
  const needs = Math.round((totalKHR * split.needs) / 100)
  const wants = Math.round((totalKHR * split.wants) / 100)
  return { needs, wants, savings: totalKHR - needs - wants }
}

export const transactionsInMonth = (transactions: Transaction[], month: string): Transaction[] =>
  transactions.filter((t) => t.date.startsWith(month))

const sum = (items: Transaction[], pick: (t: Transaction) => number): number =>
  items.reduce((total, t) => total + pick(t), 0)

export const monthlyIncomeKHR = (settings: Settings, monthTransactions: Transaction[]): number =>
  toKHR(settings.monthlyIncomeUSD, 'USD', settings.exchangeRate) +
  sum(monthTransactions, (t) => (t.kind === 'income' ? t.amountKHR : 0))

export const summarizeMonth = (data: AppData, month: string, today: string): MonthSummary => {
  const { settings } = data
  const txs = transactionsInMonth(data.transactions, month)

  const incomeKHR = monthlyIncomeKHR(settings, txs)
  const allocated = allocate(incomeKHR, settings.split)

  const expenses = txs.filter((t) => t.kind === 'expense')
  const used: Record<BucketId, number> = {
    needs: sum(expenses, (t) => (bucketOfCategory(t.categoryId) === 'needs' ? t.amountKHR : 0)),
    wants: sum(expenses, (t) => (bucketOfCategory(t.categoryId) === 'wants' ? t.amountKHR : 0)),
    savings: sum(txs, (t) => (t.kind === 'deposit' ? t.amountKHR : t.kind === 'withdrawal' ? -t.amountKHR : 0)),
  }

  const buckets = Object.fromEntries(
    BUCKET_IDS.map((id): [BucketId, BucketSummary] => [
      id,
      {
        id,
        percent: settings.split[id],
        allocatedKHR: allocated[id],
        usedKHR: used[id],
        remainingKHR: allocated[id] - used[id],
        usedPercent: allocated[id] > 0 ? (used[id] / allocated[id]) * 100 : 0,
      },
    ]),
  ) as Record<BucketId, BucketSummary>

  const expensesKHR = used.needs + used.wants
  const spendableLeftKHR = buckets.needs.remainingKHR + buckets.wants.remainingKHR
  const daysLeft = remainingDays(month, today)

  return {
    month,
    incomeKHR,
    buckets,
    expensesKHR,
    netSavedKHR: used.savings,
    cashLeftKHR: incomeKHR - expensesKHR - used.savings,
    spendableLeftKHR,
    remainingDays: daysLeft,
    suggestedDailyKHR: daysLeft > 0 ? Math.max(0, Math.floor(spendableLeftKHR / daysLeft)) : 0,
  }
}
