"use client";

import { Fragment } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { toneForStatusCode } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { CompanyProfileResponse } from "@/lib/types/settings";
import { CompanyLogoPanel } from "../components/CompanyLogoPanel";
import { CompanyProfileForm } from "../components/CompanyProfileForm";

// Company Profile: legal and regional settings and the logo of the company, with its plan and status.
export function CompanyProfilePage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionCodes.SETTINGS.COMPANY_PROFILE.EDIT);
  const profile = useApiQuery<CompanyProfileResponse>(ApiEndpoints.companySettings.companyProfile);

  return (
    <>
      <PageHeader title={translateMessage("settings.companyProfile.title")} subtitle={translateMessage("settings.companyProfile.subtitle")} />
      {profile.status === "loading" && <LoadingIndicator />}
      {profile.status === "error" && (
        <InlineNotice>{profile.isOffline ? translateMessage("errors.noConnectionToServer") : profile.problem?.message}</InlineNotice>
      )}
      {profile.status === "success" && profile.data && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{profile.data.name}</span>
            <span>
              {translateMessage("settings.companyProfile.plan")}: {profile.data.planCode}
            </span>
            <ToneBadge tone={toneForStatusCode(profile.data.status)}>{profile.data.status}</ToneBadge>
          </div>
          <Fragment key={profile.data.rowVersion}>
            <CompanyProfileForm profile={profile.data} canEdit={canEdit} onSaved={profile.refetch} />
          </Fragment>
          <CompanyLogoPanel canEdit={canEdit} />
        </>
      )}
    </>
  );
}
