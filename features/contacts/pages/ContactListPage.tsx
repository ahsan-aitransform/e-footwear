"use client";

import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
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
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import type { StoreSummaryResponse } from "@/lib/types/store";
import { useFocusSearchWithControlF } from "@/features/masterData/hooks/useFocusSearchWithControlF";
import type { MasterListOptionResponse } from "@/features/masterData/types/masterListTypes";
import { formatContactBalance } from "../logic/contactBalanceFormatting";
import type { ContactScreenConfig } from "../types/contactScreenConfig";
import { ContactStatusCodes, CustomerTypeCodes, type ContactListItemResponse } from "../types/contactTypes";

// The View screen of customers, vendors and staff: search, open the account detail, edit and delete. It filters by city and
// status (and by store for staff). A screen that edits in a dialog passes onEditContact (otherwise Edit opens the edit page of the config) and raises
// refreshSignal after a save.
export function ContactListPage({
  config,
  onEditContact,
  toolbarActions,
  refreshSignal = 0,
}: {
  config: ContactScreenConfig;
  onEditContact?: (contactId: string) => void;
  toolbarActions?: ReactNode;
  refreshSignal?: number;
}) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const prefix = config.messagePrefix;
  const text = (suffix: string) => translateMessage(`${prefix}.${suffix}` as MessageKey);
  const containerReference = useRef<HTMLDivElement>(null);
  useFocusSearchWithControlF(containerReference);
  const [cityId, setCityId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [toDelete, setToDelete] = useState<ContactListItemResponse | null>(null);
  const [message, setMessage] = useState<string>();

  const isStaff = config.kind === "staff";
  const cities = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.cities));
  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores, { enabled: isStaff });
  const mayEdit = hasPermission(config.permissions.edit);
  const mayDelete = hasPermission(config.permissions.remove);
  const mayOpenDetail = config.routes.accountDetail !== undefined && hasPermission(config.permissions.accountDetailView);

  function editContact(contactId: string) {
    if (onEditContact) onEditContact(contactId);
    else if (config.routes.editContact) router.push(config.routes.editContact(contactId));
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(config.endpoints.byId(toDelete.id), { method: "DELETE" });
    if (!result.ok) setMessage(result.problem.message);
    else {
      setMessage(undefined);
      showToast(translateMessage("masterData.toast.deleted"), ToneNames.success);
      setRefreshCounter((counter) => counter + 1);
    }
    setToDelete(null);
  }

  const columns = useMemo<DataGridColumn<ContactListItemResponse>[]>(
    () => {
      const words = { receivable: translateMessage(`${prefix}.balance.receivable` as MessageKey), payable: translateMessage(`${prefix}.balance.payable` as MessageKey) };
      const label = (suffix: string) => translateMessage(`${prefix}.${suffix}` as MessageKey);
      const result: DataGridColumn<ContactListItemResponse>[] = [
        { key: "code", header: label("field.code"), isSortable: true, render: (row) => <span dir="ltr">{row.code}</span> },
        { key: "name", header: label("field.name"), isSortable: true, render: (row) => row.name },
        { key: "phone", header: label("field.phone"), isSecondary: true, render: (row) => <span dir="ltr">{row.phone ?? ""}</span> },
        { key: "cityName", header: label("field.city"), isSecondary: true, render: (row) => row.cityName ?? "" },
      ];
      if (config.kind === "customer") {
        result.push({ key: "cnic", header: label("field.cnic"), isSecondary: true, render: (row) => <span dir="ltr">{row.cnic ?? ""}</span> });
        result.push({ key: "customerTypeCode", header: label("field.customerType"), render: (row) => label(row.customerTypeCode === CustomerTypeCodes.special ? "type.special" : "type.regular") });
      }
      if (isStaff) {
        result.push({ key: "designation", header: label("field.designation"), isSecondary: true, render: (row) => row.designation ?? "" });
        result.push({ key: "storeName", header: label("field.store"), isSecondary: true, render: (row) => row.storeName ?? "" });
      }
      if (config.kind === "vendor") {
        result.push({ key: "creditLimit", header: label("field.creditLimit"), isSecondary: true, alignment: "end", render: (row) => (row.creditLimit === null || row.creditLimit === undefined ? "" : formatWholeRupees(row.creditLimit)) });
      }
      result.push(
        { key: "balance", header: label("field.balance"), isSortable: true, alignment: "end", render: (row) => formatContactBalance(row.balanceAmount, words) },
        { key: "statusCode", header: label("field.status"), render: (row) => <StatusBadge statusCode={row.statusCode} /> },
        {
          key: "actions",
          header: translateMessage("masterData.column.actions"),
          alignment: "end",
          render: (row) => (
            <div className="flex justify-end gap-1">
              {mayOpenDetail && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={label("action.accountDetail")} onClick={() => router.push(`${config.routes.accountDetail}?${config.ledgerContactQueryName}=${row.id}`)}>
                  <ReceiptText />
                </Button>
              )}
              {mayEdit && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.edit")} onClick={() => editContact(row.id)}>
                  <Pencil />
                </Button>
              )}
              {mayDelete && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.delete")} onClick={() => setToDelete(row)}>
                  <Trash2 />
                </Button>
              )}
            </div>
          ),
        },
      );
      return result;
    },
    // editContact only reads the callback, the config and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage, prefix, config, isStaff, mayEdit, mayDelete, mayOpenDetail, router, onEditContact],
  );

  const titleKey = config.titleMessageKeys.viewContacts as MessageKey;
  return (
    <div ref={containerReference} className="space-y-6">
      <PageHeader title={translateMessage(titleKey)} subtitle={text("manage.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label={text("field.city")} name="cityFilter">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={cityId} onChange={(event) => setCityId(event.target.value)}>
                <option value="">{text("filter.allCities")}</option>
                {(cities.data ?? []).map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          {isStaff && (
            <FormField label={text("field.store")} name="storeFilter">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                  <option value="">{text("filter.allStores")}</option>
                  {(stores.data ?? []).filter((store) => !store.isHeadOffice).map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          )}
          <FormField label={text("field.status")} name="statusFilter">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
                <option value="">{text("filter.anyStatus")}</option>
                <option value={ContactStatusCodes.active}>{translateMessage("common.status.active")}</option>
                <option value={ContactStatusCodes.inactive}>{translateMessage("common.status.inactive")}</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={message} />
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<ContactListItemResponse>
          path={config.endpoints.list}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={translateMessage(titleKey)}
          emptyTitle={text("empty.title")}
          emptyText={text("empty.text")}
          filters={{ cityId: cityId || undefined, storeId: storeId || undefined, statusCode: statusCode || undefined }}
          refreshKey={refreshCounter + refreshSignal}
          onRowOpen={mayEdit ? (row) => editContact(row.id) : undefined}
          toolbarActions={toolbarActions}
          searchPlaceholder={text("search.placeholder")}
          offlineCacheName={config.offlineCacheName}
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
