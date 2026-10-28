import { bucketOfCategory, categoryLabel, getBucket } from '../config'
import { formatEntered, formatKHR } from '../domain/money'
import type { Transaction } from '../domain/types'

const SIGN: Record<Transaction['kind'], string> = { expense: '-', income: '+', deposit: '→', withdrawal: '←' }
const TONE: Record<Transaction['kind'], string> = { expense: 'bad', income: 'good', deposit: 'good', withdrawal: '' }

/** Which bucket a transaction belongs to, as a short label. */
const bucketLabel = (t: Transaction): string => {
  if (t.kind === 'expense') return getBucket(bucketOfCategory(t.categoryId)).label
  if (t.kind === 'income') return 'Income'
  return getBucket('savings').label
}

export function Transactions({ items, onEdit }: { items: Transaction[]; onEdit: (t: Transaction) => void }) {
  if (items.length === 0) return <p className="card muted">Nothing recorded this month yet.</p>

  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  return (
    <ul className="tx-list card">
      {sorted.map((t) => (
        <li key={t.id}>
          <button className="tx" onClick={() => onEdit(t)}>
            <span className="tx-date">{t.date.slice(5)}</span>
            <span className="tx-main">
              <b>{categoryLabel(t.categoryId)}</b>
              <small>{bucketLabel(t)}{t.note ? ` · ${t.note}` : ''}</small>
            </span>
            <span className={`tx-amount ${TONE[t.kind]}`}>
              {SIGN[t.kind]} {formatEntered(t.entered)}
              {t.entered.currency === 'USD' && <small>{formatKHR(t.amountKHR)}</small>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
