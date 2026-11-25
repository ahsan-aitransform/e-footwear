"use client";

import { ContactFormPage } from "@/features/contacts/pages/ContactFormPage";
import { staffScreenConfig } from "../staffScreenConfig";

// New Staff; with a staffId it edits that staff.
export function NewStaffPage({ staffId }: { staffId?: string }) {
  return <ContactFormPage config={staffScreenConfig} contactId={staffId} />;
}
