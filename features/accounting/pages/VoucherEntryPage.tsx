"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { QueryStringParameterNames, SortDirectionParameterValues } from "@/lib/constants/paginationDefaults";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { VoucherDetailCard } from "../components/VoucherDetailCard";
import { VoucherTargetPicker } from "../components/VoucherTargetPicker";
import { useAccessibleStores } from "../hooks/useAccessibleStores";
import { useEnterMovesToNextField } from "../hooks/useEnterMovesToNextField";
import { todayAsIsoDate } from "../logic/reportDates";
import {
  buildPostVoucherRequest,
  createEmptyVoucherForm,
  hasVoucherFormErrors,
  offersPaymentMode,
  offersPrintAfterSaving,
  showsFromBoxFirst,
  validateVoucherForm,
  type VoucherFormErrors,
  type VoucherFormState,
  type VoucherTargetChoice,
} from "../logic/voucherEntryLogic";
import { paymentModeMessageKeys, voucherTypeDefinitions } from "../logic/voucherTypeDefinitions";
import {
  VoucherPaymentModeCodes,
  type PostVoucherRequest,
  type VoucherEntryContextResponse,
  type VoucherListItemResponse,
  type VoucherPaymentModeCode,
  type VoucherResponse,
  type VoucherTypeCode,
} from "../types/voucherTypes";

const RECENT_VOUCHER_COUNT = 8;

// The entry screen of Payment (docx 6.1), Receipt (6.2), Expense (6.3) and Journal (6.4) vouchers: one component, four configurations.
// Layout follows the docx: Store, Date, the number the voucher will get, the To (Dr) and From (Cr) boxes with their balances, Amount,
// Ref #, Description (and the payment type and the Print tick box where the docx has them), and the list of recent vouchers beside it.
// Enter moves to the next field. The server posts the voucher as one balanced entry; a retry sends the same client transaction id,
// so a double click or a lost answer never posts a second voucher.
export function VoucherEntryPage({ voucherTypeCode }: { voucherTypeCode: VoucherTypeCode }) {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const definition = voucherTypeDefinitions[voucherTypeCode];
  const workingStoreId = useWorkingStoreId();
  const { stores } = useAccessibleStores();
  const handleEnterKey = useEnterMovesToNextField();
  const { hasPermission } = usePermissions();

  const [form, setForm] = useState<VoucherFormState>(() => createEmptyVoucherForm(voucherTypeCode, "", todayAsIsoDate()));
  const [errors, setErrors] = useState<VoucherFormErrors>({});
  const [message, setMessage] = useState<string>();
  const [clientTransactionId, setClientTransactionId] = useState(createClientTransactionId);
  const [savedVoucher, setSavedVoucher] = useState<VoucherResponse>();
  const [printAfterSaving, setPrintAfterSaving] = useState(false);
  const [earlierVoucherNumber, setEarlierVoucherNumber] = useState("");

  const storeId = form.storeId || workingStoreId || stores[0]?.id || "";
  const entryContext = useApiQuery<VoucherEntryContextResponse>(definition.entryContextPath, { query: { storeId }, enabled: storeId !== "" });
  const post = useApiMutation<PostVoucherRequest, VoucherResponse>(definition.postPath);

  // The recent list needs the View Voucher permission; without it the panel is simply not shown.
  const mayViewVouchers = requireAnyPermission(PermissionCodes.VOUCHER.VIEW_VOUCHER.VIEW);
  const recent = useApiQuery<PaginatedResponse<VoucherListItemResponse>>(ApiEndpoints.vouchers.list, {
    query: {
      voucherTypeCode,
      storeId,
      [QueryStringParameterNames.pageSize]: RECENT_VOUCHER_COUNT,
      [QueryStringParameterNames.sortField]: "date",
      [QueryStringParameterNames.sortDirection]: SortDirectionParameterValues.descending,
    },
    enabled: storeId !== "" && hasPermission(PermissionCodes.VOUCHER.VIEW_VOUCHER.VIEW),
  });

  const fromBox = (
    <VoucherTargetPicker
      key="from"
      fieldName="voucher-from"
      boxLabel={translateMessage("accounting.voucher.field.from")}
      typeLabel={translateMessage("accounting.voucher.field.fromType")}
      targetsPath={definition.targetsPath}
      choice={form.credit}
      onChoiceChange={(choice: VoucherTargetChoice) => setForm((current) => ({ ...current, credit: choice }))}
      errorMessage={errors.credit ? translateMessage(errors.credit) : undefined}
    />
  );
  const toBox = (
    <VoucherTargetPicker
      key="to"
      fieldName="voucher-to"
      boxLabel={translateMessage("accounting.voucher.field.to")}
      typeLabel={translateMessage("accounting.voucher.field.toType")}
      targetsPath={definition.targetsPath}
      choice={form.debit}
      onChoiceChange={(choice: VoucherTargetChoice) => setForm((current) => ({ ...current, debit: choice }))}
      errorMessage={errors.debit ? translateMessage(errors.debit) : undefined}
    />
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const formToSave: VoucherFormState = { ...form, storeId };
    const validationErrors = validateVoucherForm(formToSave);
    setErrors(validationErrors);
    if (hasVoucherFormErrors(validationErrors)) return;

    const result = await post.execute(buildPostVoucherRequest(formToSave, clientTransactionId), { idempotencyKey: clientTransactionId });
    if (!result.ok) {
      setMessage(result.problem.message);
      return;
    }
    setSavedVoucher(result.data);
    showToast(translateMessage("accounting.voucher.saved", { number: result.data.voucherNumber }), ToneNames.success);
    // A new voucher gets a new client transaction id; the store and the date stay, the rest is cleared.
    setClientTransactionId(createClientTransactionId());
    setForm({ ...createEmptyVoucherForm(voucherTypeCode, storeId, form.voucherDate), paymentMode: form.paymentMode });
    entryContext.refetch();
    recent.refetch();
    if (printAfterSaving && offersPrintAfterSaving(voucherTypeCode)) {
      requestAnimationFrame(() => window.print());
    }
  }

  function openEarlierVoucher() {
    const number = Number.parseInt(earlierVoucherNumber, 10);
    if (!Number.isSafeInteger(number) || number <= 0) return;
    const parameters = new URLSearchParams({ type: voucherTypeCode, number: String(number), storeId });
    router.push(`${ApplicationRoutes.viewVoucher}?${parameters.toString()}`);
  }

  const boxes = showsFromBoxFirst(voucherTypeCode) ? [fromBox, toBox] : [toBox, fromBox];

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage(definition.titleMessageKey)} subtitle={translateMessage(definition.subtitleMessageKey)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form onSubmit={handleSubmit} onKeyDown={handleEnterKey} className="space-y-4 print:hidden" noValidate>
          <SectionCard>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={translateMessage("accounting.voucher.field.store")} name="voucher-store" isRequired errorMessage={errors.storeId ? translateMessage(errors.storeId) : undefined}>
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={storeId} onChange={(event) => setForm((current) => ({ ...current, storeId: event.target.value }))}>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <DateField
                label={translateMessage("accounting.voucher.field.date")}
                name="voucher-date"
                value={form.voucherDate}
                onValueChange={(voucherDate) => setForm((current) => ({ ...current, voucherDate }))}
                errorMessage={errors.voucherDate ? translateMessage(errors.voucherDate) : undefined}
                isRequired
              />
              <FormField label={translateMessage("accounting.voucher.field.voucherNumber")} name="voucher-number">
                {(controlProps) => <Input {...controlProps} readOnly value={entryContext.data ? String(entryContext.data.nextVoucherNumber) : ""} dir="ltr" />}
              </FormField>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="space-y-4">{boxes}</div>
          </SectionCard>

          <SectionCard>
            <div className="grid gap-4 sm:grid-cols-2">
              <WholeRupeeAmountField
                label={translateMessage("accounting.voucher.field.amount")}
                name="voucher-amount"
                value={form.amount}
                onValueChange={(amount) => setForm((current) => ({ ...current, amount }))}
                errorMessage={errors.amount ? translateMessage(errors.amount) : undefined}
                isRequired
              />
              <TextInputField
                label={translateMessage("accounting.voucher.field.referenceNumber")}
                name="voucher-reference"
                value={form.referenceNumber}
                onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))}
                dir="ltr"
              />
              {offersPaymentMode(voucherTypeCode) && (
                <FormField label={translateMessage("accounting.voucher.field.paymentMode")} name="voucher-payment-mode">
                  {(controlProps) => (
                    <NativeSelect
                      {...controlProps}
                      value={form.paymentMode ?? VoucherPaymentModeCodes.cash}
                      onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value as VoucherPaymentModeCode }))}
                    >
                      {Object.values(VoucherPaymentModeCodes).map((paymentModeCode) => (
                        <option key={paymentModeCode} value={paymentModeCode}>
                          {translateMessage(paymentModeMessageKeys[paymentModeCode])}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
              )}
              <div className="sm:col-span-2">
                <TextInputField
                  label={translateMessage("accounting.voucher.field.description")}
                  name="voucher-description"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              {offersPrintAfterSaving(voucherTypeCode) && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Checkbox id="voucher-print-after-saving" checked={printAfterSaving} onCheckedChange={(checked) => setPrintAfterSaving(checked === true)} />
                  <Label htmlFor="voucher-print-after-saving">{translateMessage("accounting.voucher.field.printAfterSaving")}</Label>
                </div>
              )}
            </div>
          </SectionCard>

          <FormResultNotice errorMessage={message} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={translateMessage("accounting.voucher.action.save")} pendingLabel={translateMessage("accounting.voucher.action.saving")} isPending={post.isPending} />
          </div>
        </form>

        <div className="space-y-6">
          <PermissionGate requirement={mayViewVouchers}>
            <SectionCard title={translateMessage("accounting.voucher.recent.title")} isPadded={false}>
              {recent.data && recent.data.items.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{translateMessage("accounting.voucher.recent.empty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{translateMessage("accounting.voucher.column.number")}</TableHead>
                      <TableHead>{translateMessage("accounting.voucher.column.date")}</TableHead>
                      <TableHead>{translateMessage("accounting.voucher.column.debit")}</TableHead>
                      <TableHead>{translateMessage("accounting.voucher.column.credit")}</TableHead>
                      <TableHead className="text-end">{translateMessage("accounting.voucher.column.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(recent.data?.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell dir="ltr">{item.voucherNumber}</TableCell>
                        <TableCell dir="ltr">{item.voucherDate}</TableCell>
                        <TableCell>{item.debitAccountTitle}</TableCell>
                        <TableCell>{item.creditAccountTitle}</TableCell>
                        <TableCell className="text-end">{formatWholeRupees(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
            <SectionCard title={translateMessage("accounting.voucher.openEarlier.title")}>
              <form
                className="flex items-end gap-2 print:hidden"
                onSubmit={(event) => {
                  event.preventDefault();
                  openEarlierVoucher();
                }}
              >
                <div className="flex-1">
                  <TextInputField
                    label={translateMessage("accounting.voucher.openEarlier.number")}
                    name="voucher-open-earlier"
                    value={earlierVoucherNumber}
                    onChange={(event) => setEarlierVoucherNumber(event.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" variant="outline">
                  {translateMessage("accounting.voucher.openEarlier.go")}
                </Button>
              </form>
            </SectionCard>
          </PermissionGate>
        </div>
      </div>

      {savedVoucher && (
        <div className="space-y-3">
          <VoucherDetailCard voucher={savedVoucher} />
          <div className="flex gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={() => window.print()}>
              {translateMessage("accounting.voucher.action.printSaved")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSavedVoucher(undefined)}>
              {translateMessage("accounting.voucher.action.newVoucher")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
