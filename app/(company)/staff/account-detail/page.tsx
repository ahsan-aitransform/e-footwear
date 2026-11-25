import { Suspense } from "react";
import { StaffAccountDetailPage } from "@/features/staff/pages/StaffAccountDetailPage";

// /staff/account-detail: the ledger of one staff (?staffId= opens a given one). The Suspense boundary is needed
// because the page reads the query string.
export default function StaffAccountDetailRoutePage() {
  return (
    <Suspense>
      <StaffAccountDetailPage />
    </Suspense>
  );
}
