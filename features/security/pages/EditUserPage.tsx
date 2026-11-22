"use client";

import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useCurrentSession, useIsOnline } from "@/lib/session/useSessionState";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import type { UserCreationOptionsResponse } from "@/lib/types/user";
import type { UserDetailsResponse, UserPermissionsResponse, UserQuickActionsResponse } from "@/lib/types/userManagement";
import type { UserSessionResponse } from "@/lib/types/userSession";
import { SessionsTable } from "../components/SessionsTable";
import { UserAccountActionsPanel } from "../components/UserAccountActionsPanel";
import { UserEditorForm } from "../components/UserEditorForm";

// Edit User (docx 1.3 Edit): the same form as Create New User, loaded with the user, plus the account actions and the sessions.
// A stale edit (somebody else saved first) is refused by the server with a conflict message.
export function EditUserPage({ userId }: { userId: string }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const session = useCurrentSession();
  const isOnline = useIsOnline();
  const canViewPermissions = hasPermission(PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.VIEW);

  const detailsQuery = useApiQuery<UserDetailsResponse>(ApiEndpoints.users.details(userId));
  const permissionsQuery = useApiQuery<UserPermissionsResponse>(ApiEndpoints.users.permissions(userId), { enabled: canViewPermissions });
  const quickActionsQuery = useApiQuery<UserQuickActionsResponse>(ApiEndpoints.users.quickActions(userId));
  const optionsQuery = useApiQuery<UserCreationOptionsResponse>(ApiEndpoints.users.creationOptions);
  const catalogQuery = useApiQuery<PermissionCatalogResponse>(ApiEndpoints.permissions.catalog, { offlineCacheName: "permission-catalog" });
  const sessionsQuery = useApiQuery<UserSessionResponse[]>(ApiEndpoints.users.sessionsOfUser(userId));

  const firstProblem = [detailsQuery, quickActionsQuery, optionsQuery].find((query) => query.status === "error")?.problem;
  const isLoading =
    detailsQuery.status === "loading" ||
    quickActionsQuery.status === "loading" ||
    optionsQuery.status === "loading" ||
    catalogQuery.status === "loading" ||
    (canViewPermissions && permissionsQuery.status === "loading");

  function refetchAll() {
    detailsQuery.refetch();
    permissionsQuery.refetch();
    quickActionsQuery.refetch();
    sessionsQuery.refetch();
  }

  async function handleEndSession(sessionId: string) {
    const result = await apiRequest(ApiEndpoints.users.sessionOfUser(userId, sessionId), { method: "DELETE" });
    if (result.ok) sessionsQuery.refetch();
  }

  const user = detailsQuery.data;
  const isOwnAccount = session?.userId === userId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user ? translateMessage("securityManagement.editUserPage.title", { userName: user.fullName }) : translateMessage("securityManagement.editUserPage.titleLoading")}
        subtitle={translateMessage("securityManagement.editUserPage.subtitle")}
      />
      {firstProblem && <InlineNotice>{firstProblem.message}</InlineNotice>}
      {isLoading && <LoadingIndicator />}

      {!isLoading && user && optionsQuery.data && quickActionsQuery.data && (
        <>
          <UserEditorForm
            key={user.rowVersion}
            mode="edit"
            user={user}
            creationOptions={optionsQuery.data}
            catalog={catalogQuery.data}
            currentPermissionCodes={permissionsQuery.data?.grantedPermissionCodes ?? []}
            holdsEveryPermissionByRole={permissionsQuery.data?.holdsEveryPermissionByRole ?? false}
            canViewPermissions={canViewPermissions}
            currentQuickActionCodes={quickActionsQuery.data.actionCodes}
            isOwnAccount={isOwnAccount}
            isOnline={isOnline}
            onSaved={refetchAll}
          />
          <UserAccountActionsPanel user={user} isOwnAccount={isOwnAccount} isOnline={isOnline} onChanged={refetchAll} />
          <SectionCard title={translateMessage("securityManagement.editUserPage.sessionsTitle")} isPadded={false}>
            {sessionsQuery.status === "error" ? (
              <div className="p-5"><InlineNotice>{sessionsQuery.problem?.message}</InlineNotice></div>
            ) : (
              <PermissionGate
                requirement={requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.EDIT)}
                fallback={<SessionsTable sessions={sessionsQuery.data ?? []} onEndSession={() => undefined} isBusy />}
              >
                <SessionsTable sessions={sessionsQuery.data ?? []} onEndSession={(userSession) => handleEndSession(userSession.id)} />
              </PermissionGate>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
