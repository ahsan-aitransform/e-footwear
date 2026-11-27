"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SearchButton } from "@/components/forms/SearchButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import type { AccountGroupResponse, AccountMainTypeResponse, UpdateAccountGroupRequest } from "../types/chartOfAccountsTypes";

// View Second Level (docx 2.3): the groups with their number of accounts. A group can be renamed; it can be deleted only
// while it has no accounts (the server answers with the reason otherwise).
export function ViewSecondLevelAccountGroupsPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [mainTypeCode, setMainTypeCode] = useState("");
  const [searchedMainTypeCode, setSearchedMainTypeCode] = useState("");
  const [editingGroup, setEditingGroup] = useState<AccountGroupResponse | null>(null);
  const [editedName, setEditedName] = useState("");
  const [message, setMessage] = useState<string>();
  const [toDelete, setToDelete] = useState<AccountGroupResponse | null>(null);

  const mainTypes = useApiQuery<AccountMainTypeResponse[]>(ApiEndpoints.chartOfAccounts.mainTypes);
  const groups = useApiQuery<AccountGroupResponse[]>(ApiEndpoints.chartOfAccounts.groups, {
    query: { mainTypeCode: searchedMainTypeCode || undefined },
  });
  const mayEdit = hasPermission(PermissionCodes.SETTINGS.VIEW_SECOND_LEVEL.EDIT);
  const mayDelete = hasPermission(PermissionCodes.SETTINGS.VIEW_SECOND_LEVEL.DELETE);

  async function saveRename() {
    if (!editingGroup) return;
    const body: UpdateAccountGroupRequest = { name: editedName.trim(), rowVersion: editingGroup.rowVersion };
    const result = await apiRequest<void>(ApiEndpoints.chartOfAccounts.groupByCode(editingGroup.groupCode), { method: "PUT", body });
    if (!result.ok) return setMessage(result.problem.message);
    setMessage(undefined);
    setEditingGroup(null);
    showToast(translateMessage("accounting.toast.groupRenamed"), ToneNames.success);
    groups.refetch();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(ApiEndpoints.chartOfAccounts.groupByCode(toDelete.groupCode), { method: "DELETE" });
    if (!result.ok) setMessage(result.problem.message);
    else {
      setMessage(undefined);
      showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
      groups.refetch();
    }
    setToDelete(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.viewSecondLevelAccountGroups")} subtitle={translateMessage("accounting.groups.viewSubtitle")} />
      <SectionCard isPadded={false}>
        <div className="space-y-4 p-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchedMainTypeCode(mainTypeCode);
              groups.refetch();
            }}
          >
          <FormField label={translateMessage("accounting.column.mainType")} name="mainTypeFilter">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={mainTypeCode} onChange={(event) => setMainTypeCode(event.target.value)}>
                <option value="">{translateMessage("accounting.groups.allMainTypes")}</option>
                {(mainTypes.data ?? []).map((mainType) => (
                  <option key={mainType.code} value={mainType.code}>
                    {mainType.displayName}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <SearchButton />
          </form>
          <FormResultNotice errorMessage={message} />
          {editingGroup && (
            <div className="flex items-end gap-2">
              <TextInputField label={translateMessage("accounting.column.groupName")} name="renamedGroupName" value={editedName} onChange={(event) => setEditedName(event.target.value)} maxLength={120} />
              <Button type="button" onClick={saveRename}>{translateMessage("masterData.action.save")}</Button>
              <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>{translateMessage("masterData.action.cancelEdit")}</Button>
            </div>
          )}
        </div>
        {groups.status === "loading" ? (
          <LoadingIndicator />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("accounting.column.code")}</TableHead>
                <TableHead>{translateMessage("accounting.column.groupName")}</TableHead>
                <TableHead>{translateMessage("accounting.column.mainType")}</TableHead>
                <TableHead className="text-end">{translateMessage("accounting.column.accountCount")}</TableHead>
                <TableHead className="text-end">{translateMessage("masterData.column.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(groups.data ?? []).map((group) => (
                <TableRow key={group.groupCode}>
                  <TableCell dir="ltr">{group.groupCode}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{(mainTypes.data ?? []).find((mainType) => mainType.code === group.mainTypeCode)?.displayName ?? group.mainTypeCode}</TableCell>
                  <TableCell className="text-end">{group.accountCount}</TableCell>
                  <TableCell className="text-end">
                    {mayEdit && (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.edit")} onClick={() => { setEditingGroup(group); setEditedName(group.name); }}>
                        <Pencil />
                      </Button>
                    )}
                    {mayDelete && (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.delete")} onClick={() => setToDelete(group)}>
                        <Trash2 />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
