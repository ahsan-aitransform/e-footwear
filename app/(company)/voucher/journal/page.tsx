import { VoucherEntryPage } from "@/features/accounting/pages/VoucherEntryPage";

// /voucher/journal: Journal Voucher (docx 6.4).
export default function JournalVoucherRoutePage() {
  return <VoucherEntryPage voucherTypeCode="JOURNAL" />;
}
