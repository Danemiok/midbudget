import type { Currency } from './types'

/** Convert a typed amount into whole riel. */
export const toKHR = (amount: number, currency: Currency, rate: number): number =>
  currency === 'KHR' ? Math.round(amount) : Math.round(amount * rate)

export const khrToUSD = (khr: number, rate: number): number => (rate > 0 ? khr / rate : 0)

const withSign = (negative: boolean, text: string) => (negative ? `-${text}` : text)

export const formatKHR = (khr: number): string =>
  withSign(khr < 0, `៛${Math.abs(Math.round(khr)).toLocaleString('en-US')}`)

export const formatUSD = (khr: number, rate: number): string => {
  const usd = khrToUSD(khr, rate)
  return withSign(usd < 0, `$${Math.abs(usd).toFixed(2)}`)
}

/** Format a typed amount the way the user entered it. */
export const formatEntered = (entered: { amount: number; currency: Currency }): string =>
  entered.currency === 'USD' ? `$${entered.amount.toFixed(2)}` : formatKHR(entered.amount)
