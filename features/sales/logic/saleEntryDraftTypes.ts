// The shape of a sale entry kept in the browser (Part 23) and of the entry the View Invoices screen prepares when a posted sale is corrected
// ("void and re-enter"). One definition, used by the workspace hook and by the correction builder.
import type { SaleEntryLine } from "./saleEntryLines";
import type { SaleCustomerLookupResponse, SalePaymentMethodCode, SalePrintFormatCode, SalePrintLanguageCode } from "../types/saleTypes";

export type SaleHeaderState = {
  saleDate: string;
  customer: SaleCustomerLookupResponse | null;
  salesmanStaffId: string | null;
  walkInCustomerName: string;
  walkInCustomerMobile: string;
  posTerminalDeviceId: string | null;
  description: string;
};

export type PaymentRowState = {
  rowKey: string;
  paymentMethodCode: SalePaymentMethodCode;
  paymentAccountId: string;
  receivedAmount: number | null;
  referenceNumber: string;
};

export type SalePrintChoices = {
  formatCode: SalePrintFormatCode;
  languageCode: SalePrintLanguageCode;
  includeGatePass: boolean;
};

// Set while a posted sale is being corrected: saving then voids that invoice (with the reason) and posts this entry in one transaction.
export type InvoiceBeingCorrected = { invoiceId: string; invoiceNumber: number };

export type SaleEntryDraft = {
  clientTransactionId: string;
  header: SaleHeaderState;
  lines: SaleEntryLine[];
  paymentRows: PaymentRowState[];
  printOverrides: Partial<SalePrintChoices>;
  invoiceBeingCorrected: InvoiceBeingCorrected | null;
  voidReason: string;
};
