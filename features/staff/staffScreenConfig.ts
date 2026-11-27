import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { ContactScreenConfig } from "@/features/contacts/types/contactScreenConfig";

// What makes the staff screens different from the other two kinds of contact: endpoints, permissions, routes and names.
export const staffScreenConfig: ContactScreenConfig = {
  kind: "staff",
  messagePrefix: "staff",
  endpoints: {
    list: ApiEndpoints.staffMembers.list,
    lookup: ApiEndpoints.staffMembers.lookup,
    byId: ApiEndpoints.staffMembers.byId,
    ledger: ApiEndpoints.staffLedger.ledger,
  },
  ledgerContactQueryName: "staffId",
  permissions: {
    add: PermissionCodes.HUMAN_RESOURCES.NEW_STAFF.ADD,
    edit: PermissionCodes.HUMAN_RESOURCES.NEW_STAFF.EDIT,
    remove: PermissionCodes.HUMAN_RESOURCES.VIEW_STAFF.DELETE,
    accountDetailView: PermissionCodes.HUMAN_RESOURCES.STAFF_ACCOUNT_DETAIL.VIEW,
    accountDetailPrint: PermissionCodes.HUMAN_RESOURCES.STAFF_ACCOUNT_DETAIL.PRINT,
  },
  routes: {
    newContact: ApplicationRoutes.newStaffMember,
    editContact: ApplicationRoutes.editStaffMember,
    viewContacts: ApplicationRoutes.viewStaffMembers,
    accountDetail: ApplicationRoutes.staffAccountDetail,
  },
  titleMessageKeys: {
    newContact: "navigation.item.newStaffMember",
    viewContacts: "navigation.item.viewStaffMembers",
    accountDetail: "navigation.item.staffAccountDetail",
  },
  offlineCacheName: "staffView",
};
