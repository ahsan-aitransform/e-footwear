"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { useToast } from "@/components/feedback/ToastProvider";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PlanUsageResponse, StoreDetailResponse } from "@/lib/types/storeManagement";
import { ManagedStoreForm } from "../components/ManagedStoreForm";

const mayAddStores = requireAnyPermission(PermissionCodes.SETTINGS.STORE_MANAGEMENT.ADD);

// Store Management: the stores of the company, how many the plan allows, and the forms to add, edit, deactivate and reactivate.
export function StoreManagementPage() {
  const { translateMessage } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionCodes.SETTINGS.STORE_MANAGEMENT.EDIT);
  const canDeactivate = hasPermission(PermissionCodes.SETTINGS.STORE_MANAGEMENT.DELETE);
  const stores = useApiQuery<StoreDetailResponse[]>(ApiEndpoints.storeManagement.list);
  const usage = useApiQuery<PlanUsageResponse>(ApiEndpoints.storeManagement.planUsage);
  const [editingStore, setEditingStore] = useState<StoreDetailResponse>();
  const [storeToDeactivate, setStoreToDeactivate] = useState<StoreDetailResponse>();
  const [isChanging, setIsChanging] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string>();

  function reload() {
    stores.refetch();
    usage.refetch();
  }

  async function changeActiveState(store: StoreDetailResponse, isActive: boolean) {
    setIsChanging(true);
    setActionErrorMessage(undefined);
    const result = await apiRequest(isActive ? ApiEndpoints.storeManagement.activate(store.id) : ApiEndpoints.storeManagement.deactivate(store.id), {
      method: "POST",
    });
    setIsChanging(false);
    setStoreToDeactivate(undefined);
    if (!result.ok) {
      setActionErrorMessage(result.kind === "offline" ? translateMessage("errors.noConnectionToServer") : result.problem.message);
      return;
    }
    showToast(translateMessage(isActive ? "settings.storeManagement.activated" : "settings.storeManagement.deactivated"));
    reload();
  }

  const columns: DataGridColumn<StoreDetailResponse>[] = [
    { key: "code", header: translateMessage("settings.storeManagement.code"), render: (store) => <span className="font-mono">{store.code}</span> },
    {
      key: "name",
      header: translateMessage("settings.storeManagement.name"),
      render: (store) => (
        <span>
          {store.name}
          {store.isHeadOffice && <span className="ms-2 text-xs text-muted-foreground">({translateMessage("common.headOffice")})</span>}
        </span>
      ),
    },
    { key: "address", header: translateMessage("settings.storeManagement.address"), isSecondary: true, render: (store) => store.address ?? translateMessage("common.notAvailable") },
    { key: "phone", header: translateMessage("settings.storeManagement.phone"), isSecondary: true, render: (store) => store.phone ?? translateMessage("common.notAvailable") },
    {
      key: "status",
      header: translateMessage("settings.storeManagement.status"),
      render: (store) => (
        <ToneBadge tone={store.isActive ? ToneNames.success : ToneNames.warning}>
          {translateMessage(store.isActive ? "common.status.active" : "common.status.inactive")}
        </ToneBadge>
      ),
    },
    {
      key: "actions",
      header: translateMessage("common.actions"),
      alignment: "end",
      render: (store) => (
        <div className="flex justify-end gap-2">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditingStore(store)}>
              {translateMessage("common.edit")}
            </Button>
          )}
          {!store.isHeadOffice && store.isActive && canDeactivate && (
            <Button size="sm" variant="destructive" onClick={() => setStoreToDeactivate(store)}>
              {translateMessage("settings.storeManagement.deactivate")}
            </Button>
          )}
          {!store.isHeadOffice && !store.isActive && canEdit && (
            <Button size="sm" variant="outline" disabled={isChanging} onClick={() => void changeActiveState(store, true)}>
              {translateMessage("settings.storeManagement.activate")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const planUsage = usage.data;

  return (
    <>
      <PageHeader title={translateMessage("settings.storeManagement.title")} subtitle={translateMessage("settings.storeManagement.subtitle")} />
      {planUsage && (
        <InlineNotice tone={planUsage.activeStores >= planUsage.maximumStores ? ToneNames.warning : ToneNames.info}>
          {translateMessage("settings.storeManagement.planUsage", {
            planName: planUsage.planName,
            activeStores: planUsage.activeStores,
            maximumStores: planUsage.maximumStores,
            users: planUsage.users,
            maximumUsers: planUsage.maximumUsers,
          })}
        </InlineNotice>
      )}
      {actionErrorMessage && <InlineNotice>{actionErrorMessage}</InlineNotice>}
      <SectionCard title={translateMessage("settings.storeManagement.listTitle")} isPadded={false}>
        <DataGridTable
          rows={stores.data ?? []}
          columns={columns}
          getRowKey={(store) => store.id}
          caption={translateMessage("settings.storeManagement.listTitle")}
          isLoading={stores.status === "loading"}
          errorMessage={stores.status === "error" ? stores.problem?.message : undefined}
          emptyTitle={translateMessage("settings.storeManagement.empty")}
        />
      </SectionCard>

      {editingStore && (
        <SectionCard title={translateMessage("settings.storeManagement.editTitle", { code: editingStore.code })}>
          <ManagedStoreForm
            key={`${editingStore.id}:${editingStore.rowVersion}`}
            store={editingStore}
            onCancel={() => setEditingStore(undefined)}
            onSaved={() => {
              setEditingStore(undefined);
              reload();
            }}
          />
        </SectionCard>
      )}

      <PermissionGate requirement={mayAddStores}>
        <SectionCard title={translateMessage("settings.storeManagement.createTitle")} description={translateMessage("settings.storeManagement.createDescription")}>
          <ManagedStoreForm onSaved={reload} />
        </SectionCard>
      </PermissionGate>

      <ConfirmDialog
        open={storeToDeactivate !== undefined}
        onOpenChange={(open) => {
          if (!open) setStoreToDeactivate(undefined);
        }}
        isPending={isChanging}
        titleMessageKey="settings.storeManagement.deactivateTitle"
        descriptionMessageKey="settings.storeManagement.deactivateText"
        confirmLabelMessageKey="settings.storeManagement.deactivate"
        onConfirm={() => storeToDeactivate && void changeActiveState(storeToDeactivate, false)}
      />
    </>
  );
}
