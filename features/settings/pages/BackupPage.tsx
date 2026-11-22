"use client";

import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CompanyBackupOverviewResponse, CompanyExportResponse } from "@/lib/types/settings";
import { BackupHealthPanel } from "../components/BackupHealthPanel";
import { formatTimestamp } from "../formatTimestamp";

function formatSize(sizeBytes: number | null, emptyText: string): string {
  if (sizeBytes === null) return emptyText;
  return sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Backup: the platform's backup health and the exports of this company's own data. Backups are made by the platform operator.
export function BackupPage() {
  const { translateMessage } = useTranslation();
  const overview = useApiQuery<CompanyBackupOverviewResponse>(ApiEndpoints.backup.overview);
  const notAvailable = translateMessage("common.notAvailable");

  const columns: DataGridColumn<CompanyExportResponse>[] = [
    { key: "startedAt", header: translateMessage("settings.backup.startedAt"), render: (run) => formatTimestamp(run.startedAt, notAvailable) },
    { key: "finishedAt", header: translateMessage("settings.backup.finishedAt"), isSecondary: true, render: (run) => formatTimestamp(run.finishedAt, notAvailable) },
    {
      key: "status",
      header: translateMessage("settings.storeManagement.status"),
      render: (run) => (
        <ToneBadge tone={run.status === "OK" ? ToneNames.success : run.status === "FAILED" ? ToneNames.danger : ToneNames.warning}>
          {translateMessage(`settings.backupRun.status.${run.status}` as "settings.backupRun.status.OK")}
        </ToneBadge>
      ),
    },
    { key: "size", header: translateMessage("settings.backup.size"), alignment: "end", render: (run) => formatSize(run.sizeBytes, notAvailable) },
    { key: "encrypted", header: translateMessage("settings.backup.encrypted"), isSecondary: true, render: (run) => translateMessage(run.isEncrypted ? "common.yes" : "common.no") },
  ];

  return (
    <>
      <PageHeader title={translateMessage("settings.backup.title")} subtitle={translateMessage("settings.backup.subtitle")} />
      {overview.status === "loading" && <LoadingIndicator />}
      {overview.status === "error" && <InlineNotice>{overview.isOffline ? translateMessage("errors.noConnectionToServer") : overview.problem?.message}</InlineNotice>}
      {overview.status === "success" && overview.data && (
        <>
          <BackupHealthPanel health={overview.data.health} />
          <InlineNotice tone={ToneNames.info}>{translateMessage("settings.backup.operatorNote")}</InlineNotice>
          <SectionCard title={translateMessage("settings.backup.exportsTitle")} description={translateMessage("settings.backup.exportsDescription")} isPadded={false}>
            <DataGridTable
              rows={overview.data.exports}
              columns={columns}
              getRowKey={(run) => run.id}
              caption={translateMessage("settings.backup.exportsTitle")}
              emptyTitle={translateMessage("settings.backup.noExports")}
              emptyText={translateMessage("settings.backup.noExportsText")}
            />
          </SectionCard>
        </>
      )}
    </>
  );
}
