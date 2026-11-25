"use client";

import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { staffScreenConfig } from "../staffScreenConfig";

// Search Staff: find one and open the account detail.
export function SearchStaffPage() {
  return <ContactListPage config={staffScreenConfig} mode="search" />;
}
