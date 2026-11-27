"use client";

import { useState } from "react";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SearchButton } from "@/components/forms/SearchButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PosTerminalResponse } from "@/lib/types/settings";
import { formatTimestamp } from "../formatTimestamp";
import { useSellingStores } from "../hooks/useSellingStores";

// POS Terminals: the devices registered to the stores the person works in (read-only; devices are registered in the Security module).
export function PosTerminalsPage() {
  const { translateMessage } = useTranslation();
  const { sellingStores } = useSellingStores();
  const [storeId, setStoreId] = useState("");
  const [searchedStoreId, setSearchedStoreId] = useState("");
  const terminals = useApiQuery<PosTerminalResponse[]>(ApiEndpoints.posTerminals.list, { query: { storeId: searchedStoreId || undefined } });
  const notAvailable = translateMessage("common.notAvailable");

  const columns: DataGridColumn<PosTerminalResponse>[] = [
    { key: "store", header: translateMessage("common.store"), sortValue: (terminal) => terminal.storeCode, render: (terminal) => <span className="font-mono">{terminal.storeCode}</span> },
    { key: "label", header: translateMessage("settings.posTerminals.label"), render: (terminal) => terminal.label ?? notAvailable },
    {
      key: "status",
      header: translateMessage("settings.storeManagement.status"),
      sortValue: (terminal) => (terminal.isActive ? 0 : 1),
      render: (terminal) => (
        <ToneBadge tone={terminal.isActive ? ToneNames.success : ToneNames.warning}>
          {translateMessage(terminal.isActive ? "common.status.active" : "common.status.inactive")}
        </ToneBadge>
      ),
    },
    { key: "lastSeen", header: translateMessage("settings.posTerminals.lastSeen"), isSecondary: true, sortValue: (terminal) => terminal.lastSeenAt, render: (terminal) => formatTimestamp(terminal.lastSeenAt, notAvailable) },
  ];

  return (
    <>
      <PageHeader title={translateMessage("settings.posTerminals.title")} subtitle={translateMessage("settings.posTerminals.subtitle")} />
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchedStoreId(storeId);
          terminals.refetch();
        }}
      >
      <FormField label={translateMessage("common.store")} name="pos-terminals-store">
        {(controlProps) => (
          <NativeSelect {...controlProps} value={storeId} onChange={(event) => setStoreId(event.target.value)}>
            <option value="">{translateMessage("common.allStores")}</option>
            {sellingStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.code} - {store.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <SearchButton />
      </form>
      <SectionCard isPadded={false}>
        <DataGridTable
          rows={terminals.data ?? []}
          columns={columns}
          getRowKey={(terminal) => terminal.id}
          caption={translateMessage("settings.posTerminals.title")}
          isLoading={terminals.status === "loading"}
          errorMessage={terminals.status === "error" ? terminals.problem?.message : undefined}
          emptyTitle={translateMessage("settings.posTerminals.empty")}
          emptyText={translateMessage("settings.posTerminals.emptyText")}
        />
      </SectionCard>
    </>
  );
}
