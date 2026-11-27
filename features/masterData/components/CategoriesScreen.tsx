"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useFocusSearchWithControlF } from "../hooks/useFocusSearchWithControlF";
import {
  hasFormErrors,
  MasterListLimits,
  validateMasterListForm,
  type MasterListFormValues,
} from "../logic/masterListFormValidation";
import type {
  CategoryResponse,
  MasterListOptionResponse,
  SaveCategoryRequest,
  UpdateCategoryRequest,
} from "../types/masterListTypes";

type CategoryFormValues = MasterListFormValues & { departmentId: string; parentCategoryId: string };

const emptyCategoryForm: CategoryFormValues = {
  name: "",
  nameUrdu: "",
  code: "",
  sortOrderText: "0",
  isActive: true,
  departmentId: "",
  parentCategoryId: "",
};

// Categories (docx 2.2): a category belongs to one department and can sit under another category of the same department.
export function CategoriesScreen() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const containerReference = useRef<HTMLDivElement>(null);
  useFocusSearchWithControlF(containerReference);

  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyCategoryForm);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateMasterListForm>>({});
  const [isDepartmentMissing, setIsDepartmentMissing] = useState(false);
  const [serverMessage, setServerMessage] = useState<string>();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toDelete, setToDelete] = useState<CategoryResponse | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string>();

  const departments = useApiQuery<MasterListOptionResponse[]>(
    ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.departments),
  );
  const parentOptions = useApiQuery<MasterListOptionResponse[]>(
    ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.categories),
    { query: { departmentId: formValues.departmentId || undefined }, enabled: formValues.departmentId !== "" },
  );
  const create = useApiMutation<SaveCategoryRequest>(ApiEndpoints.masterData.categories);
  const update = useApiMutation<UpdateCategoryRequest>(ApiEndpoints.masterData.categories, { method: "PUT" });

  const mayEdit = hasPermission(PermissionCodes.SETTINGS.CATEGORY.EDIT);
  const mayDelete = hasPermission(PermissionCodes.SETTINGS.CATEGORY.DELETE);
  const isPanelVisible = editing ? mayEdit : hasPermission(PermissionCodes.SETTINGS.CATEGORY.ADD);

  function reset() {
    setFormValues(emptyCategoryForm);
    setEditing(null);
    setFieldErrors({});
    setIsDepartmentMissing(false);
    setServerMessage(undefined);
  }

  function startEditing(category: CategoryResponse) {
    setEditing(category);
    setFormValues({
      name: category.name,
      nameUrdu: category.nameUrdu ?? "",
      code: category.code ?? "",
      sortOrderText: String(category.sortOrder),
      isActive: category.isActive,
      departmentId: category.departmentId,
      parentCategoryId: category.parentCategoryId ?? "",
    });
    setFieldErrors({});
    setIsDepartmentMissing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateMasterListForm(formValues);
    const departmentMissing = formValues.departmentId === "";
    setFieldErrors(errors);
    setIsDepartmentMissing(departmentMissing);
    setServerMessage(undefined);
    if (hasFormErrors(errors) || departmentMissing) return;

    const body: SaveCategoryRequest = {
      departmentId: formValues.departmentId,
      parentCategoryId: formValues.parentCategoryId || null,
      name: formValues.name.trim(),
      nameUrdu: formValues.nameUrdu.trim() || null,
      code: formValues.code.trim() || null,
      sortOrder: Number(formValues.sortOrderText || 0),
      isActive: formValues.isActive,
    };
    const result = editing
      ? await update.execute(
          { ...body, rowVersion: editing.rowVersion },
          { path: ApiEndpoints.masterData.itemOfList(ApiEndpoints.masterData.categories, editing.id) },
        )
      : await create.execute(body);
    if (!result.ok) return setServerMessage(result.problem.message);
    showToast(translateMessage("masterData.toast.saved"), ToneNames.success);
    reset();
    setRefreshCounter((counter) => counter + 1);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(ApiEndpoints.masterData.itemOfList(ApiEndpoints.masterData.categories, toDelete.id), {
      method: "DELETE",
    });
    if (!result.ok) {
      setDeleteMessage(result.problem.message);
    } else {
      setDeleteMessage(undefined);
      showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
      setRefreshCounter((counter) => counter + 1);
    }
    setToDelete(null);
  }

  const columns = useMemo<DataGridColumn<CategoryResponse>[]>(
    () => [
      { key: "name", header: translateMessage("masterData.column.name"), isSortable: true, render: (row) => row.name },
      { key: "department", header: translateMessage("masterData.column.department"), isSortable: true, render: (row) => row.departmentName },
      { key: "parentCategoryName", header: translateMessage("masterData.column.parentCategory"), isSecondary: true, render: (row) => row.parentCategoryName ?? "" },
      { key: "code", header: translateMessage("masterData.column.code"), isSecondary: true, render: (row) => row.code ?? "" },
      {
        key: "actions",
        header: translateMessage("masterData.column.actions"),
        alignment: "end",
        render: (row) => (
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
    [translateMessage, mayEdit, mayDelete],
  );

  return (
    <div ref={containerReference} className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.categories")} subtitle={translateMessage("masterData.subtitle.categories")} />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {isPanelVisible && (
          <SectionCard title={translateMessage(editing ? "masterData.panel.editTitle" : "masterData.panel.addTitle")}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormField
                label={translateMessage("masterData.column.department")}
                name="departmentId"
                isRequired
                errorMessage={isDepartmentMissing ? translateMessage("masterData.validation.departmentRequired") : undefined}
              >
                {(controlProps) => (
                  <NativeSelect
                    {...controlProps}
                    value={formValues.departmentId}
                    onChange={(event) => setFormValues({ ...formValues, departmentId: event.target.value, parentCategoryId: "" })}
                  >
                    <option value="">{translateMessage("masterData.choose")}</option>
                    {(departments.data ?? []).map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField label={translateMessage("masterData.column.parentCategory")} name="parentCategoryId">
                {(controlProps) => (
                  <NativeSelect
                    {...controlProps}
                    value={formValues.parentCategoryId}
                    disabled={formValues.departmentId === ""}
                    onChange={(event) => setFormValues({ ...formValues, parentCategoryId: event.target.value })}
                  >
                    <option value="">{translateMessage("masterData.none")}</option>
                    {(parentOptions.data ?? [])
                      .filter((option) => option.id !== editing?.id)
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                  </NativeSelect>
                )}
              </FormField>
              <TextInputField
                label={translateMessage("masterData.field.name")}
                name="name"
                required
                value={formValues.name}
                onChange={(event) => setFormValues({ ...formValues, name: event.target.value })}
                errorMessage={fieldErrors.name ? translateMessage(fieldErrors.name) : undefined}
                maxLength={MasterListLimits.nameMaximumLength}
              />
              <TextInputField
                label={translateMessage("masterData.field.nameUrdu")}
                name="nameUrdu"
                dir="rtl"
                value={formValues.nameUrdu}
                onChange={(event) => setFormValues({ ...formValues, nameUrdu: event.target.value })}
              />
              <TextInputField
                label={translateMessage("masterData.field.code")}
                name="code"
                value={formValues.code}
                onChange={(event) => setFormValues({ ...formValues, code: event.target.value })}
                errorMessage={fieldErrors.code ? translateMessage(fieldErrors.code) : undefined}
              />
              <FormResultNotice errorMessage={serverMessage} />
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
            {deleteMessage && (
              <div className="p-4">
                <FormResultNotice errorMessage={deleteMessage} />
              </div>
            )}
            <ServerPaginatedDataGrid<CategoryResponse>
              path={ApiEndpoints.masterData.categories}
              columns={columns}
              getRowKey={(row) => row.id}
              caption={translateMessage("navigation.item.categories")}
              emptyTitle={translateMessage("masterData.empty.title")}
              fixedFilters={{ includeInactive: true }}
              refreshKey={refreshCounter}
              onRowOpen={mayEdit ? startEditing : undefined}
              searchPlaceholder={translateMessage("masterData.search.placeholder")}
              offlineCacheName="masterDataCategories"
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
