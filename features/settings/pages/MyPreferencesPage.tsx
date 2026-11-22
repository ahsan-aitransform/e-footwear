"use client";

import { Fragment } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { SettingsDocumentResponse, UserPreferencesSettings } from "@/lib/types/settings";
import { UserPreferencesForm } from "../components/UserPreferencesForm";
import { useSellingStores } from "../hooks/useSellingStores";

// My Preferences: every company user sets their own language, theme and default store (no permission needed).
export function MyPreferencesPage() {
  const { translateMessage } = useTranslation();
  const preferences = useApiQuery<SettingsDocumentResponse<UserPreferencesSettings>>(ApiEndpoints.userPreferences.ownPreferences);
  const { sellingStores } = useSellingStores();

  return (
    <>
      <PageHeader title={translateMessage("settings.myPreferences.title")} subtitle={translateMessage("settings.myPreferences.subtitle")} />
      {preferences.status === "loading" && <LoadingIndicator />}
      {preferences.status === "error" && (
        <InlineNotice>{preferences.isOffline ? translateMessage("errors.noConnectionToServer") : preferences.problem?.message}</InlineNotice>
      )}
      {preferences.status === "success" && preferences.data && (
        <Fragment key={preferences.data.rowVersion}>
          <UserPreferencesForm document={preferences.data} stores={sellingStores} onSaved={preferences.refetch} />
        </Fragment>
      )}
    </>
  );
}
