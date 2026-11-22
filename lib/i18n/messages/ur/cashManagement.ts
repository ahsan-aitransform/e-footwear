import type { cashManagementEnglishMessages } from "../en/cashManagement";

// Cash and bank balances (module: accounting, cash management part). The Urdu wording is a draft awaiting review by a native speaker.
export const cashManagementUrduMessages: Record<keyof typeof cashManagementEnglishMessages, string> = {
  "cashManagement.balances.title": "کیش اور بینک بیلنس",
  "cashManagement.balances.subtitle": "ہر سٹور کی کیش اور بینک پوزیشن ایک تاریخ تک، کھاتوں سے لی گئی۔",
  "cashManagement.balances.asOf": "بتاریخ",
  "cashManagement.balances.store": "سٹور",
  "cashManagement.balances.allStores": "تمام سٹورز",
  "cashManagement.balances.kind.cash": "کیش",
  "cashManagement.balances.kind.bank": "بینک",
  "cashManagement.balances.column.code": "کوڈ",
  "cashManagement.balances.column.account": "اکاؤنٹ",
  "cashManagement.balances.column.kind": "قسم",
  "cashManagement.balances.column.store": "سٹور",
  "cashManagement.balances.column.balance": "بیلنس",
  "cashManagement.balances.totalCash": "کل کیش",
  "cashManagement.balances.totalBank": "کل بینک",
  "cashManagement.balances.empty": "اس تاریخ تک کیش یا بینک کا کوئی اندراج نہیں",
  "cashManagement.balances.emptyText": "بعد کی تاریخ یا کوئی اور سٹور منتخب کریں۔",
  "cashManagement.balances.printTitle": "{date} تک کیش اور بینک بیلنس",
};
