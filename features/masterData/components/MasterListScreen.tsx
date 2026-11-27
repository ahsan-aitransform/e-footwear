"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { FormField } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import type { PermissionCode } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import {
  emptyMasterListFormValues,
  hasFormErrors,
  masterListFormValuesFromItem,
  toSaveMasterListItemRequest,
  validateMasterListForm,
  type MasterListFormErrors,
  type MasterListFormValues,
} from "../logic/masterListFormValidation";
import { useFocusSearchWithControlF } from "../hooks/useFocusSearchWithControlF";
import type {
  MasterListItemResponse,
  MasterListItemSavedResponse,
  SaveMasterListItemRequest,
  UpdateMasterListItemRequest,
} from "../types/masterListTypes";

export type MasterListScreenProps = {
  // The list endpoint, for example ApiEndpoints.masterData.departments.
  listPath: string;
  titleMessageKey: MessageKey;
  subtitleMessageKey: MessageKey;
  addPermissionCode: PermissionCode;
  editPermissionCode: PermissionCode;
  deletePermissionCode: PermissionCode;
  // The saved copy that lets the list open offline.
  offlineCacheName: string;
  // Extra buttons in each row (for example "Sizes" on the size group list).
  renderExtraRowActions?: (item: MasterListItemResponse) => ReactNode;
  // Anything shown under the grid (for example the sizes of the selected size group).
  belowGrid?: ReactNode;
};

// ONE SCREEN FOR EVERY SIMPLE MASTER LIST (department, brand, season, gender, colour, location, unit, city, size group, product type).
// Layout as in the docx: the entry panel on the left, the search box and grid on the right. Ctrl+F focuses the search box, Enter in
// the name saves, double-click on a row loads it for editing. The server checks the permissions, the unique name and the
// "used elsewhere" rule again; this screen only shows what the person may do.
export function MasterListScreen({
  listPath,
  titleMessageKey,
  subtitleMessageKey,
  addPermissionCode,
  editPermissionCode,
  deletePermissionCode,
  offlineCacheName,
  renderExtraRowActions,
  belowGrid,
}: MasterListScreenProps) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const containerReference = useRef<HTMLDivElement>(null);
  useFocusSearchWithControlF(containerReference);

  const [formValues, setFormValues] = useState<MasterListFormValues>(emptyMasterListFormValues);
  const [editingItem, setEditingItem] = useState<MasterListItemResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MasterListFormErrors>({});
  const [serverMessage, setServerMessage] = useState<string>();
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [nearDuplicateNames, setNearDuplicateNames] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [itemToDelete, setItemToDelete] = useState<MasterListItemResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string>();

  const createItem = useApiMutation<SaveMasterListItemRequest, MasterListItemSavedResponse>(listPath);
  const updateItem = useApiMutation<UpdateMasterListItemRequest, MasterListItemSavedResponse>(listPath, { method: "PUT" });
  const isSaving = createItem.isPending || updateItem.isPending;

  const mayAdd = hasPermission(addPermissionCode);
  const mayEdit = hasPermission(editPermissionCode);
  const mayDelete = hasPermission(deletePermissionCode);
  const isEntryPanelVisible = editingItem ? mayEdit : mayAdd;

  const resetForm = useCallback(() => {
    setFormValues(emptyMasterListFormValues);
    setEditingItem(null);
    setFieldErrors({});
    setServerMessage(undefined);
    setServerFieldErrors({});
  }, []);

  function startEditing(item: MasterListItemResponse) {
    setEditingItem(item);
    setFormValues(masterListFormValuesFromItem(item));
    setFieldErrors({});
    setServerMessage(undefined);
    setServerFieldErrors({});
    setNearDuplicateNames([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateMasterListForm(formValues);
    setFieldErrors(errors);
    setServerMessage(undefined);
    setServerFieldErrors({});
    if (hasFormErrors(errors)) return;

    const request = toSaveMasterListItemRequest(formValues);
    const result = editingItem
      ? await updateItem.execute({ ...request, rowVersion: editingItem.rowVersion }, { path: ApiEndpoints.masterData.itemOfList(listPath, editingItem.id) })
      : await createItem.execute(request);

    if (!result.ok) {
      setServerMessage(result.problem.message);
      setServerFieldErrors(result.problem.fieldErrorMessages);
      return;
    }
    showToast(translateMessage("masterData.toast.saved"), ToneNames.success);
    setNearDuplicateNames(result.data.nearDuplicateNames);
    resetForm();
    setRefreshCounter((counter) => counter + 1);
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const result = await apiRequest<void>(ApiEndpoints.masterData.itemOfList(listPath, itemToDelete.id), { method: "DELETE" });
    setIsDeleting(false);
    if (!result.ok) {
      // For example "cannot be deleted because it is still used in: master.categories (3)": the server names the places.
      setDeleteMessage(result.problem.message);
      setItemToDelete(null);
      return;
    }
    showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
    setDeleteMessage(undefined);
    if (editingItem?.id === itemToDelete.id) resetForm();
    setItemToDelete(null);
    setRefreshCounter((counter) => counter + 1);
  }

  const columns = useMemo<DataGridColumn<MasterListItemResponse>[]>(
    () => [
      { key: "name", header: translateMessage("masterData.column.name"), isSortable: true, render: (item) => item.name },
      {
        key: "nameUrdu",
        header: translateMessage("masterData.column.nameUrdu"),
        isSecondary: true,
        render: (item) => <span dir="rtl">{item.nameUrdu ?? ""}</span>,
      },
      { key: "code", header: translateMessage("masterData.column.code"), isSortable: true, isSecondary: true, render: (item) => item.code ?? "" },
      { key: "sortOrder", header: translateMessage("masterData.column.sortOrder"), isSortable: true, alignment: "end", isSecondary: true, render: (item) => item.sortOrder },
      { key: "status", header: translateMessage("masterData.column.status"), render: (item) => <StatusBadge statusCode={item.isActive ? "ACTIVE" : "INACTIVE"} /> },
      {
        key: "actions",
        header: translateMessage("masterData.column.actions"),
        alignment: "end",
        render: (item) => (
          <div className="flex justify-end gap-1">
            {renderExtraRowActions?.(item)}
            {mayEdit && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.edit")} onClick={() => startEditing(item)}>
                <Pencil />
              </Button>
            )}
            {mayDelete && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.delete")} onClick={() => setItemToDelete(item)}>
                <Trash2 />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [translateMessage, mayEdit, mayDelete, renderExtraRowActions],
  );

  return (
    <div ref={containerReference} className="space-y-6">
      <PageHeader title={translateMessage(titleMessageKey)} subtitle={translateMessage(subtitleMessageKey)} />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {isEntryPanelVisible && (
          <SectionCard
            title={translateMessage(editingItem ? "masterData.panel.editTitle" : "masterData.panel.addTitle")}
            description={translateMessage("masterData.panel.hint")}
          >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <TextInputField
                label={translateMessage("masterData.field.name")}
                name="name"
                value={formValues.name}
                onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
                errorMessage={fieldErrors.name ? translateMessage(fieldErrors.name) : serverFieldErrors.name}
                required
                autoFocus
              />
              <TextInputField
                label={translateMessage("masterData.field.nameUrdu")}
                name="nameUrdu"
                dir="rtl"
                value={formValues.nameUrdu}
                onChange={(event) => setFormValues({ ...formValues, nameUrdu: event.target.value })}
                errorMessage={fieldErrors.nameUrdu ? translateMessage(fieldErrors.nameUrdu) : serverFieldErrors.nameUrdu}
              />
              <TextInputField
                label={translateMessage("masterData.field.code")}
                name="code"
                value={formValues.code}
                onChange={(event) => setFormValues({ ...formValues, code: event.target.value })}
                errorMessage={fieldErrors.code ? translateMessage(fieldErrors.code) : serverFieldErrors.code}
              />
              <TextInputField
                label={translateMessage("masterData.field.sortOrder")}
                name="sortOrder"
                inputMode="numeric"
                dir="ltr"
                value={formValues.sortOrderText}
                onChange={(event) => setFormValues({ ...formValues, sortOrderText: event.target.value })}
                errorMessage={fieldErrors.sortOrder ? translateMessage(fieldErrors.sortOrder) : serverFieldErrors.sortOrder}
              />
              <FormField label={translateMessage("masterData.field.isActive")} name="isActive">
                {(controlProps) => (
                  <Checkbox
                    id={controlProps.id}
                    checked={formValues.isActive}
                    onCheckedChange={(checked) => setFormValues({ ...formValues, isActive: checked === true })}
                  />
                )}
              </FormField>

              <FormResultNotice errorMessage={serverMessage} />
              {nearDuplicateNames.length > 0 && (
                <InlineNotice tone={ToneNames.warning}>
                  {translateMessage("masterData.warning.nearDuplicate", { names: nearDuplicateNames.join(", ") })}
                </InlineNotice>
              )}

              <div className="flex gap-2">
                <SubmitButton
                  label={translateMessage("masterData.action.save")}
                  pendingLabel={translateMessage("masterData.action.saving")}
                  isPending={isSaving}
                />
                {editingItem && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    {translateMessage("masterData.action.cancelEdit")}
                  </Button>
                )}
              </div>
            </form>
          </SectionCard>
        )}

        <div className={isEntryPanelVisible ? undefined : "lg:col-span-2"}>
          <SectionCard isPadded={false}>
            {deleteMessage && (
              <div className="p-4">
                <InlineNotice>{deleteMessage}</InlineNotice>
              </div>
            )}
            <ServerPaginatedDataGrid<MasterListItemResponse>
              path={listPath}
              columns={columns}
              getRowKey={(item) => item.id}
              caption={translateMessage(titleMessageKey)}
              emptyTitle={translateMessage("masterData.empty.title")}
              emptyText={translateMessage("masterData.empty.text")}
              fixedFilters={{ includeInactive: true }}
              refreshKey={refreshCounter}
              onRowOpen={mayEdit ? startEditing : undefined}
              searchPlaceholder={translateMessage("masterData.search.placeholder")}
              offlineCacheName={offlineCacheName}
            />
          </SectionCard>
          {belowGrid}
        </div>
      </div>

      <ConfirmDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />
    </div>
  );
}
