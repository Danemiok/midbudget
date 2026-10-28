import { useRef, useState } from 'react'
import { BUCKETS, BUCKET_IDS } from '../config'
import { allocate, isSplitValid } from '../domain/budget'
import { formatKHR, formatUSD, toKHR } from '../domain/money'
import type { AppData, BucketId, Settings } from '../domain/types'
import type { FinanceStorage } from '../storage/storage'

interface Props {
  data: AppData
  storage: FinanceStorage
  onSave: (settings: Settings) => void
  onReplaceData: (data: AppData) => void
  onReset: () => void
}

export function SettingsPanel({ data, storage, onSave, onReplaceData, onReset }: Props) {
  const { settings } = data
  const [income, setIncome] = useState(String(settings.monthlyIncomeUSD))
  const [rate, setRate] = useState(String(settings.exchangeRate))
  const [daily, setDaily] = useState(String(settings.defaultDailyPlanKHR))
  const [split, setSplit] = useState<Record<BucketId, string>>({
    needs: String(settings.split.needs),
    wants: String(settings.split.wants),
    savings: String(settings.split.savings),
  })
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const draft: Settings = {
    monthlyIncomeUSD: Number(income),
    exchangeRate: Number(rate),
    defaultDailyPlanKHR: Math.round(Number(daily)),
    split: { needs: Number(split.needs), wants: Number(split.wants), savings: Number(split.savings) },
  }
  const splitTotal = BUCKET_IDS.reduce((total, id) => total + draft.split[id], 0)
  const valid =
    draft.monthlyIncomeUSD >= 0 && draft.exchangeRate > 0 && draft.defaultDailyPlanKHR >= 0 && income !== '' && rate !== '' && daily !== '' && isSplitValid(draft.split)

  const preview = allocate(toKHR(draft.monthlyIncomeUSD || 0, 'USD', draft.exchangeRate || 0), draft.split)

  const save = () => {
    onSave(draft)
    setMessage('Settings saved.')
  }

  const exportBackup = () => {
    const url = URL.createObjectURL(new Blob([storage.exportJson(data)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `my-money-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file: File) => {
    const imported = storage.importJson(await file.text())
    if (!imported) return setMessage('That file is not a valid backup.')
    if (!window.confirm('Replace all current data with this backup?')) return
    onReplaceData(imported)
    setMessage('Backup restored.')
  }

  return (
    <div className="stack">
      <section className="card form">
        <h3>Monthly plan</h3>
        <label>
          Money each month ($)
          <input type="number" inputMode="decimal" min="0" step="any" value={income} onChange={(e) => setIncome(e.target.value)} />
        </label>
        <label>
          Exchange rate (៛ per $1)
          <input type="number" inputMode="numeric" min="1" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
        <label>
          Daily plan (៛ per day)
          <input type="number" inputMode="numeric" min="0" value={daily} onChange={(e) => setDaily(e.target.value)} />
        </label>

        <h3>Split (must total 100%)</h3>
        <div className="split-grid">
          {BUCKETS.map((b) => (
            <label key={b.id}>
              {b.label} %
              <input type="number" inputMode="numeric" min="0" max="100" value={split[b.id]} onChange={(e) => setSplit({ ...split, [b.id]: e.target.value })} />
            </label>
          ))}
        </div>
        <p className={splitTotal === 100 ? 'muted' : 'notice'}>Total: {splitTotal}%{splitTotal !== 100 && ' — adjust so it adds up to 100%'}</p>

        {valid && (
          <p className="preview">
            {BUCKETS.map((b) => (
              <span key={b.id}>
                {b.label} <b>{formatUSD(preview[b.id], draft.exchangeRate)}</b> <small>({formatKHR(preview[b.id])})</small>
              </span>
            ))}
          </p>
        )}

        <div className="form-actions">
          <span className="spacer" />
          <button className="btn primary" disabled={!valid} onClick={save}>Save settings</button>
        </div>
      </section>

      <section className="card form">
        <h3>Backup</h3>
        <p className="muted small">Your data is stored in this browser. Export a copy to keep it safe or move it to another device.</p>
        <div className="form-actions wrap">
          <button className="btn" onClick={exportBackup}>Export backup</button>
          <button className="btn" onClick={() => fileInput.current?.click()}>Import backup</button>
          <span className="spacer" />
          <button className="btn danger" onClick={() => window.confirm('Delete all data and start over?') && onReset()}>Reset everything</button>
        </div>
        <input ref={fileInput} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = '' }} />
      </section>

      {message && <p className="toast" role="status">{message}</p>}
    </div>
  )
}
