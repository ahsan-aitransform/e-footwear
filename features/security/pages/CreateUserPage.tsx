"use client";

import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import type { UserCreationOptionsResponse } from "@/lib/types/user";
import { UserEditorForm } from "../components/UserEditorForm";

// Create New User (docx 1.1). Needs the server (roles, stores and the permission catalog come from it), so offline it says so.
export function CreateUserPage() {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();
  const optionsQuery = useApiQuery<UserCreationOptionsResponse>(ApiEndpoints.users.creationOptions);
  const catalogQuery = useApiQuery<PermissionCatalogResponse>(ApiEndpoints.permissions.catalog, { offlineCacheName: "permission-catalog" });

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("securityManagement.createUserPage.title")} subtitle={translateMessage("securityManagement.createUserPage.subtitle")} />
      {optionsQuery.status === "error" && <InlineNotice>{optionsQuery.problem?.message}</InlineNotice>}
      {catalogQuery.status === "error" && <InlineNotice>{catalogQuery.problem?.message}</InlineNotice>}
      {optionsQuery.status === "loading" || catalogQuery.status === "loading" ? (
        <LoadingIndicator />
      ) : optionsQuery.data ? (
        <UserEditorForm mode="create" creationOptions={optionsQuery.data} catalog={catalogQuery.data} canViewPermissions isOnline={isOnline} />
      ) : null}
    </div>
  );
}
