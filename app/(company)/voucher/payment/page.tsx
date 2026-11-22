import { VoucherEntryPage } from "@/features/accounting/pages/VoucherEntryPage";

// /voucher/payment: Payment Voucher (docx 6.1).
export default function PaymentVoucherRoutePage() {
  return <VoucherEntryPage voucherTypeCode="PAYMENT" />;
}
