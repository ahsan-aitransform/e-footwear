"use client";

import { ToneBadge } from "@/components/feedback/ToneBadge";
import { SectionCard } from "@/components/layout/SectionCard";
import { BackupHealthStatusCodes } from "@/lib/constants/settingsCodes";
import { ToneNames, type ToneName } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { BackupHealthResponse } from "@/lib/types/settings";
import { formatTimestamp } from "../formatTimestamp";

const BackupStatusMessageKeys = {
  OK: "settings.backupStatus.OK",
  NO_BASE_BACKUP: "settings.backupStatus.NO_BASE_BACKUP",
  BASE_BACKUP_STALE: "settings.backupStatus.BASE_BACKUP_STALE",
  NO_WAL_ARCHIVE: "settings.backupStatus.NO_WAL_ARCHIVE",
  WAL_ARCHIVE_STALE: "settings.backupStatus.WAL_ARCHIVE_STALE",
  NEVER_TESTED: "settings.backupStatus.NEVER_TESTED",
  RESTORE_TEST_DUE: "settings.backupStatus.RESTORE_TEST_DUE",
} as const;

export function toneForBackupStatus(statusCode: string): ToneName {
  return statusCode === BackupHealthStatusCodes.ok ? ToneNames.success : ToneNames.warning;
}

function StatusLine({ label, statusCode, lastAt }: { label: string; statusCode: string; lastAt: string | null }) {
  const { translateMessage } = useTranslation();
  const messageKey = BackupStatusMessageKeys[statusCode as keyof typeof BackupStatusMessageKeys];
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <ToneBadge tone={toneForBackupStatus(statusCode)}>{messageKey ? translateMessage(messageKey) : statusCode}</ToneBadge>
      <p className="text-xs text-muted-foreground">{formatTimestamp(lastAt, translateMessage("settings.backup.never"))}</p>
    </div>
  );
}

// The state of the platform backups. The thresholds behind "stale" and "due" are proposals in the schema, not agreed policy.
export function BackupHealthPanel({ health }: { health: BackupHealthResponse | null }) {
  const { translateMessage } = useTranslation();
  return (
    <SectionCard title={translateMessage("settings.backup.healthTitle")} description={translateMessage("settings.backup.healthDescription")}>
      {health === null ? (
        <p className="text-sm text-muted-foreground">{translateMessage("settings.backup.noHealth")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatusLine label={translateMessage("settings.backup.baseBackup")} statusCode={health.baseBackupStatus} lastAt={health.lastBaseBackupAt} />
          <StatusLine label={translateMessage("settings.backup.walArchive")} statusCode={health.walArchiveStatus} lastAt={health.lastWalArchiveAt} />
          <StatusLine label={translateMessage("settings.backup.restoreTest")} statusCode={health.restoreTestStatus} lastAt={health.lastPassedRestoreDrillAt} />
        </div>
      )}
    </SectionCard>
  );
}
