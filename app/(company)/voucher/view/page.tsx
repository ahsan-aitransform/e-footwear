import { Suspense } from "react";
import { ViewVoucherPage } from "@/features/accounting/pages/ViewVoucherPage";

// /voucher/view: View Voucher (docx 6.5). The page reads ?type=&number=&storeId=, so it sits inside Suspense.
export default function ViewVoucherRoutePage() {
  return (
    <Suspense>
      <ViewVoucherPage />
    </Suspense>
  );
}
