"use client";

import { CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { StoreFilterSelect } from "@/features/payroll/components/StoreFilterSelect";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { ApproveCommissionsDialog } from "../components/ApproveCommissionsDialog";
import { CommissionStaffFilterSelect } from "../components/CommissionStaffFilterSelect";
import { CommissionStatusBadge } from "../components/CommissionStatusBadge";
import { describeCommission } from "../logic/commissionFormatting";
import {
  commissionEntryStatusFilterCodeList,
  type CommissionEntryResponse,
  type CommissionEntryTotalsResponse,
} from "../types/commissionTypes";

const money = (amount: number) => formatWholeRupees(amount, { withSymbol: false });

// Commission Entries (Part 16.2): the commission every sale earned, one row per sold line and person, with what is waiting for approval, what is approved and what
// was paid with salary. A return or a voided invoice shows as a "taken back" row with a negative amount. Approving is a separate action with its own permission.
export function CommissionEntriesPage() {
  const { translateMessage } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const hasValidDates = (fromDate === "" || isValidIsoDate(fromDate)) && (toDate === "" || isValidIsoDate(toDate));
  const isDateOrderWrong = fromDate !== "" && toDate !== "" && hasValidDates && fromDate > toDate;
  const filters = useMemo(
    () => ({ storeId, staffId, statusCode, fromDate: hasValidDates ? fromDate : "", toDate: hasValidDates ? toDate : "" }),
    [storeId, staffId, statusCode, fromDate, toDate, hasValidDates],
  );
  // The totals and the list show what was last searched.
  const [searchedFilters, setSearchedFilters] = useState(filters);
  const totals = useApiQuery<CommissionEntryTotalsResponse>(ApiEndpoints.commissions.entryTotals, { query: { ...searchedFilters, refreshKey: refreshCounter } });

  const statusOptions: OptionSelectOption[] = commissionEntryStatusFilterCodeList.map((code) => ({ value: code, label: translateMessage(`commissions.status.${code}`) }));

  const columns = useMemo<DataGridColumn<CommissionEntryResponse>[]>(
    () => [
      { key: "saleDate", header: translateMessage("commissions.entries.column.date"), isSortable: true, render: (entry) => <span dir="ltr">{entry.saleDate}</span> },
      { key: "invoiceNumber", header: translateMessage("commissions.entries.column.invoice"), isSortable: true, render: (entry) => <span dir="ltr">{entry.invoiceNumber}</span> },
      { key: "staffName", header: translateMessage("commissions.entries.column.staff"), isSortable: true, render: (entry) => `${entry.staffName} (${entry.staffCode})` },
      { key: "storeName", header: translateMessage("commissions.entries.column.store"), isSecondary: true, render: (entry) => entry.storeName },
      { key: "planName", header: translateMessage("commissions.entries.column.plan"), isSecondary: true, render: (entry) => entry.planName },
      { key: "entryTypeCode", header: translateMessage("commissions.entries.column.type"), render: (entry) => translateMessage(`commissions.entries.type.${entry.entryTypeCode as "EARN" | "REVERSAL"}`) },
      { key: "rate", header: translateMessage("commissions.entries.column.rate"), isSecondary: true, render: (entry) => describeCommission(translateMessage, entry.calculationTypeCode, entry.rate, entry.fixedAmountPerPiece) },
      { key: "baseAmount", header: translateMessage("commissions.entries.column.base"), isSortable: true, alignment: "end", render: (entry) => <span dir="ltr">{money(entry.baseAmount)}</span> },
      { key: "commissionAmount", header: translateMessage("commissions.entries.column.commission"), isSortable: true, alignment: "end", render: (entry) => <span dir="ltr">{money(entry.commissionAmount)}</span> },
      { key: "statusCode", header: translateMessage("commissions.entries.column.status"), isSortable: true, render: (entry) => <CommissionStatusBadge statusCode={entry.statusCode} /> },
      { key: "salaryMonth", header: translateMessage("commissions.entries.column.salaryMonth"), isSecondary: true, render: (entry) => <span dir="ltr">{entry.salaryMonth ? entry.salaryMonth.slice(0, 7) : ""}</span> },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("commissions.entries.title")}
        subtitle={translateMessage("commissions.entries.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_ENTRIES.APPROVE)}>
            <Button type="button" onClick={() => setIsApproving(true)}>
              <CheckCheck />
              {translateMessage("commissions.entries.approve.open")}
            </Button>
          </PermissionGate>
        }
      />
      <SectionCard>
        <div className="grid items-end gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StoreFilterSelect name="commission-entries-store" label={translateMessage("commissions.entries.filter.store")} allStoresLabel={translateMessage("commissions.entries.filter.allStores")} storeId={storeId} onStoreIdChange={setStoreId} />
          <CommissionStaffFilterSelect name="commission-entries-staff" label={translateMessage("commissions.entries.filter.staff")} allStaffLabel={translateMessage("commissions.entries.filter.allStaff")} staffId={staffId} onStaffIdChange={setStaffId} />
          <FormField label={translateMessage("commissions.entries.filter.status")} name="commission-entries-status">
            {(controlProps) => <OptionSelect {...controlProps} options={statusOptions} value={statusCode} onValueChange={setStatusCode} emptyOptionLabel={translateMessage("commissions.entries.filter.allStatuses")} />}
          </FormField>
          <DateField label={translateMessage("commissions.entries.filter.fromDate")} name="commission-entries-from" value={fromDate} onValueChange={setFromDate} />
          <DateField label={translateMessage("commissions.entries.filter.toDate")} name="commission-entries-to" value={toDate} onValueChange={setToDate} />
        </div>
        {isDateOrderWrong && <InlineNotice tone={ToneNames.warning}>{translateMessage("commissions.entries.filter.dateOrder")}</InlineNotice>}
      </SectionCard>

      {totals.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TotalCard label={translateMessage("commissions.entries.totals.pending")} amount={totals.data.pendingAmount} />
          <TotalCard label={translateMessage("commissions.entries.totals.approved")} amount={totals.data.approvedAmount} />
          <TotalCard label={translateMessage("commissions.entries.totals.paid")} amount={totals.data.paidAmount} />
          <TotalCard label={translateMessage("commissions.entries.totals.total")} amount={totals.data.totalAmount} note={translateMessage("commissions.entries.totals.count", { count: totals.data.entryCount })} />
        </div>
      )}

      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<CommissionEntryResponse>
          path={ApiEndpoints.commissions.entries}
          columns={columns}
          getRowKey={(entry) => entry.id}
          caption={translateMessage("commissions.entries.title")}
          emptyTitle={translateMessage("commissions.entries.empty")}
          emptyText={translateMessage("commissions.entries.emptyText")}
          searchPlaceholder={translateMessage("commissions.entries.search")}
          filters={filters}
          refreshKey={refreshCounter}
          onSearch={() => {
            setSearchedFilters(filters);
            totals.refetch();
          }}
          isSearchDisabled={isDateOrderWrong}
          defaultSort={{ columnKey: "saleDate", direction: "descending" }}
        />
      </SectionCard>

      {isApproving && (
        <ApproveCommissionsDialog
          onClose={() => setIsApproving(false)}
          onApproved={() => {
            setIsApproving(false);
            setRefreshCounter((counter) => counter + 1);
          }}
        />
      )}
    </div>
  );
}

function TotalCard({ label, amount, note }: { label: string; amount: number; note?: string }) {
  return (
    <SectionCard>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" dir="ltr">
        {money(amount)}
      </p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </SectionCard>
  );
}
