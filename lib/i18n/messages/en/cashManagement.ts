// Cash and bank balances (module: accounting, cash management part). Keys: cashManagement.balances.*. The cash calculator and promise
// keys of the master data module start with cash. and are not repeated here.
export const cashManagementEnglishMessages = {
  "cashManagement.balances.title": "Cash and Bank Balances",
  "cashManagement.balances.subtitle": "The cash and bank position of each store as on a date, taken from the books.",
  "cashManagement.balances.asOf": "Dated on",
  "cashManagement.balances.store": "Store",
  "cashManagement.balances.allStores": "All stores",
  "cashManagement.balances.kind.cash": "Cash",
  "cashManagement.balances.kind.bank": "Bank",
  "cashManagement.balances.column.code": "Code",
  "cashManagement.balances.column.account": "Account",
  "cashManagement.balances.column.kind": "Kind",
  "cashManagement.balances.column.store": "Store",
  "cashManagement.balances.column.balance": "Balance",
  "cashManagement.balances.totalCash": "Total cash",
  "cashManagement.balances.totalBank": "Total bank",
  "cashManagement.balances.empty": "No cash or bank entries up to this date",
  "cashManagement.balances.emptyText": "Choose a later date or another store.",
  "cashManagement.balances.printTitle": "Cash and bank balances as on {date}",
} as const;
