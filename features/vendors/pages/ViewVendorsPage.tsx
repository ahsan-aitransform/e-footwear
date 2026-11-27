"use client";

import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { vendorScreenConfig } from "../vendorScreenConfig";

// View Vendors: edit and delete.
export function ViewVendorsPage() {
  return <ContactListPage config={vendorScreenConfig} />;
}
