import { datesOfMonth } from './dates'
import type { AppData } from './types'

export type DayStatus = 'upcoming' | 'ok' | 'over'

export interface DayRow {
  date: string
  plannedKHR: number
  spentKHR: number
  /** planned - spent. Negative = overspent that day. */
  differenceKHR: number
  /** Running total of (planned - spent) from day 1 to this day. */
  runningKHR: number
  status: DayStatus
}

export interface DailySummary {
  plannedKHR: number
  spentKHR: number
  differenceKHR: number
  daysOver: number
  /** Largest single-day overspend, 0 if none. */
  worstOverKHR: number
}

export const plannedFor = (data: AppData, date: string): number =>
  data.dailyPlans[date] ?? data.settings.defaultDailyPlanKHR

/** One row per day of the month. Spent comes from expense transactions only. */
export const buildDailyRows = (data: AppData, month: string, today: string): DayRow[] => {
  const spentByDate = new Map<string, number>()
  for (const t of data.transactions) {
    if (t.kind === 'expense' && t.date.startsWith(month)) {
      spentByDate.set(t.date, (spentByDate.get(t.date) ?? 0) + t.amountKHR)
    }
  }

  let running = 0
  return datesOfMonth(month).map((date) => {
    const plannedKHR = plannedFor(data, date)
    const spentKHR = spentByDate.get(date) ?? 0
    const differenceKHR = plannedKHR - spentKHR
    running += differenceKHR
    const status: DayStatus = spentKHR > plannedKHR ? 'over' : date > today && spentKHR === 0 ? 'upcoming' : 'ok'
    return { date, plannedKHR, spentKHR, differenceKHR, runningKHR: running, status }
  })
}

export const summarizeDaily = (rows: DayRow[]): DailySummary => {
  const plannedKHR = rows.reduce((total, r) => total + r.plannedKHR, 0)
  const spentKHR = rows.reduce((total, r) => total + r.spentKHR, 0)
  const overRows = rows.filter((r) => r.status === 'over')
  return {
    plannedKHR,
    spentKHR,
    differenceKHR: plannedKHR - spentKHR,
    daysOver: overRows.length,
    worstOverKHR: overRows.reduce((worst, r) => Math.max(worst, -r.differenceKHR), 0),
  }
}
