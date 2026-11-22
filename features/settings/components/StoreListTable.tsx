"use client";

import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { StoreSummaryResponse } from "@/lib/types/store";

// The stores of a company: code, name, type (head office or store) and, when asked, whether the store is active.
export function StoreListTable({
  stores,
  caption,
  emptyTitle,
  emptyText,
  isLoading = false,
  showStatusColumn = false,
}: {
  stores: readonly StoreSummaryResponse[];
  caption: string;
  emptyTitle: string;
  emptyText?: string;
  isLoading?: boolean;
  showStatusColumn?: boolean;
}) {
  const { translateMessage } = useTranslation();

  const columns: DataGridColumn<StoreSummaryResponse>[] = [
    { key: "code", header: translateMessage("settings.storeTable.codeColumn"), render: (store) => <strong>{store.code}</strong> },
    { key: "name", header: translateMessage("settings.storeTable.nameColumn"), render: (store) => store.name },
    {
      key: "type",
      header: translateMessage("settings.storeTable.typeColumn"),
      render: (store) =>
        store.isHeadOffice ? (
          <ToneBadge tone={ToneNames.highlight}>{translateMessage("common.headOffice")}</ToneBadge>
        ) : (
          <ToneBadge>{translateMessage("common.store")}</ToneBadge>
        ),
    },
  ];
  if (showStatusColumn) {
    columns.push({
      key: "status",
      header: translateMessage("settings.storeTable.statusColumn"),
      render: (store) => (
        <ToneBadge tone={store.isActive ? ToneNames.success : ToneNames.danger}>
          {translateMessage(store.isActive ? "common.status.active" : "common.status.inactive")}
        </ToneBadge>
      ),
    });
  }

  return (
    <DataGridTable
      rows={stores}
      columns={columns}
      getRowKey={(store) => store.id}
      caption={caption}
      isLoading={isLoading}
      emptyTitle={emptyTitle}
      emptyText={emptyText}
    />
  );
}
