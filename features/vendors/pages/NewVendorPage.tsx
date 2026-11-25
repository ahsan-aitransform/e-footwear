"use client";

import { ContactFormPage } from "@/features/contacts/pages/ContactFormPage";
import { vendorScreenConfig } from "../vendorScreenConfig";

// New Vendor; with a vendorId it edits that vendor.
export function NewVendorPage({ vendorId }: { vendorId?: string }) {
  return <ContactFormPage config={vendorScreenConfig} contactId={vendorId} />;
}
