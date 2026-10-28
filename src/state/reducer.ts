import { createDefaultData } from '../config'
import type { AppData, NewTransaction, Settings, Transaction } from '../domain/types'

export type Action =
  | { type: 'transaction/add'; input: NewTransaction }
  | { type: 'transaction/update'; id: string; input: NewTransaction }
  | { type: 'transaction/delete'; id: string }
  /** `plannedKHR: null` removes the override and returns the day to the default plan. */
  | { type: 'dailyPlan/set'; date: string; plannedKHR: number | null }
  | { type: 'settings/update'; settings: Settings }
  | { type: 'data/replace'; data: AppData }
  | { type: 'data/reset' }

const newId = () => crypto.randomUUID()

export const reducer = (state: AppData, action: Action): AppData => {
  switch (action.type) {
    case 'transaction/add': {
      const tx: Transaction = { ...action.input, id: newId(), createdAt: new Date().toISOString() }
      return { ...state, transactions: [...state.transactions, tx] }
    }
    case 'transaction/update':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.id ? { ...t, ...action.input } : t)),
      }
    case 'transaction/delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) }
    case 'dailyPlan/set': {
      const dailyPlans = { ...state.dailyPlans }
      if (action.plannedKHR === null) delete dailyPlans[action.date]
      else dailyPlans[action.date] = action.plannedKHR
      return { ...state, dailyPlans }
    }
    case 'settings/update':
      return { ...state, settings: action.settings }
    case 'data/replace':
      return action.data
    case 'data/reset':
      return createDefaultData()
  }
}
