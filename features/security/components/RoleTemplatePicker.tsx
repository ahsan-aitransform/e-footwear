"use client";

import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { RoleTemplateDetailsResponse, RoleTemplateSummaryResponse } from "@/lib/types/roleTemplate";

// "Role template" dropdown of the Create New User screen (Part 6): applying a template copies its permission codes into the tree.
// It is only a starting point: every permission can be changed afterwards, so a template never blocks an individual override.
export function RoleTemplatePicker({
  onApplyTemplate,
  isDisabled = false,
}: {
  onApplyTemplate: (permissionCodes: readonly string[]) => void;
  isDisabled?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const templatesQuery = useApiQuery<RoleTemplateSummaryResponse[]>(ApiEndpoints.roleTemplates.list);
  const [selectedKey, setSelectedKey] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  async function handleApply() {
    if (!selectedKey) return;
    setIsApplying(true);
    setErrorMessage(undefined);
    const result = await apiRequest<RoleTemplateDetailsResponse>(ApiEndpoints.roleTemplates.byKey(selectedKey));
    setIsApplying(false);
    if (!result.ok) {
      setErrorMessage(result.problem.message);
      return;
    }
    onApplyTemplate(result.data.permissionCodes);
  }

  const templates = templatesQuery.data ?? [];
  if (templatesQuery.status === "success" && templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1.5 text-sm font-medium text-foreground">
          {translateMessage("securityManagement.roleTemplatePicker.label")}
          <NativeSelect
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            disabled={isDisabled || templatesQuery.status !== "success"}
            className="min-w-64"
          >
            <option value="">{translateMessage("securityManagement.roleTemplatePicker.placeholder")}</option>
            {templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name} ({template.permissionCount})
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="button" variant="outline" onClick={handleApply} disabled={isDisabled || !selectedKey || isApplying}>
          {translateMessage("securityManagement.roleTemplatePicker.apply")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{translateMessage("securityManagement.roleTemplatePicker.hint")}</p>
      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}
    </div>
  );
}
