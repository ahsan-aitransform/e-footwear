import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { ContactScreenConfig } from "@/features/contacts/types/contactScreenConfig";

// What makes the customers screens different from the other two kinds of contact: endpoints, permissions, routes and names.
export const customerScreenConfig: ContactScreenConfig = {
  kind: "customer",
  messagePrefix: "customers",
  endpoints: {
    list: ApiEndpoints.customers.list,
    search: ApiEndpoints.customers.search,
    lookup: ApiEndpoints.customers.lookup,
    byId: ApiEndpoints.customers.byId,
    ledger: ApiEndpoints.customerLedger.ledger,
  },
  ledgerContactQueryName: "customerId",
  permissions: {
    add: PermissionCodes.CUSTOMERS.NEW_CUSTOMER.ADD,
    edit: PermissionCodes.CUSTOMERS.NEW_CUSTOMER.EDIT,
    remove: PermissionCodes.CUSTOMERS.VIEW_CUSTOMERS.DELETE,
    accountDetailView: PermissionCodes.CUSTOMERS.CUSTOMER_ACCOUNT_DETAIL.VIEW,
    accountDetailPrint: PermissionCodes.CUSTOMERS.CUSTOMER_ACCOUNT_DETAIL.PRINT,
  },
  // View Customers is the only customers screen; adding and editing happen in a dialog.
  routes: { viewContacts: ApplicationRoutes.viewCustomers },
  titleMessageKeys: { viewContacts: "navigation.item.viewCustomers" },
  offlineCacheNames: { view: "customersView", search: "customersSearch" },
};
