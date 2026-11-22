"use client";

import { useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import type { UserListItemResponse } from "@/lib/types/user";
import type { UserPermissionsResponse } from "@/lib/types/userManagement";
import {
  buildAssignableCodes,
  getQuickRightState,
  quickRightDefinitions,
  toggleQuickRight,
} from "../logic/permissionTreeSelection";
import { TriStateCheckbox } from "./TriStateCheckbox";

const quickRightMessageKeyByKey: Record<string, MessageKey> = {
  canEdit: "securityManagement.permissionTree.quickRight.canEdit",
  canDelete: "securityManagement.permissionTree.quickRight.canDelete",
  canPrint: "securityManagement.permissionTree.quickRight.canPrint",
  canChangePrice: "securityManagement.permissionTree.quickRight.canChangePrice",
  canGiveDiscount: "securityManagement.permissionTree.quickRight.canGiveDiscount",
};

// "Edit Partially" of the original Users Account screen: a small panel that changes only the status and the five rights
// (Can Edit, Can Delete, Can Print, Can Change Price, Can Give Discount) of one user. The full form is Edit.
export function PartialEditPanel({
  user,
  onClose,
  onSaved,
}: {
  user: UserListItemResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const { hasPermission, grantedPermissionCodes } = usePermissions();
  const canViewPermissions = hasPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.VIEW);
  const canEditPermissions = hasPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.EDIT);
  const canChangeStatus =
    hasPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.EDIT) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.ADMINISTRATION.USER_BLOCK);

  const catalogQuery = useApiQuery<PermissionCatalogResponse>(ApiEndpoints.permissions.catalog, { offlineCacheName: "permission-catalog" });
  const permissionsQuery = useApiQuery<UserPermissionsResponse>(ApiEndpoints.users.permissions(user.id), { enabled: canViewPermissions });

  const [isBlocked, setIsBlocked] = useState(user.status === "DISABLED");
  const [editedCodes, setEditedCodes] = useState<ReadonlySet<string> | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  const catalog = catalogQuery.data;
  const loadedCodes = permissionsQuery.data ? new Set(permissionsQuery.data.grantedPermissionCodes) : undefined;
  const currentCodes = editedCodes ?? loadedCodes;
  const holdsEverythingByRole = permissionsQuery.data?.holdsEveryPermissionByRole ?? false;
  const assignableCodes = catalog && loadedCodes ? buildAssignableCodes(catalog, grantedPermissionCodes, loadedCodes) : new Set<string>();
  const canEditRights = canViewPermissions && canEditPermissions && !holdsEverythingByRole && catalog !== undefined && currentCodes !== undefined;

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    try {
      const wasBlocked = user.status === "DISABLED";
      if (canChangeStatus && isBlocked !== wasBlocked) {
        const statusResult = await apiRequest(isBlocked ? ApiEndpoints.users.block(user.id) : ApiEndpoints.users.unblock(user.id), { method: "POST" });
        if (!statusResult.ok) {
          setErrorMessage(statusResult.problem.message);
          return;
        }
      }
      if (canEditRights && editedCodes) {
        const rightsResult = await apiRequest(ApiEndpoints.users.permissions(user.id), { method: "PUT", body: { permissionCodes: [...editedCodes] } });
        if (!rightsResult.ok) {
          setErrorMessage(rightsResult.problem.message);
          return;
        }
      }
      setSuccessMessage(translateMessage("securityManagement.partialEdit.saved"));
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard
      title={translateMessage("securityManagement.partialEdit.title", { userName: user.fullName })}
      description={translateMessage("securityManagement.partialEdit.description")}
    >
      <div className="space-y-4">
        {canChangeStatus && (
          <fieldset className="flex flex-wrap items-center gap-4">
            <legend className="text-sm font-medium">{translateMessage("securityManagement.partialEdit.statusLegend")}</legend>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="status" className="accent-primary" checked={!isBlocked} onChange={() => setIsBlocked(false)} />
              {translateMessage("common.status.active")}
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="status" className="accent-primary" checked={isBlocked} onChange={() => setIsBlocked(true)} />
              {translateMessage("securityManagement.partialEdit.blocked")}
            </label>
          </fieldset>
        )}

        {canEditRights && catalog && currentCodes && (
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="mb-1 text-sm font-medium">{translateMessage("securityManagement.permissionTree.quickRightsLegend")}</legend>
            {quickRightDefinitions.map((definition) => (
              <TriStateCheckbox
                key={definition.quickRightKey}
                label={translateMessage(quickRightMessageKeyByKey[definition.quickRightKey])}
                selectionState={getQuickRightState(catalog, definition, currentCodes, assignableCodes)}
                onToggle={() => setEditedCodes(toggleQuickRight(catalog, definition, currentCodes, assignableCodes))}
              />
            ))}
          </fieldset>
        )}

        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
        <div className="flex gap-2">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {translateMessage("securityManagement.partialEdit.save")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {translateMessage("securityManagement.partialEdit.close")}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
