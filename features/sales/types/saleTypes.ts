// The shapes of the Sales API (backend: EFootwear.BLL/Sales/Contracts). Money is whole rupees (an integer number); a quantity has at most 3 decimals and
// travels as a number. On a RETURN invoice the quantity and the amounts are negative, exactly as stored.

export const SaleDocumentTypeCodes = { sale: "SALE", return: "RETURN" } as const;
export type SaleDocumentTypeCode = (typeof SaleDocumentTypeCodes)[keyof typeof SaleDocumentTypeCodes];

export const SaleInvoiceStatusCodes = { posted: "POSTED", void: "VOID" } as const;
export type SaleInvoiceStatusCode = (typeof SaleInvoiceStatusCodes)[keyof typeof SaleInvoiceStatusCodes];

export const SaleLineDiscountTypeCodes = { none: "NONE", percent: "PERCENT", amount: "AMOUNT" } as const;
export type SaleLineDiscountTypeCode = (typeof SaleLineDiscountTypeCodes)[keyof typeof SaleLineDiscountTypeCodes];

export const ReturnedItemConditionCodes = { sellable: "SELLABLE", damaged: "DAMAGED" } as const;
export type ReturnedItemConditionCode = (typeof ReturnedItemConditionCodes)[keyof typeof ReturnedItemConditionCodes];

export const SalePaymentMethodCodes = { cash: "CASH", card: "CARD", bankTransfer: "BANK_TRANSFER", cheque: "CHEQUE", online: "ONLINE" } as const;
export type SalePaymentMethodCode = (typeof SalePaymentMethodCodes)[keyof typeof SalePaymentMethodCodes];

export const SalePrintFormatCodes = { thermal: "THERMAL", a4: "A4", a5: "A5" } as const;
export type SalePrintFormatCode = (typeof SalePrintFormatCodes)[keyof typeof SalePrintFormatCodes];

export const SalePrintLanguageCodes = { english: "en", urdu: "ur" } as const;
export type SalePrintLanguageCode = (typeof SalePrintLanguageCodes)[keyof typeof SalePrintLanguageCodes];

export type SaleLineRequest = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  discountTypeCode: SaleLineDiscountTypeCode | null;
  discountValue: number | null;
};

// Each payment amount is what STAYS in the shop (cash received minus the change); the change travels separately as cashReturnedAmount.
export type SalePaymentRequest = {
  paymentMethodCode: SalePaymentMethodCode;
  paymentAccountId: string;
  amount: number;
  referenceNumber: string | null;
};

export type CreateSaleInvoiceRequest = {
  storeId: string;
  saleDate: string;
  clientTransactionId: string;
  customerId: string | null;
  salesmanStaffId: string | null;
  walkInCustomerName: string | null;
  walkInCustomerMobile: string | null;
  posTerminalDeviceId: string | null;
  description: string | null;
  lines: SaleLineRequest[];
  payments: SalePaymentRequest[];
  cashReturnedAmount: number;
};

export type ReturnedLineRequest = {
  originalLineId: string;
  quantity: number;
  reasonText: string | null;
  itemConditionCode: ReturnedItemConditionCode | null;
};

// One earlier posted invoice of a customer (the purchase history of New Sale). On a RETURN the quantities and the amounts are negative.
export type SaleCustomerPurchaseResponse = {
  invoiceId: string;
  storeName: string;
  documentTypeCode: SaleDocumentTypeCode;
  invoiceNumber: number;
  saleDate: string;
  netAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  lines: {
    lineId: string;
    productName: string;
    sizeCode: string;
    colorName: string | null;
    quantity: number;
    unitPrice: number;
    netAmount: number;
  }[];
};

export type CreateSaleReturnRequest = {
  storeId: string;
  returnDate: string;
  clientTransactionId: string;
  customerId: string | null;
  description: string | null;
  lines: ReturnedLineRequest[];
};

export type CreateExchangeRequest = {
  storeId: string;
  exchangeDate: string;
  clientTransactionId: string;
  customerId: string | null;
  salesmanStaffId: string | null;
  walkInCustomerName: string | null;
  walkInCustomerMobile: string | null;
  posTerminalDeviceId: string | null;
  description: string | null;
  returnedLines: ReturnedLineRequest[];
  newSaleLines: SaleLineRequest[];
  payments: SalePaymentRequest[];
  cashReturnedAmount: number;
};

export type VoidSaleInvoiceRequest = { reason: string };
export type VoidAndReenterSaleRequest = { voidReason: string; correctedSale: CreateSaleInvoiceRequest };

export type SaleInvoiceLineResponse = {
  lineId: string;
  lineNumber: number;
  variantId: string;
  productId: string;
  productCode: string;
  productName: string;
  productNameUrdu: string | null;
  unitName: string | null;
  sizeCode: string;
  barcode: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  discountPerUnit: number;
  discountPercent: number;
  discountAmount: number;
  netAmount: number;
  discountSourceCode: string;
  originalLineId: string | null;
  originalInvoiceNumber: number | null;
  returnReason: string | null;
  itemConditionCode: ReturnedItemConditionCode | null;
};

export type SaleInvoicePaymentResponse = {
  id: string;
  paymentMethodCode: SalePaymentMethodCode;
  paymentAccountId: string;
  paymentAccountTitle: string;
  amount: number;
  referenceNumber: string | null;
};

export type SaleInvoiceResponse = {
  id: string;
  storeId: string;
  storeName: string;
  documentTypeCode: SaleDocumentTypeCode;
  invoiceNumber: number;
  dailyBillNumber: number | null;
  saleDate: string;
  occurredAt: string;
  customerId: string | null;
  customerName: string | null;
  walkInCustomerName: string | null;
  walkInCustomerMobile: string | null;
  salesmanStaffId: string | null;
  salesmanName: string | null;
  posTerminalLabel: string | null;
  description: string | null;
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  cashReturnedAmount: number;
  outstandingAmount: number;
  statusCode: SaleInvoiceStatusCode;
  voidReason: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
  createdByName: string | null;
  originalInvoiceId: string | null;
  originalInvoiceNumber: number | null;
  relatedInvoiceId: string | null;
  relatedInvoiceNumber: number | null;
  replacesInvoiceId: string | null;
  replacesInvoiceNumber: number | null;
  rowVersion: number;
  lines: SaleInvoiceLineResponse[];
  payments: SaleInvoicePaymentResponse[];
};

export type SaleInvoiceListItemResponse = {
  id: string;
  storeId: string;
  storeName: string;
  documentTypeCode: SaleDocumentTypeCode;
  invoiceNumber: number;
  dailyBillNumber: number | null;
  saleDate: string;
  customerName: string | null;
  walkInCustomerName: string | null;
  salesmanName: string | null;
  netAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  statusCode: SaleInvoiceStatusCode;
  isPartOfExchange: boolean;
  voidReason: string | null;
  voidedAt: string | null;
  voidedByName: string | null;
};

export type SaleItemResponse = {
  variantId: string;
  productId: string;
  productCode: string;
  productName: string;
  productNameUrdu: string | null;
  unitName: string | null;
  sizeCode: string;
  colorName: string | null;
  barcode: string;
  stockQuantity: number;
  listPrice: number;
  suggestedUnitPrice: number;
  promotionDiscountPerUnit: number;
  hasPromotionConflict: boolean;
  taxRatePercentage: number;
  hasPicture: boolean;
};

export type ReturnableSaleLineResponse = {
  lineId: string;
  lineNumber: number;
  invoiceId: string;
  invoiceNumber: number;
  variantId: string;
  productCode: string;
  productName: string;
  productNameUrdu: string | null;
  unitName: string | null;
  sizeCode: string;
  barcode: string;
  soldQuantity: number;
  alreadyReturnedQuantity: number;
  returnableQuantity: number;
  listPrice: number;
  unitPrice: number;
  discountPerUnit: number;
  discountPercent: number;
};

export type ReturnableInvoiceResponse = {
  invoiceId: string;
  invoiceNumber: number;
  storeId: string;
  saleDate: string;
  customerId: string | null;
  customerName: string | null;
  walkInCustomerName: string | null;
  lines: ReturnableSaleLineResponse[];
};

export type SaleCustomerLookupResponse = {
  customerId: string;
  code: string;
  name: string;
  phoneNumber: string | null;
  balanceAmount: number;
};

export type SaleSalesmanLookupResponse = { staffId: string; code: string; name: string; isManager: boolean };
export type SalePaymentAccountResponse = { accountId: string; code: string; title: string; kindCode: "CASH" | "BANK"; storeId: string };
export type SalePosTerminalResponse = { deviceId: string; label: string };
export type SalePaymentMethodResponse = { code: SalePaymentMethodCode; displayNameEnglish: string; displayNameUrdu: string | null };

export type SaleBusinessHeaderResponse = {
  businessName: string;
  businessNameUrdu: string | null;
  storeName: string;
  phoneNumber: string | null;
  mobileNumber: string | null;
  email: string | null;
  addressEnglish: string | null;
  addressUrdu: string | null;
  invoiceText: string | null;
  hasLogo: boolean;
};

export type SalePrintDefaultsResponse = {
  printFormatCode: SalePrintFormatCode;
  printLanguageCode: SalePrintLanguageCode;
  printRightToLeft: boolean;
  printLogoOnDocuments: boolean;
  receiptCopies: number;
};

export type SaleEntryContextResponse = {
  storeId: string;
  storeName: string;
  businessDate: string;
  nextInvoiceNumber: number;
  nextDailyBillNumber: number;
  nextReturnInvoiceNumber: number;
  todaySaleAmount: number;
  roundingModeCode: "FLOOR" | "NEAREST";
  maximumManualDiscountPercentage: number | null;
  paymentMethods: SalePaymentMethodResponse[];
  businessHeader: SaleBusinessHeaderResponse;
  printDefaults: SalePrintDefaultsResponse;
};

export type SalePrintDocumentResponse = {
  businessHeader: SaleBusinessHeaderResponse;
  printDefaults: SalePrintDefaultsResponse;
  invoice: SaleInvoiceResponse;
};

export type ExchangeResponse = { returnInvoice: SaleInvoiceResponse; saleInvoice: SaleInvoiceResponse };
export type VoidSaleInvoiceResponse = { invoice: SaleInvoiceResponse; voidedInvoiceCount: number };
export type VoidAndReenterSaleResponse = { voidedInvoice: SaleInvoiceResponse; correctedInvoice: SaleInvoiceResponse };
