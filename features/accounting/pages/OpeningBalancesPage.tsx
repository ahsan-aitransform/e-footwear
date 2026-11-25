"use client";

import { useMemo, useState } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import type { StoreSummaryResponse } from "@/lib/types/store";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import {
  calculateOpeningBalanceTotals,
  setRowAmount,
  toEditableRows,
  toSaveLines,
  type OpeningBalanceEditableRow,
} from "../logic/openingBalanceCalculations";
import type {
  OpeningBalanceSheetResponse,
  SaveOpeningBalancesRequest,
  SaveOpeningBalancesResponse,
} from "../types/chartOfAccountsTypes";

function todayAsIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Opening Balance (docx 2.18): one grid of every postable account, customer, vendor and staff member of the store, a debit and a credit column,
// and a footer with the totals and the difference. Saving posts a new opening entry for each changed row; the old entry is
// reversed, never edited (the books are append-only). Rows left unchanged are not touched.
export function OpeningBalancesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const workingStoreId = useWorkingStoreId();
  const [chosenStoreId, setChosenStoreId] = useState<string>("");
  const [entryDate, setEntryDate] = useState(todayAsIsoDate);
  const [rows, setRows] = useState<OpeningBalanceEditableRow[]>([]);
  const [filterText, setFilterText] = useState("");
  const [message, setMessage] = useState<string>();

  const stores = useApiQuery<StoreSummaryResponse[]>(ApiEndpoints.stores.listAccessibleStores);
  const storeId = chosenStoreId || workingStoreId || stores.data?.[0]?.id || "";
  const sheet = useApiQuery<OpeningBalanceSheetResponse>(ApiEndpoints.openingBalances.sheet, {
    query: { storeId },
    enabled: storeId !== "",
  });
  const save = useApiMutation<SaveOpeningBalancesRequest, SaveOpeningBalancesResponse>(ApiEndpoints.openingBalances.sheet, { method: "PUT" });
  const maySave = hasPermission(PermissionCodes.SETTINGS.OPENING_BALANCE.ADD);

  // A freshly loaded sheet replaces the typed rows (adjusting state while rendering, not in an effect).
  const [shownSheet, setShownSheet] = useState<OpeningBalanceSheetResponse | undefined>();
  if (sheet.data && sheet.data !== shownSheet) {
    setShownSheet(sheet.data);
    setRows(toEditableRows(sheet.data.rows));
  }

  const totals = useMemo(() => calculateOpeningBalanceTotals(rows), [rows]);
  const visibleRows = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    return needle === "" ? rows : rows.filter((row) => `${row.code} ${row.name} ${row.areaName ?? ""}`.toLowerCase().includes(needle));
  }, [rows, filterText]);

  function changeRow(rowKey: string, side: "debit" | "credit", amount: number | null) {
    setRows((current) => current.map((row) => (row.rowKey === rowKey ? setRowAmount(row, side, amount) : row)));
  }

  async function handleSave() {
    setMessage(undefined);
    if (!isValidIsoDate(entryDate)) return setMessage(translateMessage("fields.invalidDate"));
    const result = await save.execute({ storeId, entryDate, lines: toSaveLines(rows) });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(
      translateMessage("accounting.openingBalance.saved", {
        posted: result.data.postedCount,
        unchanged: result.data.unchangedCount,
        cleared: result.data.clearedCount,
      }),
      ToneNames.success,
    );
    sheet.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.openingBalances")} subtitle={translateMessage("accounting.openingBalance.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label={translateMessage("accounting.openingBalance.store")} name="openingBalanceStore">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={storeId} onChange={(event) => setChosenStoreId(event.target.value)}>
                {(stores.data ?? []).map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <DateField label={translateMessage("accounting.openingBalance.entryDate")} name="openingBalanceDate" value={entryDate} onValueChange={setEntryDate} isRequired />
          <FormField label={translateMessage("masterData.search.placeholder")} name="openingBalanceFilter">
            {(controlProps) => <Input {...controlProps} type="search" value={filterText} onChange={(event) => setFilterText(event.target.value)} />}
          </FormField>
        </div>
      </SectionCard>

      {sheet.status === "loading" && <LoadingIndicator />}
      {sheet.status === "error" && <FormResultNotice errorMessage={sheet.problem?.message} />}
      {sheet.status === "success" && (
        <SectionCard isPadded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("accounting.column.code")}</TableHead>
                <TableHead>{translateMessage("accounting.column.title")}</TableHead>
                <TableHead>{translateMessage("accounting.openingBalance.area")}</TableHead>
                <TableHead className="w-44 text-end">{translateMessage("accounting.openingBalance.debit")}</TableHead>
                <TableHead className="w-44 text-end">{translateMessage("accounting.openingBalance.credit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.rowKey}>
                  <TableCell dir="ltr">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.areaName ?? ""}</TableCell>
                  <TableCell>
                    <WholeRupeeAmountField label={`${row.name} ${translateMessage("accounting.openingBalance.debit")}`} name={`debit-${row.rowKey}`} value={row.debitAmount} onValueChange={(amount) => changeRow(row.rowKey, "debit", amount)} isDisabled={!maySave} />
                  </TableCell>
                  <TableCell>
                    <WholeRupeeAmountField label={`${row.name} ${translateMessage("accounting.openingBalance.credit")}`} name={`credit-${row.rowKey}`} value={row.creditAmount} onValueChange={(amount) => changeRow(row.rowKey, "credit", amount)} isDisabled={!maySave} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{translateMessage("accounting.openingBalance.totals")}</TableCell>
                <TableCell className="text-end" data-testid="opening-total-debit">{formatWholeRupees(totals.totalDebitAmount)}</TableCell>
                <TableCell className="text-end" data-testid="opening-total-credit">{formatWholeRupees(totals.totalCreditAmount)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>{translateMessage("accounting.openingBalance.difference")}</TableCell>
                <TableCell colSpan={2} className="text-end" data-testid="opening-difference">{formatWholeRupees(totals.differenceAmount)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </SectionCard>
      )}

      {totals.differenceAmount !== 0 && (
        <InlineNotice tone={ToneNames.warning}>{translateMessage("accounting.openingBalance.differenceNotice")}</InlineNotice>
      )}
      <FormResultNotice errorMessage={message} />
      {maySave && (
        <div className="flex">
          <SaveBar onSave={handleSave} isPending={save.isPending} saveLabel={translateMessage("masterData.action.save")} pendingLabel={translateMessage("masterData.action.saving")} />
        </div>
      )}
    </div>
  );
}

function SaveBar({ onSave, isPending, saveLabel, pendingLabel }: { onSave: () => void; isPending: boolean; saveLabel: string; pendingLabel: string }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <SubmitButton label={saveLabel} pendingLabel={pendingLabel} isPending={isPending} />
    </form>
  );
}
