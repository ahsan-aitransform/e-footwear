"use client";

import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { BackupHealthPanel } from "@/features/settings/components/BackupHealthPanel";
import { RestoreDrillsTable } from "@/features/settings/components/RestoreDrillsTable";
import { formatTimestamp } from "@/features/settings/formatTimestamp";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { BackupRunResponse, PlatformBackupOverviewResponse } from "@/lib/types/settings";

// Backups of the whole platform: health, every backup run with its off-site location, and the restore tests.
// Backups and restore tests are run by the operator commands (see the API's ARCHITECTURE.md); this screen reports what they recorded.
export function PlatformBackupPage() {
  const { translateMessage } = useTranslation();
  const overview = useApiQuery<PlatformBackupOverviewResponse>(ApiEndpoints.platformBackup.overview);
  const notAvailable = translateMessage("common.notAvailable");

  const columns: DataGridColumn<BackupRunResponse>[] = [
    { key: "startedAt", header: translateMessage("settings.backup.startedAt"), render: (run) => formatTimestamp(run.startedAt, notAvailable) },
    { key: "kind", header: translateMessage("platform.backup.kind"), render: (run) => translateMessage(`platform.backup.kind.${run.kind}` as "platform.backup.kind.BASE") },
    {
      key: "status",
      header: translateMessage("settings.storeManagement.status"),
      render: (run) => (
        <ToneBadge tone={run.status === "OK" ? ToneNames.success : run.status === "FAILED" ? ToneNames.danger : ToneNames.warning}>
          {translateMessage(`settings.backupRun.status.${run.status}` as "settings.backupRun.status.OK")}
        </ToneBadge>
      ),
    },
    { key: "location", header: translateMessage("platform.backup.location"), isSecondary: true, render: (run) => <span className="break-all text-xs">{run.storageLocation}</span> },
    { key: "encrypted", header: translateMessage("settings.backup.encrypted"), isSecondary: true, render: (run) => translateMessage(run.isEncrypted ? "common.yes" : "common.no") },
    { key: "error", header: translateMessage("platform.backup.error"), isSecondary: true, render: (run) => run.errorMessage ?? notAvailable },
  ];

  return (
    <>
      <PageHeader title={translateMessage("platform.backup.title")} subtitle={translateMessage("platform.backup.subtitle")} />
      {overview.status === "loading" && <LoadingIndicator />}
      {overview.status === "error" && <InlineNotice>{overview.isOffline ? translateMessage("errors.platformNeedsConnection") : overview.problem?.message}</InlineNotice>}
      {overview.status === "success" && overview.data && (
        <>
          <BackupHealthPanel health={overview.data.health} />
          <SectionCard title={translateMessage("platform.backup.runsTitle")} isPadded={false}>
            <DataGridTable
              rows={overview.data.runs}
              columns={columns}
              getRowKey={(run) => run.id}
              caption={translateMessage("platform.backup.runsTitle")}
              emptyTitle={translateMessage("platform.backup.noRuns")}
              emptyText={translateMessage("platform.backup.noRunsText")}
            />
          </SectionCard>
          <SectionCard title={translateMessage("settings.restore.drillsTitle")} isPadded={false}>
            <RestoreDrillsTable drills={overview.data.drills} />
          </SectionCard>
        </>
      )}
    </>
  );
}
