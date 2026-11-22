import type { MessageKey } from "@/lib/i18n/messageKeys";

// The document types of the stock ledger (database inv.stock_ledger.doc_type) and the message that names each one.
const messageKeyByDocumentType: Record<string, MessageKey> = {
  OPENING: "catalogue.documentType.opening",
  SALE: "catalogue.documentType.sale",
  SALE_RETURN: "catalogue.documentType.saleReturn",
  SALE_VOID: "catalogue.documentType.saleVoid",
  PURCHASE: "catalogue.documentType.purchase",
  PURCHASE_RETURN: "catalogue.documentType.purchaseReturn",
  ADJUSTMENT: "catalogue.documentType.adjustment",
  AUDIT: "catalogue.documentType.audit",
  CLAIM: "catalogue.documentType.claim",
  TRANSFER_OUT: "catalogue.documentType.transferOut",
  TRANSFER_IN: "catalogue.documentType.transferIn",
  TRANSFER_FOUND: "catalogue.documentType.transferFound",
};

// Null for a type this version does not know: the screen then shows the code as it is.
export function ledgerDocumentTypeMessageKey(documentType: string): MessageKey | null {
  return messageKeyByDocumentType[documentType] ?? null;
}
