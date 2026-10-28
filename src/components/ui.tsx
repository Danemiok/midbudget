import type { ReactNode } from 'react'
import { formatKHR, formatUSD } from '../domain/money'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ProgressBar({ percent, color, label }: { percent: number; color: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar-fill" style={{ width: `${clamped}%`, background: percent > 100 ? 'var(--bad)' : color }} />
    </div>
  )
}

/** Shows one amount in the main currency with the other one underneath. */
export function Amount({ khr, rate, primary = 'USD' }: { khr: number; rate: number; primary?: 'USD' | 'KHR' }) {
  const usd = formatUSD(khr, rate)
  const riel = formatKHR(khr)
  return (
    <span className="amount">
      <strong>{primary === 'USD' ? usd : riel}</strong>
      <small>{primary === 'USD' ? riel : usd}</small>
    </span>
  )
}
