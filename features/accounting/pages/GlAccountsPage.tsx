"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useFocusSearchWithControlF } from "@/features/masterData/hooks/useFocusSearchWithControlF";
import type {
  AccountGroupResponse,
  AccountResponse,
  CreateAccountRequest,
  NextAccountCodeResponse,
  UpdateAccountRequest,
} from "../types/chartOfAccountsTypes";

// General ledger accounts (docx 2.1). Pick a second level group, the next account code appears, type the title and save.
// Accounts the system created for itself (cash, sales, stock ...) cannot be renamed or deleted; the server enforces that too.
export function GlAccountsPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const containerReference = useRef<HTMLDivElement>(null);
  useFocusSearchWithControlF(containerReference);

  const [groupCode, setGroupCode] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editing, setEditing] = useState<AccountResponse | null>(null);
  const [message, setMessage] = useState<string>();
  const [nameError, setNameError] = useState<string>();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toDelete, setToDelete] = useState<AccountResponse | null>(null);

  const groups = useApiQuery<AccountGroupResponse[]>(ApiEndpoints.chartOfAccounts.groups);
  const nextCode = useApiQuery<NextAccountCodeResponse>(ApiEndpoints.chartOfAccounts.nextAccountCode, {
    query: { groupCode, refreshCounter },
    enabled: groupCode !== "" && editing === null,
  });
  const create = useApiMutation<CreateAccountRequest>(ApiEndpoints.chartOfAccounts.accounts);
  const update = useApiMutation<UpdateAccountRequest>(ApiEndpoints.chartOfAccounts.accounts, { method: "PUT" });

  const mayEdit = hasPermission(PermissionCodes.SETTINGS.GL_ACCOUNTS.EDIT);
  const mayDelete = hasPermission(PermissionCodes.SETTINGS.GL_ACCOUNTS.DELETE);
  const isPanelVisible = editing ? mayEdit : hasPermission(PermissionCodes.SETTINGS.GL_ACCOUNTS.ADD);

  function reset() {
    setEditing(null);
    setName("");
    setNameError(undefined);
    setMessage(undefined);
    setIsActive(true);
  }

  function startEditing(account: AccountResponse) {
    if (account.systemRole) {
      setMessage(translateMessage("accounting.accounts.systemAccountLocked"));
      return;
    }
    setEditing(account);
    setGroupCode(account.groupCode);
    setName(account.name);
    setIsActive(account.isActive);
    setMessage(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (name.trim() === "") return setNameError(translateMessage("accounting.validation.titleRequired"));
    if (!editing && groupCode === "") return setMessage(translateMessage("accounting.validation.groupRequired"));
    setNameError(undefined);
    const result = editing
      ? await update.execute(
          { name: name.trim(), isActive, rowVersion: editing.rowVersion },
          { path: ApiEndpoints.chartOfAccounts.accountById(editing.id) },
        )
      : await create.execute({ groupCode, name: name.trim() });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("accounting.toast.accountSaved"), ToneNames.success);
    reset();
    setRefreshCounter((counter) => counter + 1);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(ApiEndpoints.chartOfAccounts.accountById(toDelete.id), { method: "DELETE" });
    if (!result.ok) setMessage(result.problem.message);
    else {
      showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
      setRefreshCounter((counter) => counter + 1);
    }
    setToDelete(null);
  }

  const columns = useMemo<DataGridColumn<AccountResponse>[]>(
    () => [
      { key: "code", header: translateMessage("accounting.column.code"), isSortable: true, render: (row) => row.code },
      { key: "title", header: translateMessage("accounting.column.title"), isSortable: true, render: (row) => row.name },
      { key: "groupName", header: translateMessage("accounting.column.group"), isSecondary: true, render: (row) => row.groupName },
      { key: "status", header: translateMessage("masterData.column.status"), isSecondary: true, render: (row) => <StatusBadge statusCode={row.isActive ? "ACTIVE" : "INACTIVE"} /> },
      {
        key: "actions",
        header: translateMessage("masterData.column.actions"),
        alignment: "end",
        render: (row) =>
          row.systemRole ? (
            <span className="text-xs text-muted-foreground">{translateMessage("accounting.accounts.systemAccount")}</span>
          ) : (
            <div className="flex justify-end gap-1">
              {mayEdit && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.edit")} onClick={() => startEditing(row)}>
                  <Pencil />
                </Button>
              )}
              {mayDelete && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.delete")} onClick={() => setToDelete(row)}>
                  <Trash2 />
                </Button>
              )}
            </div>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage, mayEdit, mayDelete],
  );

  return (
    <div ref={containerReference} className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.glAccounts")} subtitle={translateMessage("accounting.accounts.subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {isPanelVisible && (
          <SectionCard title={translateMessage(editing ? "masterData.panel.editTitle" : "masterData.panel.addTitle")}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormField label={translateMessage("accounting.column.group")} name="groupCode" isRequired>
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={groupCode} disabled={editing !== null} onChange={(event) => setGroupCode(event.target.value)}>
                    <option value="">{translateMessage("masterData.choose")}</option>
                    {(groups.data ?? []).map((group) => (
                      <option key={group.groupCode} value={group.groupCode}>
                        {group.groupCode} {group.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <TextInputField
                label={translateMessage("accounting.column.code")}
                name="accountCode"
                value={editing?.code ?? nextCode.data?.accountCode ?? ""}
                readOnly
                dir="ltr"
                hint={translateMessage("accounting.accounts.codeHint")}
              />
              <TextInputField
                label={translateMessage("accounting.column.title")}
                name="accountName"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                errorMessage={nameError}
                maxLength={120}
                autoFocus
              />
              {editing && (
                <FormField label={translateMessage("masterData.field.isActive")} name="accountIsActive">
                  {(controlProps) => (
                    <Checkbox id={controlProps.id} checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
                  )}
                </FormField>
              )}
              <FormResultNotice errorMessage={message} />
              <div className="flex gap-2">
                <SubmitButton
                  label={translateMessage("masterData.action.save")}
                  pendingLabel={translateMessage("masterData.action.saving")}
                  isPending={create.isPending || update.isPending}
                />
                {editing && (
                  <Button type="button" variant="outline" onClick={reset}>
                    {translateMessage("masterData.action.cancelEdit")}
                  </Button>
                )}
              </div>
            </form>
          </SectionCard>
        )}
        <div className={isPanelVisible ? undefined : "lg:col-span-2"}>
          <SectionCard isPadded={false}>
            <ServerPaginatedDataGrid<AccountResponse>
              path={ApiEndpoints.chartOfAccounts.accounts}
              columns={columns}
              getRowKey={(row) => row.id}
              caption={translateMessage("navigation.item.glAccounts")}
              emptyTitle={translateMessage("masterData.empty.title")}
              filters={{ groupCode: groupCode || undefined, refreshKey: refreshCounter }}
              searchPlaceholder={translateMessage("masterData.search.placeholder")}
              offlineCacheName="chartOfAccountsAccounts"
            />
          </SectionCard>
        </div>
      </div>
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
