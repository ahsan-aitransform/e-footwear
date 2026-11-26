import type { PermissionCode } from "@/lib/contracts/permissionCodes";
import type { ContactKind } from "./contactTypes";

// Everything that differs between the customer, vendor and staff screens. The shared pages read it, so a screen
// is one small file per kind (features/customers/customerScreenConfig.ts and so on).
export type ContactScreenConfig = {
  kind: ContactKind;
  // Prefix of the message keys of this kind: customers.*, vendors.* or staff.*.
  messagePrefix: "customers" | "vendors" | "staff";
  endpoints: {
    list: string;
    search: string;
    lookup: string;
    byId: (contactId: string) => string;
    ledger: string;
  };
  // The query-string name of the contact on the ledger endpoint: customerId, vendorId or staffId.
  ledgerContactQueryName: "customerId" | "vendorId" | "staffId";
  permissions: {
    add: PermissionCode;
    edit: PermissionCode;
    remove: PermissionCode;
    accountDetailView: PermissionCode;
    accountDetailPrint: PermissionCode;
  };
  // A kind without one of the optional screens leaves it out (customers have View Customers only).
  routes: {
    newContact?: string;
    editContact?: (contactId: string) => string;
    viewContacts: string;
    accountDetail?: string;
  };
  titleMessageKeys: { newContact?: string; viewContacts: string; searchContacts?: string; accountDetail?: string };
  offlineCacheNames: { view: string; search: string };
};
