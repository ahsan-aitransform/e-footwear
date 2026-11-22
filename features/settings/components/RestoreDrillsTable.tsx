"use client";

import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { RestoreDrillResponse } from "@/lib/types/settings";
import { formatTimestamp } from "../formatTimestamp";

// The restore tests recorded so far: when, the outcome, how long a recovery took and how much data was lost.
export function RestoreDrillsTable({ drills }: { drills: readonly RestoreDrillResponse[] }) {
  const { translateMessage } = useTranslation();
  const notAvailable = translateMessage("common.notAvailable");
  const columns: DataGridColumn<RestoreDrillResponse>[] = [
    { key: "finishedAt", header: translateMessage("settings.restore.finishedAt"), render: (drill) => formatTimestamp(drill.finishedAt, notAvailable) },
    {
      key: "outcome",
      header: translateMessage("settings.restore.outcome"),
      render: (drill) => (
        <ToneBadge tone={drill.outcome === "PASS" ? ToneNames.success : ToneNames.danger}>
          {translateMessage(drill.outcome === "PASS" ? "settings.restore.passed" : "settings.restore.failed")}
        </ToneBadge>
      ),
    },
    { key: "rto", header: translateMessage("settings.restore.recoveryMinutes"), alignment: "end", render: (drill) => drill.measuredRtoMinutes ?? notAvailable },
    { key: "rpo", header: translateMessage("settings.restore.dataLossMinutes"), alignment: "end", isSecondary: true, render: (drill) => drill.measuredRpoMinutes ?? notAvailable },
    { key: "rows", header: translateMessage("settings.restore.rowsChecked"), alignment: "end", isSecondary: true, render: (drill) => drill.rowsChecked ?? notAvailable },
  ];
  return (
    <DataGridTable
      rows={drills}
      columns={columns}
      getRowKey={(drill) => drill.id}
      caption={translateMessage("settings.restore.drillsTitle")}
      emptyTitle={translateMessage("settings.restore.noDrills")}
    />
  );
}
