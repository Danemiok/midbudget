import { useState } from 'react'
import type { DailySummary, DayRow } from '../domain/daily'
import { dayLabel } from '../domain/dates'
import { formatKHR, formatUSD } from '../domain/money'

interface Props {
  rows: DayRow[]
  summary: DailySummary
  rate: number
  today: string
  defaultPlanKHR: number
  dailyPlans: Record<string, number>
  onSetPlan: (date: string, plannedKHR: number | null) => void
  onAddExpense: (date: string) => void
}

/** Editable plan cell. Commits when you leave the field; empty = back to the default plan. */
function PlanCell({ value, isOverride, onCommit }: { value: number; isOverride: boolean; onCommit: (khr: number | null) => void }) {
  const [text, setText] = useState<string | null>(null)

  const commit = () => {
    if (text === null) return
    const n = Number(text)
    if (text.trim() === '') onCommit(null)
    else if (Number.isFinite(n) && n >= 0) onCommit(Math.round(n))
    setText(null)
  }

  return (
    <input
      className={`plan-input ${isOverride ? 'custom' : ''}`}
      type="number"
      inputMode="numeric"
      min="0"
      aria-label="Planned riel"
      value={text ?? value}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

export function DailyTracker({ rows, summary, rate, today, defaultPlanKHR, dailyPlans, onSetPlan, onAddExpense }: Props) {
  return (
    <div className="stack">
      <section className="card stats">
        <div><p className="eyebrow">Planned</p><strong>{formatKHR(summary.plannedKHR)}</strong></div>
        <div><p className="eyebrow">Spent</p><strong>{formatKHR(summary.spentKHR)}</strong><small>{formatUSD(summary.spentKHR, rate)}</small></div>
        <div>
          <p className="eyebrow">{summary.differenceKHR >= 0 ? 'Under plan' : 'Over plan'}</p>
          <strong className={summary.differenceKHR >= 0 ? 'good' : 'bad'}>{formatKHR(Math.abs(summary.differenceKHR))}</strong>
        </div>
        <div><p className="eyebrow">Days over</p><strong className={summary.daysOver ? 'bad' : ''}>{summary.daysOver}</strong></div>
      </section>

      <p className="muted small">
        Default plan is {formatKHR(defaultPlanKHR)} a day. Change any day's plan below (set 0 for a rest day, clear it to reset).
        Tap + to add what you spent, whether it is ៛3,000, ៛4,000 or a big $25 day.
      </p>

      <div className="table-wrap">
        <table className="daily">
          <thead>
            <tr><th>Day</th><th>Plan ៛</th><th>Spent ៛</th><th>Left ៛</th><th>Balance ៛</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { weekday, day } = dayLabel(row.date)
              return (
                <tr key={row.date} className={`${row.status} ${row.date === today ? 'today' : ''}`}>
                  <td className="day"><b>{day}</b> <span>{weekday}</span></td>
                  <td>
                    <PlanCell value={row.plannedKHR} isOverride={row.date in dailyPlans} onCommit={(khr) => onSetPlan(row.date, khr)} />
                  </td>
                  <td className="num">{row.spentKHR ? row.spentKHR.toLocaleString('en-US') : '–'}</td>
                  <td className={`num ${row.differenceKHR < 0 ? 'bad' : ''}`}>{row.status === 'upcoming' ? '' : row.differenceKHR.toLocaleString('en-US')}</td>
                  <td className={`num ${row.runningKHR < 0 ? 'bad' : ''}`}>{row.status === 'upcoming' ? '' : row.runningKHR.toLocaleString('en-US')}</td>
                  <td><button className="icon-btn add" onClick={() => onAddExpense(row.date)} aria-label={`Add spending on day ${day}`}>＋</button></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{summary.plannedKHR.toLocaleString('en-US')}</td>
              <td className="num">{summary.spentKHR.toLocaleString('en-US')}</td>
              <td className={`num ${summary.differenceKHR < 0 ? 'bad' : ''}`}>{summary.differenceKHR.toLocaleString('en-US')}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
