import { Suspense } from "react";
import { VendorAccountDetailPage } from "@/features/vendors/pages/VendorAccountDetailPage";

// /vendors/account-detail: the ledger of one vendor (?vendorId= opens a given one). The Suspense boundary is needed
// because the page reads the query string.
export default function VendorAccountDetailRoutePage() {
  return (
    <Suspense>
      <VendorAccountDetailPage />
    </Suspense>
  );
}
