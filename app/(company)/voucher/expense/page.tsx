import { VoucherEntryPage } from "@/features/accounting/pages/VoucherEntryPage";

// /voucher/expense: Expense Voucher (docx 6.3).
export default function ExpenseVoucherRoutePage() {
  return <VoucherEntryPage voucherTypeCode="EXPENSE" />;
}
