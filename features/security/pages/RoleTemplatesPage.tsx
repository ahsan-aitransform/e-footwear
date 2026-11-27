"use client";

import { useState, type FormEvent } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import type { RoleTemplateDetailsResponse, RoleTemplateSummaryResponse, SaveRoleTemplateRequest } from "@/lib/types/roleTemplate";
import { PermissionTreeEditor } from "../components/PermissionTreeEditor";
import { collectGrantableCodes } from "../logic/permissionTreeSelection";

type EditorState = { details: RoleTemplateDetailsResponse | undefined };

// Role templates (Part 6): named permission sets that prefill a user's permissions. The system suggestions (one per role) are read-only
// starting points, not business rules; the company's own templates can be created, changed and deleted. A template never limits a user:
// after applying one, every permission can still be changed one by one.
export function RoleTemplatesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const templatesQuery = useApiQuery<RoleTemplateSummaryResponse[]>(ApiEndpoints.roleTemplates.list);
  const catalogQuery = useApiQuery<PermissionCatalogResponse>(ApiEndpoints.permissions.catalog, { offlineCacheName: "permission-catalog" });
  const [editor, setEditor] = useState<EditorState>();
  const [templateToDelete, setTemplateToDelete] = useState<RoleTemplateSummaryResponse>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = hasPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.EDIT);

  async function openEditor(template: RoleTemplateSummaryResponse) {
    setErrorMessage(undefined);
    const result = await apiRequest<RoleTemplateDetailsResponse>(ApiEndpoints.roleTemplates.byKey(template.key));
    if (result.ok) setEditor({ details: result.data });
    else setErrorMessage(result.problem.message);
  }

  async function handleDelete() {
    if (!templateToDelete?.id) return;
    setIsDeleting(true);
    const result = await apiRequest(ApiEndpoints.roleTemplates.remove(templateToDelete.id), { method: "DELETE" });
    setIsDeleting(false);
    setTemplateToDelete(undefined);
    if (result.ok) templatesQuery.refetch();
    else setErrorMessage(result.problem.message);
  }

  const columns: DataGridColumn<RoleTemplateSummaryResponse>[] = [
    {
      key: "name",
      header: translateMessage("securityManagement.roleTemplates.nameColumn"),
      render: (template) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <strong>{template.name}</strong>
          {template.isSystemSuggestion && <ToneBadge tone={ToneNames.info}>{translateMessage("securityManagement.roleTemplates.suggestionBadge")}</ToneBadge>}
        </span>
      ),
    },
    { key: "description", header: translateMessage("securityManagement.roleTemplates.descriptionColumn"), isSecondary: true, render: (template) => template.description ?? "" },
    { key: "permissionCount", header: translateMessage("securityManagement.roleTemplates.permissionCountColumn"), alignment: "end", render: (template) => template.permissionCount },
    {
      key: "actions",
      header: "",
      alignment: "end",
      render: (template) => (
        <span className="inline-flex gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={() => openEditor(template)}>
            {translateMessage(template.isSystemSuggestion || !canEdit ? "securityManagement.roleTemplates.view" : "securityManagement.usersList.edit")}
          </Button>
          {!template.isSystemSuggestion && (
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.DELETE)}>
              <Button type="button" variant="destructive" size="sm" onClick={() => setTemplateToDelete(template)}>
                {translateMessage("securityManagement.usersList.delete")}
              </Button>
            </PermissionGate>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("securityManagement.roleTemplates.title")}
        subtitle={translateMessage("securityManagement.roleTemplates.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.ADD)}>
            <Button type="button" onClick={() => setEditor({ details: undefined })}>
              {translateMessage("securityManagement.roleTemplates.newTemplate")}
            </Button>
          </PermissionGate>
        }
      />
      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      {editor && catalogQuery.data && (
        <RoleTemplateEditor
          key={editor.details?.key ?? "new"}
          details={editor.details}
          catalog={catalogQuery.data}
          canSave={editor.details ? !editor.details.isSystemSuggestion && canEdit : true}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined);
            templatesQuery.refetch();
          }}
        />
      )}

      <SectionCard isPadded={false}>
        <DataGridTable
          rows={templatesQuery.data ?? []}
          columns={columns}
          getRowKey={(template) => template.key}
          caption={translateMessage("securityManagement.roleTemplates.title")}
          isLoading={templatesQuery.status === "loading"}
          errorMessage={templatesQuery.status === "error" ? templatesQuery.problem?.message : undefined}
          emptyTitle={translateMessage("securityManagement.roleTemplates.empty")}
          onRowOpen={openEditor}
        />
      </SectionCard>

      <ConfirmDialog
        open={templateToDelete !== undefined}
        onOpenChange={(open) => !open && setTemplateToDelete(undefined)}
        onConfirm={handleDelete}
        isPending={isDeleting}
        titleMessageKey="securityManagement.roleTemplates.deleteTitle"
        descriptionMessageKey="securityManagement.roleTemplates.deleteText"
      />
    </div>
  );
}

function RoleTemplateEditor({
  details,
  catalog,
  canSave,
  onClose,
  onSaved,
}: {
  details: RoleTemplateDetailsResponse | undefined;
  catalog: PermissionCatalogResponse;
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { translateMessage } = useTranslation();
  const [name, setName] = useState(details?.name ?? "");
  const [description, setDescription] = useState(details?.description ?? "");
  const [selectedCodes, setSelectedCodes] = useState<ReadonlySet<string>>(new Set(details?.permissionCodes ?? []));
  const [errorMessage, setErrorMessage] = useState<string>();
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setFieldErrorMessages({ name: translateMessage("securityManagement.roleTemplates.nameRequired") });
      return;
    }
    setFieldErrorMessages({});
    setErrorMessage(undefined);
    setIsSaving(true);
    const body: SaveRoleTemplateRequest = {
      name: name.trim(),
      description: description.trim() || null,
      permissionCodes: [...selectedCodes],
      rowVersion: details?.id ? details.rowVersion : null,
    };
    const result = await apiRequest(details?.id ? ApiEndpoints.roleTemplates.update(details.id) : ApiEndpoints.roleTemplates.create, {
      method: details?.id ? "PUT" : "POST",
      body,
    });
    setIsSaving(false);
    if (result.ok) onSaved();
    else {
      setErrorMessage(result.problem.message);
      setFieldErrorMessages(result.problem.fieldErrorMessages);
    }
  }

  const everyCode = new Set(collectGrantableCodes(catalog));

  return (
    <form onSubmit={handleSubmit} noValidate>
      <SectionCard title={translateMessage(details ? "securityManagement.roleTemplates.editorTitleEdit" : "securityManagement.roleTemplates.editorTitleNew")}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInputField
              label={translateMessage("securityManagement.roleTemplates.nameLabel")}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canSave}
              errorMessage={fieldErrorMessages.name}
              required
            />
            <TextInputField
              label={translateMessage("securityManagement.roleTemplates.descriptionLabel")}
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!canSave}
              errorMessage={fieldErrorMessages.description}
            />
          </div>
          <PermissionTreeEditor catalog={catalog} selectedCodes={selectedCodes} assignableCodes={everyCode} onChange={setSelectedCodes} isReadOnly={!canSave} />
          <FormResultNotice errorMessage={errorMessage} />
          <div className="flex gap-2">
            {canSave && (
              <Button type="submit" disabled={isSaving}>
                {translateMessage("securityManagement.userEditor.save")}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("securityManagement.partialEdit.close")}
            </Button>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
