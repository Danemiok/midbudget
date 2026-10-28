# My Money — Personal Finance (v2)

Monthly budget using the **50 / 30 / 20 rule**, a day-by-day spending tracker in riel (៛), and savings. Built with React + TypeScript + Vite. Data is stored in the browser (localStorage).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 28 unit tests
npm run build
```

## How the money works (default: $110 / month)
| Bucket | % | Amount | What it is for |
|---|---|---|---|
| Needs | 50% | $55 | Food, transport, bills & rent, health, school, family |
| Wants | 30% | $33 | Eating out, shopping, entertainment, other |
| Savings | 20% | $22 | Deposits you make; leftover Needs/Wants money |

* Each **expense** has a category; the category decides whether it is paid from Needs or Wants.
* The **Daily** tab lists every day of the month with a plan (default ៛3,000, editable per day, 0 = rest day).
  Spent = the sum of that day's expenses. A day over plan (៛4,000, or a $25 day) is highlighted; the running
  **Balance** shows whether cheap days make up for it, and the Plan tab recalculates today's allowance.
* **Savings**: use "Save" for deposits, or press "Save … now" on the Plan tab to move unspent money into savings.

## Project structure
```
src/
  config/      STATIC DATA: buckets (labels, text, colours), categories → bucket, defaults, quick amounts
  domain/      Pure logic, no React: types, money, dates, budget (50/30/20), daily tracker (+ tests)
  storage/     KeyValueStore adapter, versioned save/load, validation, JSON backup, v1 migration (+ tests)
  state/       reducer (all actions) + useFinance hook (load once, save on change)
  components/  Plan, DailyTracker, Transactions, SettingsPanel, TransactionForm, ui
  App.tsx      shell: tabs, month switcher, add/edit modal
```

## Changing things later
* **Interface / wording / colours / categories / quick amounts** → edit `src/config/*` only. Saved entries store category *ids*, so renaming or regrouping never breaks old data.
* **Different storage** (IndexedDB, server) → implement `KeyValueStore` in `storage/storage.ts`; nothing else changes.
* **Data format change** → bump `DATA_VERSION` and add a migration in `storage/validate.ts`.

## Data (stored under `my-money:v2`)
```ts
{ version: 2, data: {
  settings: { monthlyIncomeUSD, exchangeRate, defaultDailyPlanKHR, split: {needs, wants, savings} },
  transactions: [{ id, kind: 'expense'|'income'|'deposit'|'withdrawal', amountKHR, entered:{amount,currency}, categoryId, note, date, createdAt }],
  dailyPlans: { 'YYYY-MM-DD': plannedKHR }
}}
```
Amounts are stored in KHR at the rate of the day they were entered, so changing the exchange rate later does not rewrite history. Data saved by the previous version (`my-money-finance-v1`) is migrated automatically on first load.
