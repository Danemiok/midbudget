import type { BucketId } from '../domain/types'

export interface BucketDef {
  id: BucketId
  label: string
  /** Short answer to "what is this money for?" */
  purpose: string
  /** Examples shown in the UI. */
  examples: string
  defaultPercent: number
  color: string
}

/** Static description of the 50/30/20 rule. Change text or colours here, not in components. */
export const BUCKETS: readonly BucketDef[] = [
  {
    id: 'needs',
    label: 'Needs',
    purpose: 'Things you must pay for',
    examples: 'Food, transport, rent, bills, health, school',
    defaultPercent: 50,
    color: '#2563eb',
  },
  {
    id: 'wants',
    label: 'Wants',
    purpose: 'Things that are nice to have',
    examples: 'Eating out, shopping, fun, gifts',
    defaultPercent: 30,
    color: '#d97706',
  },
  {
    id: 'savings',
    label: 'Savings',
    purpose: 'Money you keep for later',
    examples: 'Emergency fund, goals, leftover money',
    defaultPercent: 20,
    color: '#059669',
  },
]

export const BUCKET_IDS: readonly BucketId[] = BUCKETS.map((b) => b.id)

export const getBucket = (id: BucketId): BucketDef => BUCKETS.find((b) => b.id === id)!
