import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../config'
import { allocate, isSplitValid, summarizeMonth } from './budget'
import { buildDailyRows, summarizeDaily } from './daily'
import { datesOfMonth, remainingDays, shiftMonth } from './dates'
import { formatKHR, formatUSD, toKHR } from './money'
import type { AppData, NewTransaction } from './types'

const RATE = 4100
const month = '2026-10'

const withTransactions = (...inputs: NewTransaction[]): AppData => {
  const data = createDefaultData()
  data.transactions = inputs.map((input, i) => ({ ...input, id: `t${i}`, createdAt: '2026-10-01T00:00:00Z' }))
  return data
}

const expense = (date: string, amount: number, currency: 'USD' | 'KHR', categoryId = 'food'): NewTransaction => ({
  kind: 'expense',
  amountKHR: toKHR(amount, currency, RATE),
  entered: { amount, currency },
  categoryId,
  note: '',
  date,
})

describe('money', () => {
  it('converts USD and KHR into whole riel', () => {
    expect(toKHR(25, 'USD', RATE)).toBe(102500)
    expect(toKHR(3000.4, 'KHR', RATE)).toBe(3000)
  })
  it('formats both currencies, including negatives', () => {
    expect(formatKHR(4000)).toBe('៛4,000')
    expect(formatKHR(-1000)).toBe('-៛1,000')
    expect(formatUSD(451000, RATE)).toBe('$110.00')
  })
})

describe('50/30/20 allocation', () => {
  it('splits $110 into $55 / $33 / $22', () => {
    const total = toKHR(110, 'USD', RATE)
    expect(allocate(total, { needs: 50, wants: 30, savings: 20 })).toEqual({ needs: 225500, wants: 135300, savings: 90200 })
  })
  it('never loses a riel to rounding', () => {
    const a = allocate(100001, { needs: 50, wants: 30, savings: 20 })
    expect(a.needs + a.wants + a.savings).toBe(100001)
  })
  it('requires percentages to total exactly 100', () => {
    expect(isSplitValid({ needs: 50, wants: 30, savings: 20 })).toBe(true)
    expect(isSplitValid({ needs: 50, wants: 30, savings: 25 })).toBe(false)
    expect(isSplitValid({ needs: 120, wants: -10, savings: -10 })).toBe(false)
  })
})

describe('monthly summary', () => {
  it('starts with the full $110 and nothing used', () => {
    const s = summarizeMonth(createDefaultData(), month, '2026-10-01')
    expect(s.incomeKHR).toBe(451000)
    expect(s.buckets.needs.remainingKHR).toBe(225500)
    expect(s.cashLeftKHR).toBe(451000)
  })

  it('charges each expense to the bucket of its category', () => {
    const data = withTransactions(expense('2026-10-02', 3000, 'KHR', 'food'), expense('2026-10-02', 2000, 'KHR', 'shopping'))
    const s = summarizeMonth(data, month, '2026-10-03')
    expect(s.buckets.needs.usedKHR).toBe(3000)
    expect(s.buckets.wants.usedKHR).toBe(2000)
    expect(s.expensesKHR).toBe(5000)
  })

  it('handles a one-day $25 spend: bucket shrinks and the daily allowance drops', () => {
    const before = summarizeMonth(createDefaultData(), month, '2026-10-10')
    const after = summarizeMonth(withTransactions(expense('2026-10-10', 25, 'USD', 'shopping')), month, '2026-10-10')
    expect(after.buckets.wants.usedKHR).toBe(102500)
    expect(after.suggestedDailyKHR).toBeLessThan(before.suggestedDailyKHR)
  })

  it('counts deposits as saved and withdrawals as taken back', () => {
    const save = (kind: 'deposit' | 'withdrawal', khr: number): NewTransaction => ({
      kind, amountKHR: khr, entered: { amount: khr, currency: 'KHR' }, categoryId: 'savings', note: '', date: '2026-10-05',
    })
    const s = summarizeMonth(withTransactions(save('deposit', 50000), save('withdrawal', 10000)), month, '2026-10-06')
    expect(s.netSavedKHR).toBe(40000)
    expect(s.buckets.savings.remainingKHR).toBe(90200 - 40000)
    expect(s.cashLeftKHR).toBe(451000 - 40000)
  })

  it('adds extra income to the budget and splits it too', () => {
    const income: NewTransaction = { kind: 'income', amountKHR: 41000, entered: { amount: 10, currency: 'USD' }, categoryId: 'salary', note: '', date: '2026-10-05' }
    const s = summarizeMonth(withTransactions(income), month, '2026-10-06')
    expect(s.incomeKHR).toBe(492000)
    expect(s.buckets.needs.allocatedKHR).toBe(246000)
  })

  it('ignores other months', () => {
    const s = summarizeMonth(withTransactions(expense('2026-09-30', 9999, 'KHR')), month, '2026-10-05')
    expect(s.expensesKHR).toBe(0)
  })
})

describe('dates', () => {
  it('knows leap years', () => {
    expect(datesOfMonth('2028-02')).toHaveLength(29)
    expect(datesOfMonth('2026-02')).toHaveLength(28)
  })
  it('shifts months across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('counts remaining days, today included', () => {
    expect(remainingDays('2026-10', '2026-10-27')).toBe(5)
    expect(remainingDays('2026-09', '2026-10-27')).toBe(0)
    expect(remainingDays('2026-11', '2026-10-27')).toBe(30)
  })
})

describe('daily tracker', () => {
  const today = '2026-10-05'

  it('plans ៛3,000 per day by default for every day of the month', () => {
    const rows = buildDailyRows(createDefaultData(), month, today)
    expect(rows).toHaveLength(31)
    expect(summarizeDaily(rows).plannedKHR).toBe(31 * 3000)
  })

  it('flags a day spent at ៛4,000 against a ៛3,000 plan as over', () => {
    const rows = buildDailyRows(withTransactions(expense('2026-10-03', 4000, 'KHR')), month, today)
    const day = rows[2]
    expect(day.status).toBe('over')
    expect(day.differenceKHR).toBe(-1000)
  })

  it('keeps ៛3,000 on a ៛3,000 day as ok', () => {
    const rows = buildDailyRows(withTransactions(expense('2026-10-03', 3000, 'KHR')), month, today)
    expect(rows[2].status).toBe('ok')
  })

  it('sums several expenses on one day and respects per-day plan overrides', () => {
    const data = withTransactions(expense('2026-10-02', 1000, 'KHR'), expense('2026-10-02', 1500, 'KHR', 'shopping'))
    data.dailyPlans['2026-10-02'] = 0
    const row = buildDailyRows(data, month, today)[1]
    expect(row.spentKHR).toBe(2500)
    expect(row.plannedKHR).toBe(0)
    expect(row.status).toBe('over')
  })

  it('runs a balance: saved money on cheap days offsets later overspending', () => {
    const data = withTransactions(expense('2026-10-01', 1000, 'KHR'), expense('2026-10-02', 4000, 'KHR'))
    const rows = buildDailyRows(data, month, today)
    expect(rows[0].runningKHR).toBe(2000)
    expect(rows[1].runningKHR).toBe(1000)
  })

  it('summarises days over and the worst overspend (a $25 day)', () => {
    const data = withTransactions(expense('2026-10-03', 4000, 'KHR'), expense('2026-10-04', 25, 'USD'))
    const summary = summarizeDaily(buildDailyRows(data, month, today))
    expect(summary.daysOver).toBe(2)
    expect(summary.worstOverKHR).toBe(102500 - 3000)
  })

  it('marks future days with no spending as upcoming', () => {
    const rows = buildDailyRows(createDefaultData(), month, today)
    expect(rows[10].status).toBe('upcoming')
    expect(rows[0].status).toBe('ok')
  })
})
