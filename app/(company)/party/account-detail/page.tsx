import { Suspense } from "react";
import { PartyAccountDetailPage } from "@/features/parties/pages/PartyAccountDetailPage";

// /party/account-detail: the ledger of one party (?partyId= opens a given party). The Suspense boundary is needed
// because the page reads the query string.
export default function PartyAccountDetailRoutePage() {
  return (
    <Suspense fallback={null}>
      <PartyAccountDetailPage />
    </Suspense>
  );
}
