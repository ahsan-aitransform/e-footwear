"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useWorkingStoreId } from "@/features/parties/hooks/useWorkingStoreId";
import {
  calculateCashDifference,
  calculateCountedCash,
  calculateDenominationAmount,
  CashDenominationValues,
  classifyCashDifference,
  parseNoteCountText,
  toDenominationLines,
  toNoteCounts,
  type NoteCountsByDenomination,
} from "../logic/cashCountCalculations";
import type { CashCountContextResponse, CashCountResponse, SaveCashCountRequest } from "../types/cashTypes";

function todayAsIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Cash Calculator (docx 3.6): count the notes at the end of the day. The total, the expected cash from the books and the
// difference update as you type. One count per store and day; opening the same day again loads it and a save replaces it.
// How "Net Sale" is worked out is not documented, so this screen does not show or invent it ([BUSINESS DECISION REQUIRED]).
export function CashCalculatorPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const storeId = useWorkingStoreId();
  const [countDate, setCountDate] = useState(todayAsIsoDate);
  const [noteCounts, setNoteCounts] = useState<NoteCountsByDenomination>({});
  const [countTexts, setCountTexts] = useState<Record<number, string>>({});
  const [openingCash, setOpeningCash] = useState<number | null>(null);
  const [paymentsAmount, setPaymentsAmount] = useState<number | null>(null);
  const [creditSalesAmount, setCreditSalesAmount] = useState<number | null>(null);
  const [creditReceivedAmount, setCreditReceivedAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [existingCount, setExistingCount] = useState<CashCountResponse | null>(null);
  const [message, setMessage] = useState<string>();

  const context = useApiQuery<CashCountContextResponse>(ApiEndpoints.cashCounts.context, {
    query: { storeId: storeId ?? undefined, countDate, refreshKey: existingCount?.rowVersion },
    enabled: storeId !== null && isValidIsoDate(countDate),
  });
  const save = useApiMutation<SaveCashCountRequest, { id: string }>(ApiEndpoints.cashCounts.list, { method: "PUT" });
  const maySave = hasPermission(PermissionCodes.PARTY.CASH_CALCULATOR.ADD);

  // A freshly loaded context replaces the typed values (adjusting state while rendering, not in an effect).
  const [shownContext, setShownContext] = useState<CashCountContextResponse | undefined>();
  if (context.data && context.data !== shownContext) {
    setShownContext(context.data);
    const loaded = context.data.existingCount ?? null;
    setExistingCount(loaded);
    const counts = toNoteCounts(loaded?.denominations ?? []);
    setNoteCounts(counts);
    setCountTexts(Object.fromEntries(Object.entries(counts).map(([denomination, count]) => [denomination, String(count)])));
    setOpeningCash(loaded?.openingCash ?? null);
    setPaymentsAmount(loaded?.paymentsAmount ?? null);
    setCreditSalesAmount(loaded?.creditSalesAmount ?? null);
    setCreditReceivedAmount(loaded?.creditReceivedAmount ?? null);
    setNote(loaded?.note ?? "");
  }

  const countedCash = useMemo(() => calculateCountedCash(noteCounts), [noteCounts]);
  const expectedCash = context.data?.expectedCash ?? 0;
  const differenceAmount = calculateCashDifference(countedCash, expectedCash);
  const differenceKind = classifyCashDifference(differenceAmount);

  function changeCount(denomination: number, text: string) {
    setCountTexts((current) => ({ ...current, [denomination]: text }));
    const parsed = parseNoteCountText(text);
    if (parsed === null) return;
    setNoteCounts((current) => ({ ...current, [denomination]: parsed }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (storeId === null) return setMessage(translateMessage("cash.noStore"));
    if (!isValidIsoDate(countDate)) return setMessage(translateMessage("fields.invalidDate"));
    const result = await save.execute({
      storeId,
      countDate,
      openingCash: openingCash ?? 0,
      denominations: toDenominationLines(noteCounts),
      paymentsAmount,
      creditSalesAmount,
      creditReceivedAmount,
      note: note.trim() === "" ? null : note.trim(),
      rowVersion: existingCount?.rowVersion ?? null,
    });
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("cash.toast.saved"), ToneNames.success);
    context.refetch();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <PageHeader title={translateMessage("navigation.item.cashCalculator")} subtitle={translateMessage("cash.calculator.subtitle")} />
      {storeId === null && <InlineNotice tone={ToneNames.warning}>{translateMessage("cash.noStore")}</InlineNotice>}
      {existingCount && <InlineNotice tone={ToneNames.info}>{translateMessage("cash.calculator.existingCount")}</InlineNotice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={translateMessage("cash.calculator.notesTitle")}>
          <div className="space-y-4">
            <DateField label={translateMessage("cash.field.countDate")} name="cashCountDate" value={countDate} onValueChange={setCountDate} isRequired />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{translateMessage("cash.column.denomination")}</TableHead>
                  <TableHead className="w-32">{translateMessage("cash.column.notes")}</TableHead>
                  <TableHead className="text-end">{translateMessage("cash.column.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CashDenominationValues.map((denomination) => (
                  <TableRow key={denomination}>
                    <TableCell>{formatWholeRupees(denomination)}</TableCell>
                    <TableCell>
                      <Input
                        inputMode="numeric"
                        dir="ltr"
                        aria-label={translateMessage("cash.noteCountLabel", { denomination })}
                        value={countTexts[denomination] ?? ""}
                        onChange={(event) => changeCount(denomination, event.target.value)}
                        disabled={!maySave}
                      />
                    </TableCell>
                    <TableCell className="text-end" data-testid={`denomination-amount-${denomination}`}>
                      {formatWholeRupees(calculateDenominationAmount(denomination, noteCounts[denomination]))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard title={translateMessage("cash.calculator.totalsTitle")}>
          <div className="space-y-4">
            <WholeRupeeAmountField label={translateMessage("cash.field.openingCash")} name="cashOpening" value={openingCash} onValueChange={setOpeningCash} isDisabled={!maySave} />
            <WholeRupeeAmountField label={translateMessage("cash.field.payments")} name="cashPayments" value={paymentsAmount} onValueChange={setPaymentsAmount} isDisabled={!maySave} />
            <WholeRupeeAmountField label={translateMessage("cash.field.creditSales")} name="cashCreditSales" value={creditSalesAmount} onValueChange={setCreditSalesAmount} isDisabled={!maySave} />
            <WholeRupeeAmountField label={translateMessage("cash.field.creditReceived")} name="cashCreditReceived" value={creditReceivedAmount} onValueChange={setCreditReceivedAmount} isDisabled={!maySave} />
            <TextInputField label={translateMessage("cash.field.note")} name="cashNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} disabled={!maySave} />
            <dl className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="flex justify-between"><dt>{translateMessage("cash.total.counted")}</dt><dd data-testid="cash-counted-total">{formatWholeRupees(countedCash)}</dd></div>
              <div className="flex justify-between"><dt>{translateMessage("cash.total.expected")}</dt><dd data-testid="cash-expected-total">{formatWholeRupees(expectedCash)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>{translateMessage("cash.total.difference")}</dt><dd data-testid="cash-difference-total">{formatWholeRupees(differenceAmount)}</dd></div>
            </dl>
            <InlineNotice tone={differenceKind === "balanced" ? ToneNames.success : ToneNames.warning}>
              {translateMessage(`cash.difference.${differenceKind}`)}
            </InlineNotice>
          </div>
        </SectionCard>
      </div>

      <FormResultNotice errorMessage={message} />
      {maySave && <SubmitButton label={translateMessage("cash.action.saveCount")} pendingLabel={translateMessage("masterData.action.saving")} isPending={save.isPending} isDisabled={storeId === null} />}
    </form>
  );
}
