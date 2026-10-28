import { useMemo, useState } from 'react'
import { DailyTracker } from './components/DailyTracker'
import { Plan } from './components/Plan'
import { SettingsPanel } from './components/SettingsPanel'
import { TransactionForm, type FormPreset } from './components/TransactionForm'
import { Transactions } from './components/Transactions'
import { Modal } from './components/ui'
import { summarizeMonth, transactionsInMonth } from './domain/budget'
import { buildDailyRows, summarizeDaily } from './domain/daily'
import { monthLabel, monthOf, shiftMonth, todayISO } from './domain/dates'
import type { Transaction } from './domain/types'
import { useFinance } from './state/useFinance'
import { browserStorage } from './storage/storage'

type Tab = 'plan' | 'daily' | 'history' | 'settings'
const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'daily', label: 'Daily' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

/** What the form modal is currently doing, or null when closed. */
type FormState = { mode: 'add'; preset?: FormPreset } | { mode: 'edit'; transaction: Transaction }

const storage = browserStorage()

export default function App() {
  const { data, dispatch } = useFinance(storage)
  const today = todayISO()
  const [tab, setTab] = useState<Tab>('plan')
  const [month, setMonth] = useState(monthOf(today))
  const [form, setForm] = useState<FormState | null>(null)

  /** Bumped when data is replaced or reset, so the settings form reloads its fields. */
  const [settingsKey, setSettingsKey] = useState(0)

  const rate = data.settings.exchangeRate
  const summary = useMemo(() => summarizeMonth(data, month, today), [data, month, today])
  const dailyRows = useMemo(() => buildDailyRows(data, month, today), [data, month, today])
  const dailySummary = useMemo(() => summarizeDaily(dailyRows), [dailyRows])
  const monthTransactions = useMemo(() => transactionsInMonth(data.transactions, month), [data.transactions, month])

  const closeForm = () => setForm(null)

  return (
    <div className="app">
      <header className="topbar">
        <h1>My Money</h1>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
          <span>{monthLabel(month)}</span>
          <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>

      <main>
        {tab === 'plan' && (
          <Plan
            summary={summary}
            rate={rate}
            dailyPlanTotalKHR={dailySummary.plannedKHR}
            onSaveLeftover={(amountKHR) => setForm({ mode: 'add', preset: { kind: 'deposit', amountKHR, date: today } })}
          />
        )}
        {tab === 'daily' && (
          <DailyTracker
            rows={dailyRows}
            summary={dailySummary}
            rate={rate}
            today={today}
            defaultPlanKHR={data.settings.defaultDailyPlanKHR}
            dailyPlans={data.dailyPlans}
            onSetPlan={(date, plannedKHR) => dispatch({ type: 'dailyPlan/set', date, plannedKHR })}
            onAddExpense={(date) => setForm({ mode: 'add', preset: { kind: 'expense', date } })}
          />
        )}
        {tab === 'history' && <Transactions items={monthTransactions} onEdit={(transaction) => setForm({ mode: 'edit', transaction })} />}
        {tab === 'settings' && (
          <SettingsPanel
            key={settingsKey}
            data={data}
            storage={storage}
            onSave={(settings) => dispatch({ type: 'settings/update', settings })}
            onReplaceData={(next) => { dispatch({ type: 'data/replace', data: next }); setSettingsKey((k) => k + 1) }}
            onReset={() => { dispatch({ type: 'data/reset' }); setSettingsKey((k) => k + 1) }}
          />
        )}
      </main>

      <button className="fab" onClick={() => setForm({ mode: 'add', preset: { date: month === monthOf(today) ? today : `${month}-01` } })} aria-label="Add transaction">＋</button>

      {form && (
        <Modal title={form.mode === 'edit' ? 'Edit entry' : 'Add entry'} onClose={closeForm}>
          <TransactionForm
            rate={rate}
            today={today}
            initial={form.mode === 'edit' ? form.transaction : undefined}
            preset={form.mode === 'add' ? form.preset : undefined}
            onCancel={closeForm}
            onSave={(input) => {
              dispatch(form.mode === 'edit' ? { type: 'transaction/update', id: form.transaction.id, input } : { type: 'transaction/add', input })
              closeForm()
            }}
            onDelete={form.mode === 'edit' ? () => { dispatch({ type: 'transaction/delete', id: form.transaction.id }); closeForm() } : undefined}
          />
        </Modal>
      )}
    </div>
  )
}
