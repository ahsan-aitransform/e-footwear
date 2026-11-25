"use client";

import { ContactAccountDetailPage } from "@/features/contacts/pages/ContactAccountDetailPage";
import { customerScreenConfig } from "../customerScreenConfig";

// Customer Account Detail: the ledger of one customer.
export function CustomerAccountDetailPage() {
  return <ContactAccountDetailPage config={customerScreenConfig} />;
}
