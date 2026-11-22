"use client";

import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { CreateUserForm } from "@/features/security/components/CreateUserForm";
import { UserListTable } from "@/features/security/components/UserListTable";
import { StoreListTable } from "@/features/settings/components/StoreListTable";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { StoreSummaryResponse } from "@/lib/types/store";
import type { UserCreationOptionsResponse, UserListItemResponse } from "@/lib/types/user";

const canSeeUsers = requireAnyPermission(PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW);
const canAddUsers = requireAnyPermission(PermissionCodes.USER_ACCOUNT.CREATE_USER.ADD);

// What a company user sees first: the stores they may work in, the people they may see, and the form to add users.
// The last answers are kept on the device, so the screen still shows something when the server cannot be reached.
export function CompanyDashboardPage() {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();
  const { satisfiesRequirement } = usePermissions();
  const mayViewUsers = satisfiesRequirement(canSeeUsers);
  const mayAddUsers = satisfiesRequirement(canAddUsers);

  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores, {
    offlineCacheName: "companyDashboard.stores",
  });
  const users = useApiQuery<UserListItemResponse[]>(ApiEndpoints.users.list, {
    enabled: mayViewUsers,
    offlineCacheName: "companyDashboard.users",
  });
  const creationOptions = useApiQuery<UserCreationOptionsResponse>(ApiEndpoints.users.creationOptions, {
    enabled: mayAddUsers,
    offlineCacheName: "companyDashboard.creationOptions",
  });

  const answers = [stores, mayViewUsers ? users : undefined, mayAddUsers ? creationOptions : undefined].filter(
    (answer): answer is NonNullable<typeof answer> => answer !== undefined,
  );
  const isShowingSavedData = answers.some((answer) => answer.source === "cache");
  const savedAtIsoTimestamp = stores.savedAtIsoTimestamp;
  const savedAtText = savedAtIsoTimestamp ? new Date(savedAtIsoTimestamp).toLocaleString() : "";
  const failedAnswer = answers.find((answer) => answer.status === "error");

  function reload() {
    stores.refetch();
    users.refetch();
    creationOptions.refetch();
  }

  return (
    <>
      <PageHeader title={translateMessage("dashboards.company.title")} subtitle={translateMessage("dashboards.company.subtitle")} />

      {isShowingSavedData && (
        <InlineNotice tone={ToneNames.warning}>
          {translateMessage("dashboards.company.offlineBanner", { savedAt: savedAtText })}
        </InlineNotice>
      )}
      {!isShowingSavedData && stores.source === "server" && savedAtText && (
        <p className="text-xs text-muted-foreground">{translateMessage("dashboards.company.upToDate", { savedAt: savedAtText })}</p>
      )}
      {failedAnswer && <InlineNotice>{failedAnswer.problem?.message}</InlineNotice>}
      {stores.status === "loading" && <LoadingIndicator />}

      {stores.status === "success" && stores.data && (
        <SectionCard title={translateMessage("dashboards.company.storesTitle")} isPadded={false}>
          <StoreListTable
            stores={stores.data}
            caption={translateMessage("dashboards.company.storesTitle")}
            emptyTitle={translateMessage("dashboards.company.noStoresTitle")}
            emptyText={translateMessage("dashboards.company.noStoresText")}
          />
        </SectionCard>
      )}

      <PermissionGate requirement={canSeeUsers}>
        {users.status === "success" && users.data && (
          <SectionCard title={translateMessage("dashboards.company.peopleTitle")} isPadded={false}>
            <UserListTable users={users.data} caption={translateMessage("dashboards.company.peopleTitle")} />
          </SectionCard>
        )}
      </PermissionGate>

      <PermissionGate requirement={canAddUsers}>
        {creationOptions.status === "success" && creationOptions.data && (
          <SectionCard
            title={translateMessage("dashboards.company.addUserTitle")}
            description={translateMessage("dashboards.company.addUserDescription")}
          >
            <CreateUserForm options={creationOptions.data} isOnline={isOnline} onCreated={reload} />
          </SectionCard>
        )}
      </PermissionGate>
    </>
  );
}
