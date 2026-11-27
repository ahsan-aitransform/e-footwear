"use client";

import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { staffScreenConfig } from "../staffScreenConfig";

// View Staff: edit and delete.
export function ViewStaffPage() {
  return <ContactListPage config={staffScreenConfig} />;
}
