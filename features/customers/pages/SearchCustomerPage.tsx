"use client";

import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { customerScreenConfig } from "../customerScreenConfig";

// Search Customer: find one and open the account detail.
export function SearchCustomerPage() {
  return <ContactListPage config={customerScreenConfig} mode="search" />;
}
