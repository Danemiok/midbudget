/** Date helpers. All dates are local-time strings, so there are no UTC off-by-one-day bugs. */

const pad = (n: number) => String(n).padStart(2, '0')

/** Date -> "YYYY-MM-DD" */
export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = (): string => toISODate(new Date())

/** "2026-10-27" -> "2026-10" */
export const monthOf = (isoDate: string): string => isoDate.slice(0, 7)

const parseMonth = (month: string): { year: number; monthIndex: number } => {
  const [year, m] = month.split('-').map(Number)
  return { year, monthIndex: m - 1 }
}

export const daysInMonth = (month: string): number => {
  const { year, monthIndex } = parseMonth(month)
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Every date in the month, in order. Handles leap years. */
export const datesOfMonth = (month: string): string[] =>
  Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${pad(i + 1)}`)

export const shiftMonth = (month: string, delta: number): string => {
  const { year, monthIndex } = parseMonth(month)
  return monthOf(toISODate(new Date(year, monthIndex + delta, 1)))
}

export const monthLabel = (month: string): string => {
  const { year, monthIndex } = parseMonth(month)
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export const dayLabel = (isoDate: string): { weekday: string; day: string } => {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { weekday: date.toLocaleDateString('en-US', { weekday: 'short' }), day: String(d) }
}

/** How many days are left in `month`, counting today. Past months = 0, future months = all days. */
export const remainingDays = (month: string, today: string): number => {
  const currentMonth = monthOf(today)
  if (month < currentMonth) return 0
  if (month > currentMonth) return daysInMonth(month)
  return daysInMonth(month) - Number(today.slice(8, 10)) + 1
}
