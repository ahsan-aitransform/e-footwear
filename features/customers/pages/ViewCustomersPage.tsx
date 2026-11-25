"use client";

import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { customerScreenConfig } from "../customerScreenConfig";

// View Customers: edit and delete.
export function ViewCustomersPage() {
  return <ContactListPage config={customerScreenConfig} mode="manage" />;
}
