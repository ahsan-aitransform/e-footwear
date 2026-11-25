import { isValidIsoDate } from "@/components/forms/DateField";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import {
  VoucherPaymentModeCodes,
  VoucherTargetKindCodes,
  VoucherTargetTypeCodes,
  VoucherTypeCodes,
  type PostVoucherRequest,
  type VoucherPaymentModeCode,
  type VoucherTargetOptionResponse,
  type VoucherTargetRequest,
  type VoucherTargetTypeCode,
  type VoucherTypeCode,
} from "../types/voucherTypes";

// What a person chose in one box of the voucher form ("To" or "From"): the type of thing, and the account, customer, vendor or staff member.
export type VoucherTargetChoice = {
  typeCode: VoucherTargetTypeCode;
  option: VoucherTargetOptionResponse | null;
};

export type VoucherFormState = {
  storeId: string;
  voucherDate: string;
  // "To" is debited (بنام Dr), "From" is credited (جمع Cr).
  debit: VoucherTargetChoice;
  credit: VoucherTargetChoice;
  amount: number | null;
  paymentMode: VoucherPaymentModeCode | null;
  referenceNumber: string;
  description: string;
};

export type VoucherFormFieldKey = "storeId" | "voucherDate" | "debit" | "credit" | "amount";
export type VoucherFormErrors = Partial<Record<VoucherFormFieldKey, MessageKey>>;

// The type the "To" and "From" dropdowns start on, per voucher type (the docx examples: a payment goes to a vendor from cash or
// bank; a receipt comes from a customer into cash or bank; an expense and a journal voucher move between accounts).
// These are starting points, not rules: any type can be chosen in either box. Which combinations are allowed is a business
// decision ([BUSINESS DECISION REQUIRED]) that the system does not enforce.
export function defaultTargetTypes(voucherTypeCode: VoucherTypeCode): { debit: VoucherTargetTypeCode; credit: VoucherTargetTypeCode } {
  switch (voucherTypeCode) {
    case VoucherTypeCodes.payment:
      return { debit: VoucherTargetTypeCodes.vendor, credit: VoucherTargetTypeCodes.account };
    case VoucherTypeCodes.receipt:
      return { debit: VoucherTargetTypeCodes.account, credit: VoucherTargetTypeCodes.customer };
    default:
      return { debit: VoucherTargetTypeCodes.account, credit: VoucherTargetTypeCodes.account };
  }
}

// The receipt voucher of the docx shows the "From" box above the "To" box; the other three screens show "To" first.
export function showsFromBoxFirst(voucherTypeCode: VoucherTypeCode): boolean {
  return voucherTypeCode === VoucherTypeCodes.receipt;
}

// Only payments and receipts have a "Print after saving" tick box in the docx (6.1, 6.2).
export function offersPrintAfterSaving(voucherTypeCode: VoucherTypeCode): boolean {
  return voucherTypeCode === VoucherTypeCodes.payment || voucherTypeCode === VoucherTypeCodes.receipt;
}

export function offersPaymentMode(voucherTypeCode: VoucherTypeCode): boolean {
  return voucherTypeCode === VoucherTypeCodes.payment || voucherTypeCode === VoucherTypeCodes.receipt;
}

export function createEmptyVoucherForm(voucherTypeCode: VoucherTypeCode, storeId: string, todayIsoDate: string): VoucherFormState {
  const types = defaultTargetTypes(voucherTypeCode);
  return {
    storeId,
    voucherDate: todayIsoDate,
    debit: { typeCode: types.debit, option: null },
    credit: { typeCode: types.credit, option: null },
    amount: null,
    paymentMode: offersPaymentMode(voucherTypeCode) ? VoucherPaymentModeCodes.cash : null,
    referenceNumber: "",
    description: "",
  };
}

// The same account or contact can not be on both sides, and two customers, vendors or staff members can not be posted against each other (the books keep every
// one of them on the subledger control account, so an account has to sit between them). The server checks the same rules.
export function validateVoucherForm(form: VoucherFormState): VoucherFormErrors {
  const errors: VoucherFormErrors = {};
  if (form.storeId === "") errors.storeId = "accounting.voucher.error.storeRequired";
  if (!isValidIsoDate(form.voucherDate)) errors.voucherDate = "fields.invalidDate";
  if (form.debit.option === null) errors.debit = "accounting.voucher.error.toRequired";
  if (form.credit.option === null) errors.credit = "accounting.voucher.error.fromRequired";
  if (form.amount === null || !Number.isSafeInteger(form.amount) || form.amount <= 0) errors.amount = "accounting.voucher.error.amountRequired";

  if (form.debit.option !== null && form.credit.option !== null) {
    if (isSameTarget(form.debit.option, form.credit.option)) {
      errors.credit = "accounting.voucher.error.sameBothSides";
    } else if (form.debit.option.kindCode !== VoucherTargetKindCodes.account && form.credit.option.kindCode !== VoucherTargetKindCodes.account) {
      errors.credit = "accounting.voucher.error.twoContacts";
    }
  }
  return errors;
}

export function hasVoucherFormErrors(errors: VoucherFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function isSameTarget(first: VoucherTargetOptionResponse, second: VoucherTargetOptionResponse): boolean {
  return first.kindCode === second.kindCode && first.accountId === second.accountId
    && first.customerId === second.customerId && first.vendorId === second.vendorId && first.staffId === second.staffId;
}

export function toVoucherTargetRequest(option: VoucherTargetOptionResponse): VoucherTargetRequest {
  return {
    accountId: option.kindCode === VoucherTargetKindCodes.account ? option.accountId : null,
    customerId: option.kindCode === VoucherTargetKindCodes.customer ? option.customerId : null,
    vendorId: option.kindCode === VoucherTargetKindCodes.vendor ? option.vendorId : null,
    staffId: option.kindCode === VoucherTargetKindCodes.staff ? option.staffId : null,
  };
}

// The request the server receives. The client transaction id belongs to one saving attempt of one voucher: a retry after a
// timeout sends the same id again and the server answers with the voucher it already posted.
export function buildPostVoucherRequest(form: VoucherFormState, clientTransactionId: string): PostVoucherRequest {
  if (form.debit.option === null || form.credit.option === null || form.amount === null) {
    throw new Error("buildPostVoucherRequest needs a validated form.");
  }
  const referenceNumber = form.referenceNumber.trim();
  const description = form.description.trim();
  return {
    storeId: form.storeId,
    voucherDate: form.voucherDate,
    debitTarget: toVoucherTargetRequest(form.debit.option),
    creditTarget: toVoucherTargetRequest(form.credit.option),
    amount: form.amount,
    paymentMode: form.paymentMode,
    referenceNumber: referenceNumber === "" ? null : referenceNumber,
    description: description === "" ? null : description,
    allocations: null,
    clientTransactionId,
  };
}

// The lookup the dropdown of a box needs: accounts, or one kind of contact (the type codes are the kind codes).
export function toTargetLookupQuery(typeCode: VoucherTargetTypeCode): { kindCode: string } {
  return { kindCode: typeCode };
}
