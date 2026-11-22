"use client";

import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { RestoreOverviewResponse } from "@/lib/types/settings";
import { BackupHealthPanel } from "../components/BackupHealthPanel";
import { RestoreDrillsTable } from "../components/RestoreDrillsTable";

// Restore: how a restore works and the restore tests recorded so far. A company cannot restore itself from this screen: a restore
// replaces data, and it must never touch another company, so it is a procedure of the platform operator.
export function RestorePage() {
  const { translateMessage } = useTranslation();
  const overview = useApiQuery<RestoreOverviewResponse>(ApiEndpoints.backup.restoreOverview);

  return (
    <>
      <PageHeader title={translateMessage("settings.restore.title")} subtitle={translateMessage("settings.restore.subtitle")} />
      <InlineNotice tone={ToneNames.info}>{translateMessage("settings.restore.operatorOnlyNote")}</InlineNotice>
      {overview.status === "loading" && <LoadingIndicator />}
      {overview.status === "error" && <InlineNotice>{overview.isOffline ? translateMessage("errors.noConnectionToServer") : overview.problem?.message}</InlineNotice>}
      {overview.status === "success" && overview.data && (
        <>
          <BackupHealthPanel health={overview.data.health} />
          <SectionCard title={translateMessage("settings.restore.drillsTitle")} description={translateMessage("settings.restore.drillsDescription")} isPadded={false}>
            <RestoreDrillsTable drills={overview.data.drills} />
          </SectionCard>
        </>
      )}
    </>
  );
}
