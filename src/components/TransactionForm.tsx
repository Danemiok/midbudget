import { useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, QUICK_AMOUNTS_KHR, SAVINGS_CATEGORY_ID, getBucket } from '../config'
import { formatKHR, toKHR } from '../domain/money'
import type { Currency, NewTransaction, Transaction, TransactionKind } from '../domain/types'

const KIND_LABELS: Record<TransactionKind, string> = {
  expense: 'Spend',
  income: 'Income',
  deposit: 'Save',
  withdrawal: 'Take out',
}

export interface FormPreset {
  kind?: TransactionKind
  date?: string
  amountKHR?: number
}

interface Props {
  rate: number
  today: string
  /** Edit an existing transaction. */
  initial?: Transaction
  /** Prefill a new transaction (e.g. the day tapped in the tracker). */
  preset?: FormPreset
  onSave: (input: NewTransaction) => void
  onDelete?: () => void
  onCancel: () => void
}

const defaultCategory = (kind: TransactionKind): string =>
  kind === 'expense' ? EXPENSE_CATEGORIES[0].id : kind === 'income' ? INCOME_CATEGORIES[0].id : SAVINGS_CATEGORY_ID

export function TransactionForm({ rate, today, initial, preset, onSave, onDelete, onCancel }: Props) {
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? preset?.kind ?? 'expense')
  const [currency, setCurrency] = useState<Currency>(initial?.entered.currency ?? 'KHR')
  const [amountText, setAmountText] = useState(
    initial ? String(initial.entered.amount) : preset?.amountKHR ? String(preset.amountKHR) : '',
  )
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? defaultCategory(kind))
  const [date, setDate] = useState(initial?.date ?? preset?.date ?? today)
  const [note, setNote] = useState(initial?.note ?? '')

  const amount = Number(amountText)
  const valid = amount > 0 && Boolean(date)
  const amountKHR = valid ? toKHR(amount, currency, rate) : 0

  const changeKind = (next: TransactionKind) => {
    setKind(next)
    setCategoryId(defaultCategory(next))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSave({ kind, amountKHR, entered: { amount, currency }, categoryId, note: note.trim(), date })
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="segmented" role="tablist" aria-label="Type">
        {(Object.keys(KIND_LABELS) as TransactionKind[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => changeKind(k)}>
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <label>
        Amount
        <div className="amount-row">
          <input type="number" inputMode="decimal" min="0" step="any" autoFocus placeholder="0" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
          <div className="segmented small">
            {(['KHR', 'USD'] as Currency[]).map((c) => (
              <button key={c} type="button" className={currency === c ? 'on' : ''} onClick={() => setCurrency(c)}>
                {c === 'KHR' ? '៛' : '$'}
              </button>
            ))}
          </div>
        </div>
        {valid && currency === 'USD' && <small className="hint">= {formatKHR(amountKHR)}</small>}
      </label>

      {kind === 'expense' && currency === 'KHR' && (
        <div className="chips">
          {QUICK_AMOUNTS_KHR.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => setAmountText(String(q))}>
              {formatKHR(q)}
            </button>
          ))}
        </div>
      )}

      {kind === 'expense' && (
        <label>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {(['needs', 'wants'] as const).map((bucket) => (
              <optgroup key={bucket} label={getBucket(bucket).label}>
                {EXPENSE_CATEGORIES.filter((c) => c.bucket === bucket).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      {kind === 'income' && (
        <label>
          Source
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {INCOME_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label>
        Note
        <input type="text" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="form-actions">
        {onDelete && <button type="button" className="btn danger" onClick={onDelete}>Delete</button>}
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn primary" disabled={!valid}>Save</button>
      </div>
    </form>
  )
}
