"use client";

import { ArrowRightLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { DateField } from "@/components/forms/DateField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { StoreFilterSelect } from "@/features/payroll/components/StoreFilterSelect";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { StaffTransferDialog } from "../components/StaffTransferDialog";
import type { StaffTransferListItemResponse } from "../types/staffTypes";

function formatTimestamp(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 16).replace("T", " ");
}

// Staff Transfers (Part 16.1): every move of staff between stores, newest first: who moved, from which store to which, from which date and who authorised it.
// The history is only ever added to. A person who may use only some stores sees only the moves that touch their stores.
export function StaffTransfersPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const columns = useMemo<DataGridColumn<StaffTransferListItemResponse>[]>(
    () => [
      { key: "date", header: translateMessage("humanResources.storeHistory.column.effectiveOn"), isSortable: true, render: (move) => <span dir="ltr">{move.effectiveOn}</span> },
      { key: "code", header: translateMessage("humanResources.staff.column.code"), isSortable: true, isSecondary: true, render: (move) => <span dir="ltr">{move.staffCode}</span> },
      { key: "name", header: translateMessage("humanResources.transfers.column.staff"), isSortable: true, render: (move) => move.staffName },
      { key: "from", header: translateMessage("humanResources.storeHistory.column.fromStore"), render: (move) => move.fromStoreName ?? translateMessage("humanResources.storeHistory.firstAssignment") },
      { key: "to", header: translateMessage("humanResources.storeHistory.column.toStore"), render: (move) => move.toStoreName },
      { key: "authorisedBy", header: translateMessage("humanResources.storeHistory.column.authorisedBy"), isSecondary: true, render: (move) => move.changedByName ?? translateMessage("humanResources.storeHistory.unknownUser") },
      { key: "recordedAt", header: translateMessage("humanResources.storeHistory.column.recordedAt"), isSecondary: true, render: (move) => <span dir="ltr">{formatTimestamp(move.changedAt)}</span> },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("humanResources.transfers.title")}
        subtitle={translateMessage("humanResources.transfers.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.HUMAN_RESOURCES.STAFF_TRANSFERS.ADD)}>
            <Button type="button" onClick={() => setIsTransferOpen(true)}>
              <ArrowRightLeft />
              {translateMessage("humanResources.transfers.new")}
            </Button>
          </PermissionGate>
        }
      />
      <SectionCard>
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <StoreFilterSelect
            name="staff-transfers-store"
            label={translateMessage("humanResources.transfers.filter.store")}
            allStoresLabel={translateMessage("humanResources.staff.filter.allStores")}
            storeId={storeId}
            onStoreIdChange={setStoreId}
          />
          <DateField label={translateMessage("humanResources.transfers.filter.from")} name="staff-transfers-from" value={fromDate} onValueChange={setFromDate} />
          <DateField label={translateMessage("humanResources.transfers.filter.to")} name="staff-transfers-to" value={toDate} onValueChange={setToDate} />
        </div>
      </SectionCard>
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<StaffTransferListItemResponse>
          path={ApiEndpoints.staff.transfers}
          columns={columns}
          getRowKey={(move) => move.id}
          caption={translateMessage("humanResources.transfers.title")}
          emptyTitle={translateMessage("humanResources.transfers.empty.title")}
          emptyText={translateMessage("humanResources.transfers.empty.text")}
          filters={{ storeId: storeId || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, refreshKey: refreshCounter }}
          searchPlaceholder={translateMessage("humanResources.transfers.searchPlaceholder")}
          defaultSort={{ columnKey: "date", direction: "descending" }}
        />
      </SectionCard>
      {isTransferOpen && (
        <StaffTransferDialog
          onClose={() => setIsTransferOpen(false)}
          onTransferred={() => {
            setIsTransferOpen(false);
            setRefreshCounter((counter) => counter + 1);
          }}
        />
      )}
    </div>
  );
}
