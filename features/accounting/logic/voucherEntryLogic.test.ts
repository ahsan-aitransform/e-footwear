import { describe, expect, it } from "vitest";
import {
  VoucherTargetKindCodes,
  VoucherTargetTypeCodes,
  VoucherTypeCodes,
  type VoucherTargetOptionResponse,
} from "../types/voucherTypes";
import {
  buildPostVoucherRequest,
  createEmptyVoucherForm,
  defaultTargetTypes,
  hasVoucherFormErrors,
  offersPaymentMode,
  offersPrintAfterSaving,
  showsFromBoxFirst,
  toTargetLookupQuery,
  validateVoucherForm,
  type VoucherFormState,
} from "./voucherEntryLogic";

const vendorOption: VoucherTargetOptionResponse = {
  kindCode: VoucherTargetKindCodes.party,
  accountId: null,
  partyId: "11111111-1111-1111-1111-111111111111",
  code: "10300001",
  title: "Zubair Umair Shoes",
  typeTitle: "Vendor",
  balanceAmount: 60_000,
  balanceSideCode: "CREDIT",
};
const customerOption: VoucherTargetOptionResponse = { ...vendorOption, partyId: "22222222-2222-2222-2222-222222222222", title: "A Customer", typeTitle: "Customer" };
const cashOption: VoucherTargetOptionResponse = {
  kindCode: VoucherTargetKindCodes.account,
  accountId: "33333333-3333-3333-3333-333333333333",
  partyId: null,
  code: "CASH-S1",
  title: "Cash in hand",
  typeTitle: "Cash",
  balanceAmount: 0,
  balanceSideCode: "DEBIT",
};

function paymentForm(overrides: Partial<VoucherFormState> = {}): VoucherFormState {
  return {
    ...createEmptyVoucherForm(VoucherTypeCodes.payment, "store-1", "2026-11-20"),
    debit: { typeCode: VoucherTargetTypeCodes.vendor, option: vendorOption },
    credit: { typeCode: VoucherTargetTypeCodes.account, option: cashOption },
    amount: 60_000,
    ...overrides,
  };
}

describe("voucher form defaults", () => {
  it("starts each voucher type on the box types of the docx examples", () => {
    expect(defaultTargetTypes(VoucherTypeCodes.payment)).toEqual({ debit: "VENDOR", credit: "ACCOUNT" });
    expect(defaultTargetTypes(VoucherTypeCodes.receipt)).toEqual({ debit: "ACCOUNT", credit: "CUSTOMER" });
    expect(defaultTargetTypes(VoucherTypeCodes.expense)).toEqual({ debit: "ACCOUNT", credit: "ACCOUNT" });
    expect(defaultTargetTypes(VoucherTypeCodes.journal)).toEqual({ debit: "ACCOUNT", credit: "ACCOUNT" });
  });

  it("shows the From box first only on the receipt voucher", () => {
    expect(showsFromBoxFirst(VoucherTypeCodes.receipt)).toBe(true);
    expect(showsFromBoxFirst(VoucherTypeCodes.payment)).toBe(false);
  });

  it("offers the print tick box and the payment type only where the docx has them", () => {
    expect(offersPrintAfterSaving(VoucherTypeCodes.payment)).toBe(true);
    expect(offersPrintAfterSaving(VoucherTypeCodes.receipt)).toBe(true);
    expect(offersPrintAfterSaving(VoucherTypeCodes.expense)).toBe(false);
    expect(offersPrintAfterSaving(VoucherTypeCodes.journal)).toBe(false);
    expect(offersPaymentMode(VoucherTypeCodes.expense)).toBe(false);
  });

  it("creates an empty form for today with nothing chosen yet", () => {
    const form = createEmptyVoucherForm(VoucherTypeCodes.receipt, "store-1", "2026-11-20");
    expect(form.voucherDate).toBe("2026-11-20");
    expect(form.amount).toBeNull();
    expect(form.debit.option).toBeNull();
    expect(form.paymentMode).toBe("CASH");
    expect(createEmptyVoucherForm(VoucherTypeCodes.journal, "store-1", "2026-11-20").paymentMode).toBeNull();
  });

  it("asks the server for accounts or for one kind of party", () => {
    expect(toTargetLookupQuery(VoucherTargetTypeCodes.account)).toEqual({ kindCode: "ACCOUNT" });
    expect(toTargetLookupQuery(VoucherTargetTypeCodes.vendor)).toEqual({ kindCode: "PARTY", partyTypeCode: "VENDOR" });
  });
});

describe("voucher form validation", () => {
  it("accepts a complete payment", () => {
    expect(validateVoucherForm(paymentForm())).toEqual({});
  });

  it("asks for what is missing", () => {
    const errors = validateVoucherForm(createEmptyVoucherForm(VoucherTypeCodes.payment, "", ""));
    expect(errors.storeId).toBe("accounting.voucher.error.storeRequired");
    expect(errors.voucherDate).toBe("fields.invalidDate");
    expect(errors.debit).toBe("accounting.voucher.error.toRequired");
    expect(errors.credit).toBe("accounting.voucher.error.fromRequired");
    expect(errors.amount).toBe("accounting.voucher.error.amountRequired");
    expect(hasVoucherFormErrors(errors)).toBe(true);
  });

  it("refuses an amount that is zero, negative or not a whole number of rupees", () => {
    for (const amount of [0, -5, 12.5, Number.NaN]) {
      expect(validateVoucherForm(paymentForm({ amount })).amount).toBe("accounting.voucher.error.amountRequired");
    }
  });

  it("refuses the same account or party on both sides", () => {
    const sameAccount = paymentForm({ debit: { typeCode: VoucherTargetTypeCodes.account, option: cashOption } });
    expect(validateVoucherForm(sameAccount).credit).toBe("accounting.voucher.error.sameBothSides");
  });

  it("refuses two parties against each other because an account has to sit between them", () => {
    const twoParties = paymentForm({ credit: { typeCode: VoucherTargetTypeCodes.customer, option: customerOption } });
    expect(validateVoucherForm(twoParties).credit).toBe("accounting.voucher.error.twoParties");
  });

  it("refuses an impossible calendar date", () => {
    expect(validateVoucherForm(paymentForm({ voucherDate: "2026-02-30" })).voucherDate).toBe("fields.invalidDate");
  });
});

describe("the request sent to the server", () => {
  it("names a party by party id and an account by account id, with whole rupees", () => {
    const request = buildPostVoucherRequest(paymentForm({ referenceNumber: "  CHQ-77 ", description: " Rent " }), "tx-1");
    expect(request).toEqual({
      storeId: "store-1",
      voucherDate: "2026-11-20",
      debitTarget: { accountId: null, partyId: vendorOption.partyId },
      creditTarget: { accountId: cashOption.accountId, partyId: null },
      amount: 60_000,
      paymentMode: "CASH",
      referenceNumber: "CHQ-77",
      description: "Rent",
      allocations: null,
      clientTransactionId: "tx-1",
    });
  });

  it("sends empty texts as null and keeps the client transaction id for a retry", () => {
    const first = buildPostVoucherRequest(paymentForm(), "tx-same");
    const retry = buildPostVoucherRequest(paymentForm(), "tx-same");
    expect(first.referenceNumber).toBeNull();
    expect(first.description).toBeNull();
    expect(retry.clientTransactionId).toBe(first.clientTransactionId);
  });

  it("refuses to build a request from an unvalidated form", () => {
    expect(() => buildPostVoucherRequest(createEmptyVoucherForm(VoucherTypeCodes.payment, "store-1", "2026-11-20"), "tx")).toThrow();
  });
});
