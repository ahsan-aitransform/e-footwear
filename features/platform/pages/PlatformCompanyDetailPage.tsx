"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { StoreListTable } from "@/features/settings/components/StoreListTable";
import { CreateUserForm } from "@/features/security/components/CreateUserForm";
import { UserListTable } from "@/features/security/components/UserListTable";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { isUuid } from "@/lib/validation/isUuid";
import type { StoreSummaryResponse } from "@/lib/types/store";
import type { UserCreationOptionsResponse, UserListItemResponse } from "@/lib/types/user";
import { CompanySubscriptionPanel } from "../components/CompanySubscriptionPanel";
import { CreateStoreForm } from "../components/CreateStoreForm";

// One company: its stores and users, with the forms to add a store and a store manager or owner.
export function PlatformCompanyDetailPage() {
  const { translateMessage } = useTranslation();
  const parameters = useParams<{ companyId: string }>();
  const companyId = parameters.companyId;
  const isValidCompanyId = isUuid(companyId);

  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.platformCompanies.storesOfCompany(companyId), {
    enabled: isValidCompanyId,
  });
  const users = useApiQuery<UserListItemResponse[]>(ApiEndpoints.users.list, {
    query: { companyId },
    enabled: isValidCompanyId,
  });
  const creationOptions = useApiQuery<UserCreationOptionsResponse>(ApiEndpoints.users.creationOptions, {
    query: { companyId },
    enabled: isValidCompanyId,
  });

  const failed = [stores, users, creationOptions].find((query) => query.status === "error");
  const isLoaded = stores.status === "success" && users.status === "success" && creationOptions.status === "success";
  const isWaiting = isValidCompanyId && !failed && !isLoaded;

  function reload() {
    stores.refetch();
    users.refetch();
    creationOptions.refetch();
  }

  return (
    <>
      <div>
        <Link href={ApplicationRoutes.platformCompanies} className="text-sm font-medium text-primary hover:underline">
          {translateMessage("platform.companyDetail.back")}
        </Link>
      </div>
      <PageHeader title={translateMessage("platform.companyDetail.title")} subtitle={translateMessage("platform.companyDetail.subtitle")} />

      {isValidCompanyId && <CompanySubscriptionPanel companyId={companyId} />}
      {!isValidCompanyId && <InlineNotice>{translateMessage("platform.directory.loadFailed")}</InlineNotice>}
      {failed && (
        <InlineNotice>
          {failed.isOffline ? translateMessage("errors.platformNeedsConnection") : failed.problem?.message}
        </InlineNotice>
      )}
      {isWaiting && <LoadingIndicator />}

      {isLoaded && stores.data && users.data && creationOptions.data && (
        <>
          <SectionCard title={translateMessage("platform.companyDetail.storesTitle")} isPadded={false}>
            <StoreListTable
              stores={stores.data}
              caption={translateMessage("platform.companyDetail.storesTitle")}
              emptyTitle={translateMessage("platform.directory.noStores")}
              showStatusColumn
            />
          </SectionCard>

          <SectionCard
            title={translateMessage("platform.companyDetail.addStoreTitle")}
            description={translateMessage("platform.companyDetail.addStoreDescription")}
          >
            <CreateStoreForm companyId={companyId} onCreated={reload} />
          </SectionCard>

          <SectionCard title={translateMessage("platform.companyDetail.usersTitle")} isPadded={false}>
            {users.data.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium text-foreground">{translateMessage("platform.companyDetail.noUsersTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{translateMessage("platform.companyDetail.noUsersText")}</p>
              </div>
            ) : (
              <UserListTable users={users.data} caption={translateMessage("platform.companyDetail.usersTitle")} />
            )}
          </SectionCard>

          <SectionCard
            title={translateMessage("platform.companyDetail.addUserTitle")}
            description={translateMessage("platform.companyDetail.addUserDescription")}
          >
            <CreateUserForm companyId={companyId} options={creationOptions.data} isOnline onCreated={reload} />
          </SectionCard>
        </>
      )}
    </>
  );
}
