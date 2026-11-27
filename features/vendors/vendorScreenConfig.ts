import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { ContactScreenConfig } from "@/features/contacts/types/contactScreenConfig";

// What makes the vendors screens different from the other two kinds of contact: endpoints, permissions, routes and names.
export const vendorScreenConfig: ContactScreenConfig = {
  kind: "vendor",
  messagePrefix: "vendors",
  endpoints: {
    list: ApiEndpoints.vendors.list,
    lookup: ApiEndpoints.vendors.lookup,
    byId: ApiEndpoints.vendors.byId,
    ledger: ApiEndpoints.vendorLedger.ledger,
  },
  ledgerContactQueryName: "vendorId",
  permissions: {
    add: PermissionCodes.VENDORS.NEW_VENDOR.ADD,
    edit: PermissionCodes.VENDORS.NEW_VENDOR.EDIT,
    remove: PermissionCodes.VENDORS.VIEW_VENDORS.DELETE,
    accountDetailView: PermissionCodes.VENDORS.VENDOR_ACCOUNT_DETAIL.VIEW,
    accountDetailPrint: PermissionCodes.VENDORS.VENDOR_ACCOUNT_DETAIL.PRINT,
  },
  routes: {
    newContact: ApplicationRoutes.newVendor,
    editContact: ApplicationRoutes.editVendor,
    viewContacts: ApplicationRoutes.viewVendors,
    accountDetail: ApplicationRoutes.vendorAccountDetail,
  },
  titleMessageKeys: {
    newContact: "navigation.item.newVendor",
    viewContacts: "navigation.item.viewVendors",
    accountDetail: "navigation.item.vendorAccountDetail",
  },
  offlineCacheName: "vendorsView",
};
