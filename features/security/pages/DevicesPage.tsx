"use client";

import { useState, type FormEvent } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames, type ToneName } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { useIsOnline } from "@/lib/session/useSessionState";
import { DeviceStatusCodes, type DeviceResponse, type DeviceStatusCode, type RegisteredDeviceResponse } from "@/lib/types/device";
import type { StoreSummaryResponse } from "@/lib/types/store";
import { formatTimestamp } from "../logic/formatTimestamp";

const toneByStatus: Record<DeviceStatusCode, ToneName> = {
  [DeviceStatusCodes.pending]: ToneNames.warning,
  [DeviceStatusCodes.authorized]: ToneNames.success,
  [DeviceStatusCodes.revoked]: ToneNames.danger,
};

const messageKeyByStatus: Record<DeviceStatusCode, MessageKey> = {
  [DeviceStatusCodes.pending]: "securityManagement.devices.status.PENDING",
  [DeviceStatusCodes.authorized]: "securityManagement.devices.status.AUTHORIZED",
  [DeviceStatusCodes.revoked]: "securityManagement.devices.status.REVOKED",
};

// POS devices (Part 6 device authorization): register a device for a store, authorize it, revoke it, give it a new token.
// The token is shown ONCE, when it is created; only its hash is stored on the server. What an authorized device may do (offline
// synchronization) is built in the offline module.
export function DevicesPage() {
  const { translateMessage, languageCode } = useTranslation();
  const isOnline = useIsOnline();
  const devicesQuery = useApiQuery<DeviceResponse[]>(ApiEndpoints.devices.list);
  const storesQuery = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);
  const [label, setLabel] = useState("");
  const [storeId, setStoreId] = useState("");
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>();
  const [issuedToken, setIssuedToken] = useState<RegisteredDeviceResponse>();
  const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceResponse>();
  const [revokeReason, setRevokeReason] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const sellingStores = (storesQuery.data ?? []).filter((store) => !store.isHeadOffice && store.isActive);

  async function runAction(action: () => Promise<{ ok: boolean; message?: string; token?: RegisteredDeviceResponse }>) {
    setIsBusy(true);
    setErrorMessage(undefined);
    const outcome = await action();
    setIsBusy(false);
    if (outcome.ok) {
      if (outcome.token) setIssuedToken(outcome.token);
      devicesQuery.refetch();
    } else setErrorMessage(outcome.message);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosenStoreId = storeId || sellingStores[0]?.id || "";
    if (!label.trim()) {
      setFieldErrorMessages({ label: translateMessage("securityManagement.devices.labelRequired") });
      return;
    }
    setFieldErrorMessages({});
    await runAction(async () => {
      const result = await apiRequest<RegisteredDeviceResponse>(ApiEndpoints.devices.register, {
        method: "POST",
        body: { storeId: chosenStoreId, label: label.trim(), deviceUuid: null },
      });
      if (result.ok) setLabel("");
      return result.ok ? { ok: true, token: result.data } : { ok: false, message: result.problem.message };
    });
  }

  async function handleAuthorize(device: DeviceResponse) {
    await runAction(async () => {
      const result = await apiRequest(ApiEndpoints.devices.authorize(device.id), { method: "POST" });
      return result.ok ? { ok: true } : { ok: false, message: result.problem.message };
    });
  }

  async function handleRotateToken(device: DeviceResponse) {
    await runAction(async () => {
      const result = await apiRequest<RegisteredDeviceResponse>(ApiEndpoints.devices.rotateToken(device.id), { method: "POST" });
      return result.ok ? { ok: true, token: result.data } : { ok: false, message: result.problem.message };
    });
  }

  async function handleRevoke() {
    if (!deviceToRevoke) return;
    const device = deviceToRevoke;
    setDeviceToRevoke(undefined);
    await runAction(async () => {
      const result = await apiRequest(ApiEndpoints.devices.revoke(device.id), { method: "POST", body: { reason: revokeReason.trim() || null } });
      if (result.ok) setRevokeReason("");
      return result.ok ? { ok: true } : { ok: false, message: result.problem.message };
    });
  }

  const columns: DataGridColumn<DeviceResponse>[] = [
    { key: "label", header: translateMessage("securityManagement.devices.labelColumn"), render: (device) => <strong>{device.label}</strong> },
    { key: "storeCode", header: translateMessage("securityManagement.devices.storeColumn"), render: (device) => device.storeCode },
    {
      key: "status",
      header: translateMessage("securityManagement.devices.statusColumn"),
      render: (device) => <ToneBadge tone={toneByStatus[device.status]}>{translateMessage(messageKeyByStatus[device.status])}</ToneBadge>,
    },
    {
      key: "lastSeenAt",
      header: translateMessage("securityManagement.devices.lastSeenColumn"),
      isSecondary: true,
      render: (device) => (device.lastSeenAt ? formatTimestamp(device.lastSeenAt, languageCode) : translateMessage("securityManagement.devices.neverSeen")),
    },
    {
      key: "actions",
      header: "",
      alignment: "end",
      render: (device) => (
        <span className="inline-flex flex-wrap justify-end gap-1.5">
          {device.status !== DeviceStatusCodes.authorized && (
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.APPROVE)}>
              <Button type="button" size="sm" disabled={isBusy || !isOnline} onClick={() => handleAuthorize(device)}>
                {translateMessage("securityManagement.devices.authorize")}
              </Button>
            </PermissionGate>
          )}
          {device.status !== DeviceStatusCodes.revoked && (
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.APPROVE)}>
              <Button type="button" variant="destructive" size="sm" disabled={isBusy || !isOnline} onClick={() => setDeviceToRevoke(device)}>
                {translateMessage("securityManagement.devices.revoke")}
              </Button>
            </PermissionGate>
          )}
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.EDIT)}>
            <Button type="button" variant="outline" size="sm" disabled={isBusy || !isOnline} onClick={() => handleRotateToken(device)}>
              {translateMessage("securityManagement.devices.newToken")}
            </Button>
          </PermissionGate>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("securityManagement.devices.title")} subtitle={translateMessage("securityManagement.devices.subtitle")} />
      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      {issuedToken && (
        <SectionCard title={translateMessage("securityManagement.devices.tokenTitle", { deviceLabel: issuedToken.device.label ?? "" })}>
          <div className="space-y-2">
            <InlineNotice tone={ToneNames.warning}>{translateMessage("securityManagement.devices.tokenWarning")}</InlineNotice>
            <input
              readOnly
              value={issuedToken.deviceToken}
              aria-label={translateMessage("securityManagement.devices.tokenLabel")}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-md border bg-muted px-2 py-1.5 font-mono text-xs"
              dir="ltr"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setIssuedToken(undefined)}>
              {translateMessage("securityManagement.devices.tokenDone")}
            </Button>
          </div>
        </SectionCard>
      )}

      <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEVICES_AND_POS_TERMINALS.ADD)}>
        <SectionCard title={translateMessage("securityManagement.devices.registerTitle")}>
          <form onSubmit={handleRegister} className="grid items-end gap-4 sm:grid-cols-3" noValidate>
            <TextInputField
              label={translateMessage("securityManagement.devices.labelLabel")}
              name="deviceLabel"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              errorMessage={fieldErrorMessages.label}
              required
            />
            <FormField label={translateMessage("securityManagement.devices.storeLabel")} name="deviceStore" isRequired>
              {(controlProps) => (
                <NativeSelect {...controlProps} value={storeId || sellingStores[0]?.id || ""} onChange={(event) => setStoreId(event.target.value)}>
                  {sellingStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} · {store.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <Button type="submit" disabled={isBusy || !isOnline || sellingStores.length === 0}>
              {translateMessage("securityManagement.devices.register")}
            </Button>
          </form>
        </SectionCard>
      </PermissionGate>

      <SectionCard isPadded={false}>
        <DataGridTable
          rows={devicesQuery.data ?? []}
          columns={columns}
          getRowKey={(device) => device.id}
          caption={translateMessage("securityManagement.devices.title")}
          isLoading={devicesQuery.status === "loading"}
          errorMessage={devicesQuery.status === "error" ? devicesQuery.problem?.message : undefined}
          emptyTitle={translateMessage("securityManagement.devices.empty")}
        />
      </SectionCard>

      {deviceToRevoke && (
        <SectionCard
          title={translateMessage("securityManagement.devices.revokeTitle")}
          description={translateMessage("securityManagement.devices.revokeText", { deviceLabel: deviceToRevoke.label ?? "" })}
        >
          <div className="flex max-w-xl flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <TextInputField
                label={translateMessage("securityManagement.devices.revokeReasonLabel")}
                name="revokeReason"
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
                maxLength={200}
              />
            </div>
            <Button type="button" variant="destructive" disabled={isBusy} onClick={handleRevoke}>
              {translateMessage("securityManagement.devices.revoke")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDeviceToRevoke(undefined)}>
              {translateMessage("securityManagement.partialEdit.close")}
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
