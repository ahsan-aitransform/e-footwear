"use client";

import { useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { ReportStoreSelect } from "@/features/accounting/components/ReportStoreSelect";
import { formatAmountWithSide } from "@/features/accounting/logic/balanceFormatting";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import type { CashAndBankBalancesResponse } from "@/features/accounting/types/accountReportTypes";

type BalanceFilters = { asOfDate: string; storeId: string };

// Cash and Bank Balances (cash management, Part 15): the cash and bank position of each store as on a date. Balances are derived from journal
// lines and grouped by the store of the posting, so a store's cash is what that store's vouchers and sales moved, even though the cash account
// itself may belong to the head office. The totals are signed: a bank overdraft (credit balance) reduces the position.
export function CashAndBankBalancesPage() {
  const { translateMessage } = useTranslation();
  const [asOfDate, setAsOfDate] = useState(todayAsIsoDate);
  const [storeId, setStoreId] = useState("");
  const [submitted, setSubmitted] = useState<BalanceFilters | null>({ asOfDate: todayAsIsoDate(), storeId: "" });
  const [message, setMessage] = useState<string>();

  const balances = useApiQuery<CashAndBankBalancesResponse>(ApiEndpoints.cashAndBankBalances.balances, {
    query: submitted ?? {},
    enabled: submitted !== null,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!isValidIsoDate(asOfDate)) return setMessage(translateMessage("fields.invalidDate"));
    setSubmitted({ asOfDate, storeId });
  }

  const words = { debit: translateMessage("accounting.common.dr"), credit: translateMessage("accounting.common.cr") };
  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("cashManagement.balances.title")} subtitle={translateMessage("cashManagement.balances.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="grid items-end gap-4 sm:grid-cols-4">
            <DateField label={translateMessage("cashManagement.balances.asOf")} name="cash-bank-as-of" value={asOfDate} onValueChange={setAsOfDate} isRequired />
            <ReportStoreSelect name="cash-bank-store" storeId={storeId} onStoreIdChange={setStoreId} />
            <Button type="submit">{translateMessage("accounting.common.showReport")}</Button>
          </form>
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {balances.status === "loading" && <LoadingIndicator />}
      {balances.status === "error" && <FormResultNotice errorMessage={balances.problem?.message} />}
      {balances.data && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.VOUCHER.CASH_AND_BANK_BALANCES.PRINT)}>
              <PrintButton />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("cashManagement.balances.printTitle", { date: balances.data.asOfDate })} />
          {balances.data.accounts.length === 0 ? (
            <EmptyState title={translateMessage("cashManagement.balances.empty")} text={translateMessage("cashManagement.balances.emptyText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("cashManagement.balances.column.code")}</TableHead>
                    <TableHead>{translateMessage("cashManagement.balances.column.account")}</TableHead>
                    <TableHead>{translateMessage("cashManagement.balances.column.kind")}</TableHead>
                    <TableHead>{translateMessage("cashManagement.balances.column.store")}</TableHead>
                    <TableHead className="text-end">{translateMessage("cashManagement.balances.column.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.data.accounts.map((account) => (
                    <TableRow key={`${account.accountId}-${account.storeId}`}>
                      <TableCell dir="ltr">{account.accountCode}</TableCell>
                      <TableCell>{account.accountTitle}</TableCell>
                      <TableCell>
                        <ToneBadge tone={account.kindCode === "BANK" ? ToneNames.info : ToneNames.success}>
                          {translateMessage(account.kindCode === "BANK" ? "cashManagement.balances.kind.bank" : "cashManagement.balances.kind.cash")}
                        </ToneBadge>
                      </TableCell>
                      <TableCell>{account.storeName}</TableCell>
                      <TableCell className="text-end">{formatAmountWithSide(account.balanceAmount, account.balanceSideCode, words)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>{translateMessage("cashManagement.balances.totalCash")}</TableCell>
                    <TableCell className="text-end" data-testid="cash-total">{formatWholeRupees(balances.data.totalCashAmount)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4}>{translateMessage("cashManagement.balances.totalBank")}</TableCell>
                    <TableCell className="text-end" data-testid="bank-total">{formatWholeRupees(balances.data.totalBankAmount)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
