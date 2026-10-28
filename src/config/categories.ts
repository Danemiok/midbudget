import type { BucketId } from '../domain/types'

export interface ExpenseCategory {
  id: string
  label: string
  /** Which spending bucket this category is paid from. */
  bucket: Exclude<BucketId, 'savings'>
}

export interface IncomeCategory {
  id: string
  label: string
}

/** Static category lists. Entries store only the `id`, so labels and buckets can change freely. */
export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  { id: 'food', label: 'Food', bucket: 'needs' },
  { id: 'transport', label: 'Transport', bucket: 'needs' },
  { id: 'bills', label: 'Bills & rent', bucket: 'needs' },
  { id: 'health', label: 'Health', bucket: 'needs' },
  { id: 'education', label: 'Education', bucket: 'needs' },
  { id: 'family', label: 'Family', bucket: 'needs' },
  { id: 'eating-out', label: 'Eating out', bucket: 'wants' },
  { id: 'shopping', label: 'Shopping', bucket: 'wants' },
  { id: 'entertainment', label: 'Entertainment', bucket: 'wants' },
  { id: 'other', label: 'Other', bucket: 'wants' },
]

export const INCOME_CATEGORIES: readonly IncomeCategory[] = [
  { id: 'salary', label: 'Salary' },
  { id: 'allowance', label: 'Allowance' },
  { id: 'other-income', label: 'Other income' },
]

/** Used for deposits and withdrawals, which have no category choice. */
export const SAVINGS_CATEGORY_ID = 'savings'

/** Bucket used when an old entry points to a category that no longer exists. */
export const FALLBACK_BUCKET: ExpenseCategory['bucket'] = 'wants'

export const bucketOfCategory = (categoryId: string): ExpenseCategory['bucket'] =>
  EXPENSE_CATEGORIES.find((c) => c.id === categoryId)?.bucket ?? FALLBACK_BUCKET

export const categoryLabel = (categoryId: string): string =>
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find((c) => c.id === categoryId)?.label ??
  (categoryId === SAVINGS_CATEGORY_ID ? 'Savings' : 'Other')
