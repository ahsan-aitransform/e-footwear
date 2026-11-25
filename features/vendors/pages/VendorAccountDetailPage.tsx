"use client";

import { ContactAccountDetailPage } from "@/features/contacts/pages/ContactAccountDetailPage";
import { vendorScreenConfig } from "../vendorScreenConfig";

// Vendor Account Detail: the ledger of one vendor.
export function VendorAccountDetailPage() {
  return <ContactAccountDetailPage config={vendorScreenConfig} />;
}
