import { VoucherEntryPage } from "@/features/accounting/pages/VoucherEntryPage";

// /voucher/receipt: Receipt Voucher (docx 6.2).
export default function ReceiptVoucherRoutePage() {
  return <VoucherEntryPage voucherTypeCode="RECEIPT" />;
}
