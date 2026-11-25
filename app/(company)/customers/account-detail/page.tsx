import { Suspense } from "react";
import { CustomerAccountDetailPage } from "@/features/customers/pages/CustomerAccountDetailPage";

// /customers/account-detail: the ledger of one customer (?customerId= opens a given one). The Suspense boundary is needed
// because the page reads the query string.
export default function CustomerAccountDetailRoutePage() {
  return (
    <Suspense>
      <CustomerAccountDetailPage />
    </Suspense>
  );
}
