import { BUCKET_IDS, DATA_VERSION, SAVINGS_CATEGORY_ID, createDefaultData } from '../config'
import { isSplitValid } from '../domain/budget'
import { toKHR } from '../domain/money'
import type { AppData, Currency, Transaction, TransactionKind } from '../domain/types'

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const KINDS: readonly TransactionKind[] = ['expense', 'income', 'deposit', 'withdrawal']
const CURRENCIES: readonly Currency[] = ['USD', 'KHR']

const parseTransaction = (raw: unknown): Transaction | null => {
  if (!isObject(raw)) return null
  const { id, kind, amountKHR, entered, categoryId, note, date, createdAt } = raw
  if (typeof id !== 'string' || !KINDS.includes(kind as TransactionKind)) return null
  if (!isNumber(amountKHR) || amountKHR <= 0 || !isDate(date)) return null
  if (!isObject(entered) || !isNumber(entered.amount) || !CURRENCIES.includes(entered.currency as Currency)) return null
  return {
    id,
    kind: kind as TransactionKind,
    amountKHR: Math.round(amountKHR),
    entered: { amount: entered.amount, currency: entered.currency as Currency },
    categoryId: typeof categoryId === 'string' ? categoryId : 'other',
    note: typeof note === 'string' ? note : '',
    date,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  }
}

/**
 * Validate data in the current format. Bad fields fall back to defaults and
 * broken transactions are dropped, so a damaged backup never crashes the app.
 */
export const parseAppData = (raw: unknown): AppData | null => {
  if (!isObject(raw) || !isObject(raw.settings) || !Array.isArray(raw.transactions)) return null
  const defaults = createDefaultData()
  const s = raw.settings

  const split = { ...defaults.settings.split }
  if (isObject(s.split)) {
    for (const id of BUCKET_IDS) if (isNumber(s.split[id])) split[id] = s.split[id]
  }

  const dailyPlans: Record<string, number> = {}
  if (isObject(raw.dailyPlans)) {
    for (const [date, value] of Object.entries(raw.dailyPlans)) {
      if (isDate(date) && isNumber(value) && value >= 0) dailyPlans[date] = Math.round(value)
    }
  }

  return {
    settings: {
      monthlyIncomeUSD: isNumber(s.monthlyIncomeUSD) && s.monthlyIncomeUSD >= 0 ? s.monthlyIncomeUSD : defaults.settings.monthlyIncomeUSD,
      exchangeRate: isNumber(s.exchangeRate) && s.exchangeRate > 0 ? s.exchangeRate : defaults.settings.exchangeRate,
      defaultDailyPlanKHR: isNumber(s.defaultDailyPlanKHR) && s.defaultDailyPlanKHR >= 0 ? Math.round(s.defaultDailyPlanKHR) : defaults.settings.defaultDailyPlanKHR,
      split: isSplitValid(split) ? split : defaults.settings.split,
    },
    transactions: raw.transactions.map(parseTransaction).filter((t): t is Transaction => t !== null),
    dailyPlans,
  }
}

/** Read a backup file: accepts the versioned envelope or bare data. */
export const parseBackup = (raw: unknown): AppData | null => {
  if (isObject(raw) && 'data' in raw && 'version' in raw) return parseAppData(raw.data)
  return parseAppData(raw)
}

export const wrap = (data: AppData) => ({ version: DATA_VERSION, data })

/** Convert data saved by version 1 of the app (single `AppData` with `type`/`amount`/`currency`). */
export const migrateLegacy = (raw: unknown): AppData | null => {
  if (!isObject(raw) || !Array.isArray(raw.transactions)) return null
  const data = createDefaultData()
  const budget = isObject(raw.budget) ? raw.budget : {}
  if (isNumber(budget.exchangeRate) && budget.exchangeRate > 0) data.settings.exchangeRate = budget.exchangeRate
  if (isNumber(budget.dailyLimitKHR) && budget.dailyLimitKHR >= 0) data.settings.defaultDailyPlanKHR = budget.dailyLimitKHR
  const rate = data.settings.exchangeRate

  const legacyKind: Record<string, TransactionKind> = { expense: 'expense', income: 'income', saving: 'deposit' }
  const legacyCategory: Record<string, string> = { Food: 'food', Transport: 'transport', Shopping: 'shopping', Bills: 'bills', Health: 'health', Education: 'education', Entertainment: 'entertainment', Family: 'family', Salary: 'salary', Allowance: 'allowance' }

  for (const item of raw.transactions) {
    if (!isObject(item) || typeof item.type !== 'string' || !(item.type in legacyKind)) continue
    if (!isNumber(item.amount) || !isDate(item.date) || !CURRENCIES.includes(item.currency as Currency)) continue
    const kind = legacyKind[item.type]
    const currency = item.currency as Currency
    const tx = parseTransaction({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      kind,
      amountKHR: toKHR(item.amount, currency, rate),
      entered: { amount: item.amount, currency },
      categoryId: kind === 'deposit' ? SAVINGS_CATEGORY_ID : (legacyCategory[String(item.category)] ?? (kind === 'income' ? 'other-income' : 'other')),
      note: item.note,
      date: item.date,
      createdAt: item.createdAt,
    })
    if (tx) data.transactions.push(tx)
  }
  return data
}
