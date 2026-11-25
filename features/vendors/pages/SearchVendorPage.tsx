"use client";

import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { vendorScreenConfig } from "../vendorScreenConfig";

// Search Vendor: find one and open the account detail.
export function SearchVendorPage() {
  return <ContactListPage config={vendorScreenConfig} mode="search" />;
}
