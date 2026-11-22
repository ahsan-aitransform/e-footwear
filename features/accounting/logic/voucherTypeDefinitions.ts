import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes, type PermissionCode } from "@/lib/contracts/permissionCodes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { VoucherPaymentModeCodes, VoucherTypeCodes, type VoucherPaymentModeCode, type VoucherTypeCode } from "../types/voucherTypes";

// SINGLE SOURCE OF TRUTH for what differs between the four voucher screens: their texts, their endpoints and the permission that
// opens them. The screen component is the same for all four.
type VoucherTypeDefinition = {
  titleMessageKey: MessageKey;
  subtitleMessageKey: MessageKey;
  entryContextPath: string;
  targetsPath: string;
  postPath: string;
  addPermissionCode: PermissionCode;
};

export const voucherTypeDefinitions: Record<VoucherTypeCode, VoucherTypeDefinition> = {
  [VoucherTypeCodes.payment]: {
    titleMessageKey: "accounting.voucher.payment.title",
    subtitleMessageKey: "accounting.voucher.payment.subtitle",
    entryContextPath: ApiEndpoints.vouchers.payment.entryContext,
    targetsPath: ApiEndpoints.vouchers.payment.targets,
    postPath: ApiEndpoints.vouchers.payment.post,
    addPermissionCode: PermissionCodes.VOUCHER.PAYMENT_VOUCHER.ADD,
  },
  [VoucherTypeCodes.receipt]: {
    titleMessageKey: "accounting.voucher.receipt.title",
    subtitleMessageKey: "accounting.voucher.receipt.subtitle",
    entryContextPath: ApiEndpoints.vouchers.receipt.entryContext,
    targetsPath: ApiEndpoints.vouchers.receipt.targets,
    postPath: ApiEndpoints.vouchers.receipt.post,
    addPermissionCode: PermissionCodes.VOUCHER.RECEIPT_VOUCHER.ADD,
  },
  [VoucherTypeCodes.expense]: {
    titleMessageKey: "accounting.voucher.expense.title",
    subtitleMessageKey: "accounting.voucher.expense.subtitle",
    entryContextPath: ApiEndpoints.vouchers.expense.entryContext,
    targetsPath: ApiEndpoints.vouchers.expense.targets,
    postPath: ApiEndpoints.vouchers.expense.post,
    addPermissionCode: PermissionCodes.VOUCHER.EXPENSE_VOUCHER.ADD,
  },
  [VoucherTypeCodes.journal]: {
    titleMessageKey: "accounting.voucher.journal.title",
    subtitleMessageKey: "accounting.voucher.journal.subtitle",
    entryContextPath: ApiEndpoints.vouchers.journal.entryContext,
    targetsPath: ApiEndpoints.vouchers.journal.targets,
    postPath: ApiEndpoints.vouchers.journal.post,
    addPermissionCode: PermissionCodes.VOUCHER.JOURNAL_VOUCHER.ADD,
  },
};

export const voucherTypeTitleMessageKeys: Record<VoucherTypeCode, MessageKey> = {
  [VoucherTypeCodes.payment]: "accounting.voucher.payment.title",
  [VoucherTypeCodes.receipt]: "accounting.voucher.receipt.title",
  [VoucherTypeCodes.expense]: "accounting.voucher.expense.title",
  [VoucherTypeCodes.journal]: "accounting.voucher.journal.title",
};

export const paymentModeMessageKeys: Record<VoucherPaymentModeCode, MessageKey> = {
  [VoucherPaymentModeCodes.cash]: "accounting.voucher.paymentMode.cash",
  [VoucherPaymentModeCodes.bank]: "accounting.voucher.paymentMode.bank",
  [VoucherPaymentModeCodes.cheque]: "accounting.voucher.paymentMode.cheque",
  [VoucherPaymentModeCodes.online]: "accounting.voucher.paymentMode.online",
  [VoucherPaymentModeCodes.other]: "accounting.voucher.paymentMode.other",
};

export function isVoucherTypeCode(value: string | null): value is VoucherTypeCode {
  return value === VoucherTypeCodes.payment || value === VoucherTypeCodes.receipt || value === VoucherTypeCodes.expense || value === VoucherTypeCodes.journal;
}
