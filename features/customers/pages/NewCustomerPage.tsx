"use client";

import { ContactFormPage } from "@/features/contacts/pages/ContactFormPage";
import { customerScreenConfig } from "../customerScreenConfig";

// New Customer; with a customerId it edits that customer.
export function NewCustomerPage({ customerId }: { customerId?: string }) {
  return <ContactFormPage config={customerScreenConfig} contactId={customerId} />;
}
