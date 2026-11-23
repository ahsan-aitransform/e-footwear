// The words on a printed sale document. They follow the PRINT language chosen for the paper (English or Urdu), not the language of the screen: a
// cashier working in English can still hand an Urdu receipt to the customer. All Urdu wording is a draft for a native speaker to review.
import { SaleDocumentTypeCodes, SalePrintLanguageCodes, type SalePrintLanguageCode } from "../types/saleTypes";

export type SalePrintLabelKey =
  | "saleInvoice"
  | "returnInvoice"
  | "exchangeSale"
  | "exchangeReturn"
  | "gatePass"
  | "invoiceNumber"
  | "dailyBillNumber"
  | "date"
  | "customer"
  | "salesman"
  | "originalInvoice"
  | "code"
  | "product"
  | "size"
  | "quantity"
  | "price"
  | "discountPercent"
  | "discountPerUnit"
  | "lineTotal"
  | "totalQuantity"
  | "grossBill"
  | "discount"
  | "netBill"
  | "paid"
  | "cashReturned"
  | "balanceDue"
  | "payments"
  | "voided"
  | "authorisedBy"
  | "receivedBy"
  | "thankYou"
  | "phone"
  | "reason";

const englishLabels: Record<SalePrintLabelKey, string> = {
  saleInvoice: "Sale Invoice",
  returnInvoice: "Sale Return",
  exchangeSale: "Exchange (new items)",
  exchangeReturn: "Exchange (returned items)",
  gatePass: "Gate Pass",
  invoiceNumber: "Invoice #",
  dailyBillNumber: "Daily Bill #",
  date: "Date",
  customer: "Customer",
  salesman: "Salesman",
  originalInvoice: "Original invoice",
  code: "Code",
  product: "Product",
  size: "Size",
  quantity: "Qty",
  price: "Price",
  discountPercent: "Dis %",
  discountPerUnit: "Disc/Unit",
  lineTotal: "Total",
  totalQuantity: "Total Qty",
  grossBill: "Gross Bill",
  discount: "Discount",
  netBill: "Net Bill",
  paid: "Paid",
  cashReturned: "Cash Return",
  balanceDue: "Balance Due",
  payments: "Payments",
  voided: "VOID",
  authorisedBy: "Authorised by",
  receivedBy: "Received by",
  thankYou: "Thank you for shopping with us",
  phone: "Phone",
  reason: "Reason",
};

const urduLabels: Record<SalePrintLabelKey, string> = {
  saleInvoice: "فروخت انوائس",
  returnInvoice: "فروخت کی واپسی",
  exchangeSale: "تبادلہ (نئی اشیاء)",
  exchangeReturn: "تبادلہ (واپس کی گئی اشیاء)",
  gatePass: "گیٹ پاس",
  invoiceNumber: "انوائس نمبر",
  dailyBillNumber: "روزانہ بل نمبر",
  date: "تاریخ",
  customer: "گاہک",
  salesman: "سیلز مین",
  originalInvoice: "اصل انوائس",
  code: "کوڈ",
  product: "پروڈکٹ",
  size: "سائز",
  quantity: "تعداد",
  price: "قیمت",
  discountPercent: "رعایت %",
  discountPerUnit: "رعایت/یونٹ",
  lineTotal: "کل",
  totalQuantity: "کل تعداد",
  grossBill: "کل بل",
  discount: "رعایت",
  netBill: "قابل ادا بل",
  paid: "ادا شدہ",
  cashReturned: "واپس کی گئی رقم",
  balanceDue: "باقی رقم",
  payments: "ادائیگیاں",
  voided: "منسوخ",
  authorisedBy: "منظور کنندہ",
  receivedBy: "وصول کنندہ",
  thankYou: "ہم سے خریداری کا شکریہ",
  phone: "فون",
  reason: "وجہ",
};

export function getSalePrintLabel(languageCode: SalePrintLanguageCode, key: SalePrintLabelKey): string {
  return (languageCode === SalePrintLanguageCodes.urdu ? urduLabels : englishLabels)[key];
}

export function getInvoiceTitleLabelKey(documentTypeCode: string, isPartOfExchange: boolean): SalePrintLabelKey {
  if (documentTypeCode === SaleDocumentTypeCodes.return) return isPartOfExchange ? "exchangeReturn" : "returnInvoice";
  return isPartOfExchange ? "exchangeSale" : "saleInvoice";
}
