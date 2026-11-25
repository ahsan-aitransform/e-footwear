// Shapes of the voucher API (backend EFootwear.BLL/Accounting/Contracts). Money is whole rupees (integers). Dates are ISO "YYYY-MM-DD".

export const VoucherTypeCodes = {
  payment: "PAYMENT",
  receipt: "RECEIPT",
  expense: "EXPENSE",
  journal: "JOURNAL",
} as const;
export type VoucherTypeCode = (typeof VoucherTypeCodes)[keyof typeof VoucherTypeCodes];

export const VoucherStatusCodes = { posted: "POSTED", void: "VOID" } as const;
export type VoucherStatusCode = (typeof VoucherStatusCodes)[keyof typeof VoucherStatusCodes];

export const VoucherPaymentModeCodes = {
  cash: "CASH",
  bank: "BANK",
  cheque: "CHEQUE",
  online: "ONLINE",
  other: "OTHER",
} as const;
export type VoucherPaymentModeCode = (typeof VoucherPaymentModeCodes)[keyof typeof VoucherPaymentModeCodes];

// What the "To" and "From" boxes of a voucher can name: a general ledger account, a customer, a vendor or a staff member.
export const VoucherTargetKindCodes = { account: "ACCOUNT", customer: "CUSTOMER", vendor: "VENDOR", staff: "STAFF" } as const;
export type VoucherTargetKindCode = (typeof VoucherTargetKindCodes)[keyof typeof VoucherTargetKindCodes];

// The "Type" dropdown of a voucher box: accounts, or one kind of contact.
export const VoucherTargetTypeCodes = {
  account: "ACCOUNT",
  customer: "CUSTOMER",
  vendor: "VENDOR",
  staff: "STAFF",
} as const;
export type VoucherTargetTypeCode = (typeof VoucherTargetTypeCodes)[keyof typeof VoucherTargetTypeCodes];

export const BalanceSideCodes = { debit: "DEBIT", credit: "CREDIT", all: "ALL" } as const;
export type BalanceSideCode = (typeof BalanceSideCodes)[keyof typeof BalanceSideCodes];

export type VoucherTargetRequest = { accountId: string | null; customerId: string | null; vendorId: string | null; staffId: string | null };

export type VoucherAllocationRequest = { invoiceId: string; amount: number };

export type PostVoucherRequest = {
  storeId: string;
  voucherDate: string;
  debitTarget: VoucherTargetRequest;
  creditTarget: VoucherTargetRequest;
  amount: number;
  paymentMode: VoucherPaymentModeCode | null;
  referenceNumber: string | null;
  description: string | null;
  allocations: VoucherAllocationRequest[] | null;
  clientTransactionId: string | null;
};

export type VoucherLineResponse = {
  accountCode: string;
  accountTitle: string;
  customerId: string | null;
  vendorId: string | null;
  staffId: string | null;
  contactName: string | null;
  debitAmount: number;
  creditAmount: number;
  description: string | null;
};

export type VoucherAllocationResponse = {
  invoiceKindCode: "PURCHASE" | "SALE";
  invoiceId: string;
  invoiceNumber: number;
  amount: number;
};

export type VoucherResponse = {
  id: string;
  storeId: string;
  storeName: string;
  voucherTypeCode: VoucherTypeCode;
  voucherNumber: number;
  voucherDate: string;
  amount: number;
  customerId: string | null;
  vendorId: string | null;
  staffId: string | null;
  contactName: string | null;
  paymentMode: VoucherPaymentModeCode | null;
  referenceNumber: string | null;
  description: string | null;
  statusCode: VoucherStatusCode;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  rowVersion: number;
  lines: VoucherLineResponse[];
  allocations: VoucherAllocationResponse[];
};

export type VoucherListItemResponse = {
  id: string;
  storeId: string;
  storeName: string;
  voucherTypeCode: VoucherTypeCode;
  voucherNumber: number;
  voucherDate: string;
  amount: number;
  debitAccountTitle: string;
  creditAccountTitle: string;
  contactName: string | null;
  referenceNumber: string | null;
  description: string | null;
  statusCode: VoucherStatusCode;
};

export type VoucherEntryContextResponse = { voucherTypeCode: VoucherTypeCode; storeId: string; nextVoucherNumber: number };

export type VoucherTargetOptionResponse = {
  kindCode: VoucherTargetKindCode;
  accountId: string | null;
  customerId: string | null;
  vendorId: string | null;
  staffId: string | null;
  code: string;
  title: string;
  typeTitle: string;
  balanceAmount: number;
  balanceSideCode: BalanceSideCode;
};

export type VoucherReportResponse = {
  rows: VoucherListItemResponse[];
  postedVoucherCount: number;
  voidVoucherCount: number;
  totalAmount: number;
  isTruncated: boolean;
};

export type UpdateVoucherDescriptionRequest = { description: string | null; expectedRowVersion: number };
export type VoidVoucherRequest = { reason: string };
