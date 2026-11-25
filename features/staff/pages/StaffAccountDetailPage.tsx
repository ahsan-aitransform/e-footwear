"use client";

import { ContactAccountDetailPage } from "@/features/contacts/pages/ContactAccountDetailPage";
import { staffScreenConfig } from "../staffScreenConfig";

// Staff Account Detail: the ledger of one staff.
export function StaffAccountDetailPage() {
  return <ContactAccountDetailPage config={staffScreenConfig} />;
}
