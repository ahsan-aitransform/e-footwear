"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApiErrorCodes } from "@/lib/constants/apiErrorCodes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { useWorkingStoreId } from "@/features/parties/hooks/useWorkingStoreId";
import { PrintButton } from "../components/PrintControls";
import { VoucherDetailCard } from "../components/VoucherDetailCard";
import { useAccessibleStores } from "../hooks/useAccessibleStores";
import { isVoucherTypeCode, voucherTypeTitleMessageKeys } from "../logic/voucherTypeDefinitions";
import {
  VoucherStatusCodes,
  VoucherTypeCodes,
  type UpdateVoucherDescriptionRequest,
  type VoidVoucherRequest,
  type VoucherListItemResponse,
  type VoucherResponse,
  type VoucherTypeCode,
} from "../types/voucherTypes";

// What to show in the detail panel: a voucher found by type and number (the docx View button) or one opened from the list.
type VoucherLoadTarget = { kind: "number"; typeCode: VoucherTypeCode; number: number; storeId: string } | { kind: "id"; voucherId: string };

// View Voucher (docx 6.5): open one voucher by type and number (or from the searchable list), review its two lines, correct its description,
// or void it. The posted entry is never edited: "Update Description" changes only the narration kept on the voucher, and the docx "Delete"
// is a void that posts a reversing entry and keeps the voucher on record (Part 15). Printing is the browser's print dialog.
export function ViewVoucherPage() {
  const { translateMessage } = useTranslation();
  const searchParameters = useSearchParams();
  const workingStoreId = useWorkingStoreId();
  const { stores } = useAccessibleStores();

  const typeFromAddress = searchParameters.get("type");
  const numberFromAddress = Number.parseInt(searchParameters.get("number") ?? "", 10);
  const storeFromAddress = searchParameters.get("storeId") ?? "";
  const [typeCode, setTypeCode] = useState<VoucherTypeCode>(isVoucherTypeCode(typeFromAddress) ? typeFromAddress : VoucherTypeCodes.payment);
  const [numberText, setNumberText] = useState(Number.isSafeInteger(numberFromAddress) ? String(numberFromAddress) : "");
  const [chosenStoreId, setChosenStoreId] = useState(storeFromAddress);
  const storeId = chosenStoreId || workingStoreId || stores[0]?.id || "";

  const [loadTarget, setLoadTarget] = useState<VoucherLoadTarget | null>(
    isVoucherTypeCode(typeFromAddress) && Number.isSafeInteger(numberFromAddress) && storeFromAddress !== ""
      ? { kind: "number", typeCode: typeFromAddress, number: numberFromAddress, storeId: storeFromAddress }
      : null,
  );
  const [listTypeCode, setListTypeCode] = useState("");
  const [listStatusCode, setListStatusCode] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState<{ voucherId: string; text: string }>();
  const [voidReason, setVoidReason] = useState("");
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [message, setMessage] = useState<string>();

  const voucherQuery = useApiQuery<VoucherResponse>(
    loadTarget?.kind === "id" ? ApiEndpoints.vouchers.byId(loadTarget.voucherId) : ApiEndpoints.vouchers.byNumber,
    {
      query:
        loadTarget?.kind === "number"
          ? { voucherTypeCode: loadTarget.typeCode, voucherNumber: loadTarget.number, storeId: loadTarget.storeId }
          : {},
      enabled: loadTarget !== null,
    },
  );
  const voucher = voucherQuery.data;
  const updateDescription = useApiMutation<UpdateVoucherDescriptionRequest, VoucherResponse>(ApiEndpoints.vouchers.list, { method: "PUT" });
  const voidVoucher = useApiMutation<VoidVoucherRequest, VoucherResponse>(ApiEndpoints.vouchers.list);

  function handleLoad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const number = Number.parseInt(numberText, 10);
    if (!Number.isSafeInteger(number) || number <= 0 || storeId === "") return;
    setLoadTarget({ kind: "number", typeCode, number, storeId });
  }

  async function handleUpdateDescription() {
    if (!voucher) return;
    setMessage(undefined);
    const text = descriptionDraft?.voucherId === voucher.id ? descriptionDraft.text : (voucher.description ?? "");
    const result = await updateDescription.execute(
      { description: text.trim() === "" ? null : text.trim(), expectedRowVersion: voucher.rowVersion },
      { path: ApiEndpoints.vouchers.description(voucher.id) },
    );
    if (!result.ok) return setMessage(result.problem.message);
    setDescriptionDraft(undefined);
    showToast(translateMessage("accounting.view.description.saved"), ToneNames.success);
    voucherQuery.refetch();
  }

  async function handleVoid() {
    if (!voucher) return;
    setMessage(undefined);
    if (voidReason.trim() === "") {
      setIsVoidDialogOpen(false);
      return setMessage(translateMessage("accounting.view.void.reasonRequired"));
    }
    const result = await voidVoucher.execute({ reason: voidReason.trim() }, { path: ApiEndpoints.vouchers.void(voucher.id) });
    setIsVoidDialogOpen(false);
    if (!result.ok) return setMessage(result.problem.message);
    setVoidReason("");
    showToast(translateMessage("accounting.view.void.done"), ToneNames.success);
    voucherQuery.refetch();
  }

  const columns: DataGridColumn<VoucherListItemResponse>[] = [
    { key: "number", header: translateMessage("accounting.voucher.column.number"), isSortable: true, render: (row) => <span dir="ltr">{row.voucherNumber}</span> },
    { key: "date", header: translateMessage("accounting.voucher.column.date"), isSortable: true, render: (row) => <span dir="ltr">{row.voucherDate}</span> },
    { key: "type", header: translateMessage("accounting.voucher.column.type"), isSortable: true, render: (row) => translateMessage(voucherTypeTitleMessageKeys[row.voucherTypeCode]) },
    { key: "store", header: translateMessage("accounting.voucher.column.store"), isSecondary: true, isSortable: true, render: (row) => row.storeName },
    { key: "debit", header: translateMessage("accounting.voucher.column.debit"), render: (row) => row.debitAccountTitle },
    { key: "credit", header: translateMessage("accounting.voucher.column.credit"), render: (row) => row.creditAccountTitle },
    { key: "amount", header: translateMessage("accounting.voucher.column.amount"), isSortable: true, alignment: "end", render: (row) => formatWholeRupees(row.amount) },
    { key: "status", header: translateMessage("accounting.voucher.column.status"), isSortable: true, render: (row) => <StatusBadge statusCode={row.statusCode} /> },
  ];

  const descriptionText = voucher ? (descriptionDraft?.voucherId === voucher.id ? descriptionDraft.text : (voucher.description ?? "")) : "";

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("accounting.view.title")} subtitle={translateMessage("accounting.view.subtitle")} />

      <div className="print:hidden">
      <SectionCard>
        <form onSubmit={handleLoad} className="grid items-end gap-4 sm:grid-cols-4">
          <FormField label={translateMessage("accounting.view.field.type")} name="view-voucher-type">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={typeCode} onChange={(event) => setTypeCode(event.target.value as VoucherTypeCode)}>
                {Object.values(VoucherTypeCodes).map((code) => (
                  <option key={code} value={code}>
                    {translateMessage(voucherTypeTitleMessageKeys[code])}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <TextInputField
            label={translateMessage("accounting.view.field.number")}
            name="view-voucher-number"
            value={numberText}
            onChange={(event) => setNumberText(event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            dir="ltr"
          />
          <ReportStoreSelectWithoutAll storeId={storeId} onStoreIdChange={setChosenStoreId} />
          <Button type="submit">{translateMessage("accounting.view.load")}</Button>
        </form>
      </SectionCard>
      </div>

      <FormResultNotice errorMessage={message} />
      {loadTarget !== null && voucherQuery.status === "loading" && <LoadingIndicator />}
      {loadTarget !== null && voucherQuery.status === "error" && (
        <FormResultNotice errorMessage={voucherQuery.problem?.errorCode === ApiErrorCodes.notFound ? translateMessage("accounting.view.notFound") : voucherQuery.problem?.message} />
      )}

      {voucher && (
        <div className="space-y-4">
          <VoucherDetailCard voucher={voucher} />
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.VOUCHER.VIEW_VOUCHER.PRINT)}>
              <PrintButton label={translateMessage("accounting.view.print")} />
            </PermissionGate>
          </div>

          <PermissionGate requirement={requireAnyPermission(PermissionCodes.VOUCHER.VIEW_VOUCHER.EDIT)}>
            <div className="print:hidden">
            <SectionCard title={translateMessage("accounting.view.description.label")} description={translateMessage("accounting.view.description.note")}>
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleUpdateDescription();
                }}
              >
                <div className="min-w-64 flex-1">
                  <TextInputField
                    label={translateMessage("accounting.view.description.label")}
                    name="view-voucher-description"
                    value={descriptionText}
                    onChange={(event) => setDescriptionDraft({ voucherId: voucher.id, text: event.target.value })}
                  />
                </div>
                <Button type="submit" disabled={updateDescription.isPending}>
                  {translateMessage("accounting.view.description.update")}
                </Button>
              </form>
            </SectionCard>
            </div>
          </PermissionGate>

          {voucher.statusCode === VoucherStatusCodes.posted && (
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.VOUCHER.VIEW_VOUCHER.DELETE)}>
              <div className="print:hidden">
              <SectionCard title={translateMessage("accounting.view.void.action")}>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-64 flex-1">
                    <FormField label={translateMessage("accounting.view.void.reasonLabel")} name="view-voucher-void-reason">
                      {(controlProps) => <Input {...controlProps} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />}
                    </FormField>
                  </div>
                  <Button type="button" variant="destructive" onClick={() => setIsVoidDialogOpen(true)} disabled={voidVoucher.isPending}>
                    {translateMessage("accounting.view.void.action")}
                  </Button>
                </div>
              </SectionCard>
              </div>
              <ConfirmDialog
                open={isVoidDialogOpen}
                onOpenChange={setIsVoidDialogOpen}
                onConfirm={() => void handleVoid()}
                isPending={voidVoucher.isPending}
                titleMessageKey="accounting.view.void.confirmTitle"
                descriptionMessageKey="accounting.view.void.confirmText"
                confirmLabelMessageKey="accounting.view.void.confirm"
              />
            </PermissionGate>
          )}
        </div>
      )}

      <div className="space-y-3 print:hidden">
        <h2 className="text-lg font-semibold">{translateMessage("accounting.view.list.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label={translateMessage("accounting.view.field.type")} name="view-list-type">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={listTypeCode} onChange={(event) => setListTypeCode(event.target.value)}>
                <option value="">{translateMessage("accounting.view.filter.allTypes")}</option>
                {Object.values(VoucherTypeCodes).map((code) => (
                  <option key={code} value={code}>
                    {translateMessage(voucherTypeTitleMessageKeys[code])}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField label={translateMessage("accounting.view.filter.status")} name="view-list-status">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={listStatusCode} onChange={(event) => setListStatusCode(event.target.value)}>
                <option value="">{translateMessage("accounting.view.filter.allStatuses")}</option>
                <option value={VoucherStatusCodes.posted}>{translateMessage("accounting.common.statusPosted")}</option>
                <option value={VoucherStatusCodes.void}>{translateMessage("accounting.common.statusVoid")}</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
        <ServerPaginatedDataGrid<VoucherListItemResponse>
          path={ApiEndpoints.vouchers.list}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={translateMessage("accounting.view.list.caption")}
          emptyTitle={translateMessage("accounting.view.list.empty")}
          filters={{ voucherTypeCode: listTypeCode, statusCode: listStatusCode }}
          defaultSort={{ columnKey: "date", direction: "descending" }}
          searchPlaceholder={translateMessage("accounting.view.list.search")}
          onRowOpen={(row) => setLoadTarget({ kind: "id", voucherId: row.id })}
        />
      </div>
    </div>
  );
}

// View Voucher looks a voucher up inside one store: there is no "all stores" choice.
function ReportStoreSelectWithoutAll({ storeId, onStoreIdChange }: { storeId: string; onStoreIdChange: (storeId: string) => void }) {
  const { translateMessage } = useTranslation();
  const { stores } = useAccessibleStores();
  return (
    <FormField label={translateMessage("accounting.view.field.store")} name="view-voucher-store">
      {(controlProps) => (
        <NativeSelect {...controlProps} value={storeId} onChange={(event) => onStoreIdChange(event.target.value)}>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  );
}
