// "Edit" of a posted sale = void and re-enter (Part 11). A posted invoice is never changed in place: View Invoices prepares a New Sale entry that holds the
// same items, the same customer and the same payments, and the cashier corrects it. Saving then voids the old invoice (with the reason) and posts the
// corrected sale in one transaction, so the old invoice stays in the history as a deleted invoice.
import type { SaleEntryDraft } from "./saleEntryDraftTypes";
import type { SaleEntryLine } from "./saleEntryLines";
import { SaleLineDiscountTypeCodes, type SaleInvoiceResponse, type SaleItemResponse } from "../types/saleTypes";

function itemFromInvoiceLine(line: SaleInvoiceResponse["lines"][number]): SaleItemResponse {
  return {
    variantId: line.variantId,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    productNameUrdu: line.productNameUrdu,
    unitName: line.unitName,
    sizeCode: line.sizeCode,
    colorName: null,
    barcode: line.barcode,
    // The stock of the item is not part of an invoice. The sale being corrected already holds these pieces; the server checks the real stock when it saves.
    stockQuantity: line.quantity,
    listPrice: line.listPrice,
    suggestedUnitPrice: line.listPrice,
    promotionDiscountPerUnit: 0,
    hasPromotionConflict: false,
    taxRatePercentage: 0,
    hasPicture: false,
  };
}

export function buildCorrectionDraft(invoice: SaleInvoiceResponse, clientTransactionId: string, createKey: () => string): SaleEntryDraft {
  const lines: SaleEntryLine[] = invoice.lines.map((line) => {
    const discountPerUnit = line.listPrice - line.unitPrice;
    return {
      lineKey: createKey(),
      item: itemFromInvoiceLine(line),
      quantity: line.quantity,
      unitPrice: line.listPrice,
      // Whatever lowered the price on the original (a promotion, a typed discount) is carried as a rupee discount per unit that the cashier can change.
      discountTypeCode: discountPerUnit > 0 ? SaleLineDiscountTypeCodes.amount : SaleLineDiscountTypeCodes.none,
      discountValue: discountPerUnit > 0 ? discountPerUnit : null,
    };
  });
  return {
    clientTransactionId,
    header: {
      saleDate: invoice.saleDate,
      customer: invoice.customerPartyId
        ? { partyId: invoice.customerPartyId, code: "", name: invoice.customerName ?? "", phoneNumber: null, balanceAmount: 0, creditLimitAmount: null }
        : null,
      salesmanPartyId: invoice.salesmanPartyId,
      walkInCustomerName: invoice.walkInCustomerName ?? "",
      walkInCustomerMobile: invoice.walkInCustomerMobile ?? "",
      posTerminalDeviceId: null,
      description: invoice.description ?? "",
    },
    lines,
    paymentRows: invoice.payments.map((payment) => ({
      rowKey: createKey(),
      paymentMethodCode: payment.paymentMethodCode,
      paymentAccountId: payment.paymentAccountId,
      receivedAmount: payment.amount,
      referenceNumber: payment.referenceNumber ?? "",
    })),
    printOverrides: {},
    invoiceBeingCorrected: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    voidReason: "",
  };
}
