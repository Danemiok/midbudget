import { useEffect, useMemo, useReducer } from 'react'
import type { AppData } from '../domain/types'
import type { FinanceStorage } from '../storage/storage'
import { reducer, type Action } from './reducer'

/** Holds the app data, loads it once from storage and saves after every change. */
export const useFinance = (storage: FinanceStorage): { data: AppData; dispatch: (a: Action) => void; storage: FinanceStorage } => {
  const [data, dispatch] = useReducer(reducer, storage, (s) => s.load())

  useEffect(() => {
    storage.save(data)
  }, [data, storage])

  return useMemo(() => ({ data, dispatch, storage }), [data, storage])
}
