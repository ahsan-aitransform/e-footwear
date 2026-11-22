"use client";

import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useFocusSearchWithControlF } from "@/features/masterData/hooks/useFocusSearchWithControlF";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import { formatPartyBalance } from "../logic/partyBalanceFormatting";
import { PartyStatusCodes, PartyTypeFilterCodes, type PartyListItemResponse } from "../types/partyTypes";

// Manage Party (docx 3.2) and Search Party (docx 3.3) are the same grid with different row actions: Manage edits and deletes,
// Search opens the party's account detail. Both filter by type (customer / vendor / staff), city and status.
export function PartyListPage({ mode }: { mode: "manage" | "search" }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const containerReference = useRef<HTMLDivElement>(null);
  useFocusSearchWithControlF(containerReference);
  const [partyTypeCode, setPartyTypeCode] = useState<string>(PartyTypeFilterCodes.all);
  const [cityId, setCityId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toDelete, setToDelete] = useState<PartyListItemResponse | null>(null);
  const [message, setMessage] = useState<string>();

  const cities = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.cities));
  const mayEdit = hasPermission(PermissionCodes.PARTY.NEW_PARTY.EDIT);
  const mayDelete = hasPermission(PermissionCodes.PARTY.VIEW_PARTY.DELETE);
  const mayOpenDetail = hasPermission(PermissionCodes.PARTY.ACCOUNT_DETAIL.VIEW);

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(ApiEndpoints.parties.byId(toDelete.id), { method: "DELETE" });
    if (!result.ok) setMessage(result.problem.message);
    else {
      setMessage(undefined);
      showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
      setRefreshCounter((counter) => counter + 1);
    }
    setToDelete(null);
  }

  const columns = useMemo<DataGridColumn<PartyListItemResponse>[]>(
    () => [
      { key: "code", header: translateMessage("parties.field.code"), isSortable: true, render: (row) => <span dir="ltr">{row.code}</span> },
      { key: "name", header: translateMessage("parties.field.name"), isSortable: true, render: (row) => row.name },
      { key: "primaryPhone", header: translateMessage("parties.field.primaryPhone"), isSecondary: true, render: (row) => <span dir="ltr">{row.primaryPhone ?? ""}</span> },
      { key: "cityName", header: translateMessage("parties.field.city"), isSecondary: true, render: (row) => row.cityName ?? "" },
      {
        key: "types",
        header: translateMessage("parties.field.partyType"),
        isSecondary: true,
        render: (row) =>
          [row.isCustomer && translateMessage("parties.type.customer"), row.isVendor && translateMessage("parties.type.vendor"), row.isStaff && translateMessage("parties.type.staff")]
            .filter(Boolean)
            .join(", "),
      },
      { key: "balance", header: translateMessage("parties.field.balance"), isSortable: true, alignment: "end", render: (row) => formatPartyBalance(row.balanceAmount, { receivable: translateMessage("parties.balance.receivable"), payable: translateMessage("parties.balance.payable") }) },
      { key: "statusCode", header: translateMessage("parties.field.status"), render: (row) => <StatusBadge statusCode={row.statusCode} /> },
      {
        key: "actions",
        header: translateMessage("masterData.column.actions"),
        alignment: "end",
        render: (row) => (
          <div className="flex justify-end gap-1">
            {mayOpenDetail && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("parties.action.accountDetail")} onClick={() => router.push(`${ApplicationRoutes.partyAccountDetail}?partyId=${row.id}`)}>
                <ReceiptText />
              </Button>
            )}
            {mode === "manage" && mayEdit && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.edit")} onClick={() => router.push(ApplicationRoutes.editParty(row.id))}>
                <Pencil />
              </Button>
            )}
            {mode === "manage" && mayDelete && (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.delete")} onClick={() => setToDelete(row)}>
                <Trash2 />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [translateMessage, mode, mayEdit, mayDelete, mayOpenDetail, router],
  );

  const titleKey = mode === "manage" ? "navigation.item.manageParties" : "navigation.item.searchParties";
  return (
    <div ref={containerReference} className="space-y-6">
      <PageHeader title={translateMessage(titleKey)} subtitle={translateMessage(mode === "manage" ? "parties.manage.subtitle" : "parties.search.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label={translateMessage("parties.field.partyType")} name="partyTypeFilter">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={partyTypeCode} onChange={(event) => setPartyTypeCode(event.target.value)}>
                <option value={PartyTypeFilterCodes.all}>{translateMessage("parties.type.all")}</option>
                <option value={PartyTypeFilterCodes.customer}>{translateMessage("parties.type.customer")}</option>
                <option value={PartyTypeFilterCodes.vendor}>{translateMessage("parties.type.vendor")}</option>
                <option value={PartyTypeFilterCodes.staff}>{translateMessage("parties.type.staff")}</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField label={translateMessage("parties.field.city")} name="cityFilter">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={cityId} onChange={(event) => setCityId(event.target.value)}>
                <option value="">{translateMessage("parties.filter.allCities")}</option>
                {(cities.data ?? []).map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField label={translateMessage("parties.field.status")} name="statusFilter">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
                <option value="">{translateMessage("parties.filter.anyStatus")}</option>
                <option value={PartyStatusCodes.active}>{translateMessage("common.status.active")}</option>
                <option value={PartyStatusCodes.inactive}>{translateMessage("common.status.inactive")}</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={message} />
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<PartyListItemResponse>
          path={mode === "manage" ? ApiEndpoints.parties.list : ApiEndpoints.parties.search}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={translateMessage(titleKey)}
          emptyTitle={translateMessage("parties.empty.title")}
          emptyText={translateMessage("parties.empty.text")}
          filters={{ partyTypeCode, cityId: cityId || undefined, statusCode: statusCode || undefined, refreshKey: refreshCounter }}
          onRowOpen={mode === "manage" && mayEdit ? (row) => router.push(ApplicationRoutes.editParty(row.id)) : undefined}
          searchPlaceholder={translateMessage("parties.search.placeholder")}
          offlineCacheName={mode === "manage" ? "partiesManage" : "partiesSearch"}
        />
      </SectionCard>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
