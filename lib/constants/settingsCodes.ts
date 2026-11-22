// The code lists of the Settings screens. They mirror the C# constants (SettingsSectionCodes, PaymentMethodCodes, PrintFormatCodes,
// DateFormatCodes, TimeFormatCodes, RoundingModeCodes, PriceBandBasisCodes, DocumentNumberSeriesCodes, BackupHealth statuses,
// AdministratorActionCodes). The server validates every value; the lists only fill the dropdowns.

export const PaymentMethodCodes = ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"] as const;
export type PaymentMethodCode = (typeof PaymentMethodCodes)[number];

export const PrintFormatCodes = ["THERMAL", "A4", "A5"] as const;
export const DateFormatCodes = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const TimeFormatCodes = ["12H", "24H"] as const;
export const RoundingModeCodes = ["FLOOR", "NEAREST"] as const;
export const PriceBandBasisCodes = ["LIST", "NET"] as const;

export const DocumentNumberSeriesCodes = [
  "SALE_INVOICE",
  "SALE_RETURN_INVOICE",
  "PURCHASE_INVOICE",
  "PURCHASE_RETURN_INVOICE",
  "PAYMENT_VOUCHER",
  "RECEIPT_VOUCHER",
  "EXPENSE_VOUCHER",
  "JOURNAL_VOUCHER",
  "STOCK_ADJUSTMENT",
  "STOCK_AUDIT",
  "PRODUCT_CLAIM",
  "STOCK_TRANSFER",
  "SALE_ORDER",
  "SALE_RETURN_ORDER",
  "PURCHASE_ORDER",
  "PURCHASE_RETURN_ORDER",
  "VENDOR_PURCHASE_ORDER",
  "COMPANY_PURCHASE_ORDER",
] as const;
export type DocumentNumberSeriesCode = (typeof DocumentNumberSeriesCodes)[number];

export const CompanyStatusCodes = { active: "ACTIVE", suspended: "SUSPENDED", closed: "CLOSED" } as const;
export type CompanyStatusCode = (typeof CompanyStatusCodes)[keyof typeof CompanyStatusCodes];

// ops.v_backup_health status values.
export const BackupHealthStatusCodes = {
  ok: "OK",
  noBaseBackup: "NO_BASE_BACKUP",
  baseBackupStale: "BASE_BACKUP_STALE",
  noWalArchive: "NO_WAL_ARCHIVE",
  walArchiveStale: "WAL_ARCHIVE_STALE",
  neverTested: "NEVER_TESTED",
  restoreTestDue: "RESTORE_TEST_DUE",
} as const;

export const AdministratorActionCodes = [
  "LOGIN",
  "COMPANY_CREATED",
  "STORE_CREATED",
  "USER_CREATED",
  "PLAN_CREATED",
  "PLAN_UPDATED",
  "COMPANY_PLAN_ASSIGNED",
  "COMPANY_STATUS_CHANGED",
] as const;

// The device-level choices stored in a person's own preferences (the codes of lib/constants/languageCodes and lib/theme).
export const UserPreferenceThemeCodes = ["light", "dark", "system"] as const;
