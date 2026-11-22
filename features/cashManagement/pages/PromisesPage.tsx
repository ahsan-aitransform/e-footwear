"use client";

import { Pencil, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { promiseStatusMessageKey } from "../logic/promiseStatusMessages";
import { useWorkingStoreId } from "@/features/parties/hooks/useWorkingStoreId";
import { formatPartyBalance } from "@/features/parties/logic/partyBalanceFormatting";
import { PartyTypeFilterCodes, type PartyLookupItemResponse } from "@/features/parties/types/partyTypes";
import {
  PromiseStatusCodes,
  type CreatePromiseRequest,
  type CustomerBalanceResponse,
  type PromiseListResponse,
  type PromiseResponse,
  type UpdatePromiseRequest,
} from "../types/cashTypes";

const PROMISE_PAGE_SIZE = 50;

function todayAsIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Promise (docx 3.5): a customer promises to pay an amount by a date. The customer's current balance is shown while the
// promise is made. How a promise becomes "broken" after its due date is not documented, so the screen only shows the
// status the server holds ([BUSINESS DECISION REQUIRED]). Cancelling keeps the row (status Cancelled) for the history.
export function PromisesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const storeId = useWorkingStoreId();
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [customerPartyId, setCustomerPartyId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [promisedAmount, setPromisedAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<PromiseResponse | null>(null);
  const [message, setMessage] = useState<string>();
  const [pageNumber, setPageNumber] = useState(1);
  const [toCancel, setToCancel] = useState<PromiseResponse | null>(null);

  const customers = useApiQuery<PartyLookupItemResponse[]>(ApiEndpoints.parties.lookup, {
    query: { partyTypeCode: PartyTypeFilterCodes.customer, searchText: customerSearchText || undefined },
  });
  const balance = useApiQuery<CustomerBalanceResponse>(customerPartyId ? ApiEndpoints.promises.customerBalance(customerPartyId) : "", {
    enabled: customerPartyId !== "",
  });
  const promises = useApiQuery<PromiseListResponse>(ApiEndpoints.promises.list, {
    query: { storeId: storeId ?? undefined, pageNumber, pageSize: PROMISE_PAGE_SIZE },
  });
  const create = useApiMutation<CreatePromiseRequest>(ApiEndpoints.promises.list);
  const update = useApiMutation<UpdatePromiseRequest>(ApiEndpoints.promises.list, { method: "PUT" });
  const mayAdd = hasPermission(PermissionCodes.PARTY.PROMISE.ADD);
  const mayEdit = hasPermission(PermissionCodes.PARTY.PROMISE.EDIT);
  const mayCancel = hasPermission(PermissionCodes.PARTY.PROMISE.DELETE);
  const isFormVisible = editing ? mayEdit : mayAdd;
  const words = { receivable: translateMessage("parties.balance.receivable"), payable: translateMessage("parties.balance.payable") };

  function reset() {
    setEditing(null);
    setCustomerPartyId("");
    setDueDate("");
    setPromisedAmount(null);
    setNote("");
    setMessage(undefined);
  }

  function startEditing(promise: PromiseResponse) {
    setEditing(promise);
    setCustomerPartyId(promise.customerPartyId);
    setDueDate(promise.dueDate);
    setPromisedAmount(promise.promisedAmount);
    setNote(promise.note ?? "");
    setMessage(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!editing && storeId === null) return setMessage(translateMessage("cash.noStore"));
    if (customerPartyId === "") return setMessage(translateMessage("cash.promise.customerRequired"));
    if (!isValidIsoDate(dueDate)) return setMessage(translateMessage("cash.promise.dueDateRequired"));
    if (promisedAmount === null || promisedAmount <= 0) return setMessage(translateMessage("cash.promise.amountRequired"));
    const trimmedNote = note.trim() === "" ? null : note.trim();
    const result = editing
      ? await update.execute(
          { dueDate, promisedAmount, note: trimmedNote, rowVersion: editing.rowVersion },
          { path: ApiEndpoints.promises.byId(editing.id) },
        )
      : await create.execute({ storeId: storeId as string, customerPartyId, promiseDate: todayAsIsoDate(), dueDate, promisedAmount, note: trimmedNote });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("cash.promise.saved"), ToneNames.success);
    reset();
    promises.refetch();
  }

  async function confirmCancel() {
    if (!toCancel) return;
    const result = await apiRequest<void>(ApiEndpoints.promises.byId(toCancel.id), { method: "DELETE", query: { rowVersion: toCancel.rowVersion } });
    if (!result.ok) setMessage(result.problem.message);
    else {
      showToast(translateMessage("cash.promise.cancelled"), ToneNames.success);
      promises.refetch();
    }
    setToCancel(null);
  }

  const totalPages = promises.data ? Math.max(1, Math.ceil(promises.data.promises.totalCount / PROMISE_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.customerPromises")} subtitle={translateMessage("cash.promise.subtitle")} />
      {storeId === null && <InlineNotice tone={ToneNames.warning}>{translateMessage("cash.noStore")}</InlineNotice>}

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        {isFormVisible && (
          <SectionCard title={translateMessage(editing ? "cash.promise.editTitle" : "cash.promise.newTitle")}>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {!editing && (
                <FormField label={translateMessage("parties.ledger.findParty")} name="promiseCustomerSearch">
                  {(controlProps) => <Input {...controlProps} type="search" value={customerSearchText} onChange={(event) => setCustomerSearchText(event.target.value)} />}
                </FormField>
              )}
              <FormField label={translateMessage("cash.promise.customer")} name="promiseCustomer" isRequired>
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={customerPartyId} disabled={editing !== null} onChange={(event) => setCustomerPartyId(event.target.value)}>
                    <option value="">{translateMessage("masterData.choose")}</option>
                    {(customers.data ?? []).map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.code} {customer.name}</option>
                    ))}
                    {editing && !(customers.data ?? []).some((customer) => customer.id === editing.customerPartyId) && (
                      <option value={editing.customerPartyId}>{editing.customerName}</option>
                    )}
                  </NativeSelect>
                )}
              </FormField>
              {balance.data && (
                <p className="text-sm" data-testid="promise-customer-balance">
                  {translateMessage("cash.promise.currentBalance")}: {formatPartyBalance(balance.data.balanceAmount, words)}
                </p>
              )}
              <DateField label={translateMessage("cash.promise.dueDate")} name="promiseDueDate" value={dueDate} onValueChange={setDueDate} isRequired />
              <WholeRupeeAmountField label={translateMessage("cash.promise.amount")} name="promiseAmount" value={promisedAmount} onValueChange={setPromisedAmount} isRequired />
              <TextInputField label={translateMessage("cash.field.note")} name="promiseNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
              <FormResultNotice errorMessage={message} />
              <div className="flex gap-2">
                <SubmitButton label={translateMessage("masterData.action.save")} pendingLabel={translateMessage("masterData.action.saving")} isPending={create.isPending || update.isPending} />
                {editing && (
                  <Button type="button" variant="outline" onClick={reset}>{translateMessage("masterData.action.cancelEdit")}</Button>
                )}
              </div>
            </form>
          </SectionCard>
        )}

        <div className={isFormVisible ? undefined : "lg:col-span-2"}>
          <SectionCard isPadded={false}>
            {promises.status === "loading" && <LoadingIndicator />}
            {promises.status === "error" && <FormResultNotice errorMessage={promises.problem?.message} />}
            {promises.data && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{translateMessage("cash.promise.customer")}</TableHead>
                    <TableHead>{translateMessage("cash.promise.dueDate")}</TableHead>
                    <TableHead className="text-end">{translateMessage("cash.promise.amount")}</TableHead>
                    <TableHead className="text-end">{translateMessage("cash.promise.paid")}</TableHead>
                    <TableHead className="text-end">{translateMessage("cash.promise.remaining")}</TableHead>
                    <TableHead>{translateMessage("parties.field.status")}</TableHead>
                    <TableHead className="text-end">{translateMessage("masterData.column.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promises.data.promises.items.map((promise) => {
                    const isActive = promise.statusCode === PromiseStatusCodes.open || promise.statusCode === PromiseStatusCodes.partial;
                    return (
                      <TableRow key={promise.id}>
                        <TableCell>{promise.promiseNumber ?? ""}</TableCell>
                        <TableCell>{promise.customerName}</TableCell>
                        <TableCell dir="ltr">{promise.dueDate}</TableCell>
                        <TableCell className="text-end">{formatWholeRupees(promise.promisedAmount)}</TableCell>
                        <TableCell className="text-end">{formatWholeRupees(promise.paidAmount)}</TableCell>
                        <TableCell className="text-end">{formatWholeRupees(promise.remainingAmount)}</TableCell>
                        <TableCell>{translateMessage(promiseStatusMessageKey(promise.statusCode))}</TableCell>
                        <TableCell className="text-end">
                          {isActive && mayEdit && (
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.edit")} onClick={() => startEditing(promise)}>
                              <Pencil />
                            </Button>
                          )}
                          {isActive && mayCancel && (
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("cash.promise.cancelAction")} onClick={() => setToCancel(promise)}>
                              <XCircle />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>{translateMessage("parties.ledger.totals")}</TableCell>
                    <TableCell className="text-end" data-testid="promise-total-promised">{formatWholeRupees(promises.data.totalPromisedAmount)}</TableCell>
                    <TableCell className="text-end" data-testid="promise-total-paid">{formatWholeRupees(promises.data.totalPaidAmount)}</TableCell>
                    <TableCell className="text-end" data-testid="promise-total-remaining">{formatWholeRupees(promises.data.totalRemainingAmount)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 p-3">
                <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>{translateMessage("parties.ledger.previousPage")}</Button>
                <span className="text-sm">{pageNumber} / {totalPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber(pageNumber + 1)}>{translateMessage("parties.ledger.nextPage")}</Button>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={toCancel !== null}
        onOpenChange={(open) => {
          if (!open) setToCancel(null);
        }}
        onConfirm={confirmCancel}
        titleMessageKey="cash.promise.cancelTitle"
        descriptionMessageKey="cash.promise.cancelText"
        confirmLabelMessageKey="cash.promise.cancelAction"
      />
    </div>
  );
}
