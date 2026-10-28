import { BUCKETS } from '../config'
import type { MonthSummary } from '../domain/budget'
import { formatKHR, formatUSD } from '../domain/money'
import { Amount, ProgressBar } from './ui'

interface Props {
  summary: MonthSummary
  rate: number
  /** Sum of the daily plan for the whole month. */
  dailyPlanTotalKHR: number
  onSaveLeftover: (amountKHR: number) => void
}

/** The 50/30/20 screen: what each bucket is for, how much it holds, and how much is used. */
export function Plan({ summary, rate, dailyPlanTotalKHR, onSaveLeftover }: Props) {
  const spendBudgetKHR = summary.buckets.needs.allocatedKHR + summary.buckets.wants.allocatedKHR
  const planTooBig = dailyPlanTotalKHR > spendBudgetKHR
  const leftover = summary.spendableLeftKHR

  return (
    <div className="stack">
      <section className="card hero">
        <p className="eyebrow">Money this month</p>
        <h2 className="big">{formatUSD(summary.incomeKHR, rate)}</h2>
        <p className="muted">{formatKHR(summary.incomeKHR)} · cash left after spending and saving: <strong>{formatUSD(summary.cashLeftKHR, rate)}</strong></p>
      </section>

      <div className="grid-3">
        {BUCKETS.map((def) => {
          const b = summary.buckets[def.id]
          const isSavings = def.id === 'savings'
          const over = !isSavings && b.remainingKHR < 0
          return (
            <section className="card bucket" key={def.id} style={{ borderTopColor: def.color }}>
              <header>
                <h3>{def.label}</h3>
                <span className="pill" style={{ background: def.color }}>{b.percent}%</span>
              </header>
              <p className="purpose">{def.purpose}</p>
              <p className="muted small">{def.examples}</p>

              <Amount khr={b.allocatedKHR} rate={rate} />
              <ProgressBar percent={b.usedPercent} color={def.color} label={`${def.label} used`} />

              <dl className="rows">
                <div><dt>{isSavings ? 'Saved' : 'Spent'}</dt><dd>{formatUSD(b.usedKHR, rate)}</dd></div>
                <div>
                  <dt>{isSavings ? 'Still to save' : over ? 'Over by' : 'Left'}</dt>
                  <dd className={over ? 'bad' : ''}>{formatUSD(Math.abs(b.remainingKHR), rate)}</dd>
                </div>
              </dl>
            </section>
          )
        })}
      </div>

      <section className="card">
        <h3>Today's allowance</h3>
        {summary.remainingDays > 0 ? (
          <p>
            You can spend about <strong>{formatKHR(summary.suggestedDailyKHR)}</strong> a day for the next{' '}
            {summary.remainingDays} days and stay inside Needs + Wants.
          </p>
        ) : (
          <p className="muted">This month is finished.</p>
        )}
        {planTooBig && (
          <p className="notice">
            Your daily plan adds up to {formatKHR(dailyPlanTotalKHR)}, more than your Needs + Wants budget of {formatKHR(spendBudgetKHR)}.
            Lower the daily plan in Settings.
          </p>
        )}
      </section>

      <section className="card">
        <h3>Want to save more?</h3>
        {leftover > 0 ? (
          <>
            <p>
              You have <strong>{formatUSD(leftover, rate)}</strong> of Needs + Wants not spent yet. Anything you don't spend can go into savings.
            </p>
            <button className="btn primary" onClick={() => onSaveLeftover(leftover)}>Save {formatUSD(leftover, rate)} now</button>
          </>
        ) : (
          <p className="muted">No unspent money to move right now.</p>
        )}
      </section>
    </div>
  )
}
