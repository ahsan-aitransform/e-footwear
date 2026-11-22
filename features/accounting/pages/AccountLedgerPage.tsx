"use client";

import { useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { SearchableSelect, type SearchableSelectOption } from "@/components/forms/SearchableSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { QueryStringParameterNames, SEARCH_INPUT_DEBOUNCE_MILLISECONDS } from "@/lib/constants/paginationDefaults";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { PrintButton, PrintedReportHeading } from "../components/PrintControls";
import { ReportStoreSelect } from "../components/ReportStoreSelect";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatAmountWithSide, formatColumnAmount } from "../logic/balanceFormatting";
import { firstDayOfCurrentMonthAsIsoDate, isIsoDateRangeOrdered, todayAsIsoDate } from "../logic/reportDates";
import type { AccountLedgerResponse, AccountLookupItemResponse } from "../types/accountReportTypes";

const LEDGER_PAGE_SIZE = 100;

type LedgerFilters = {
  accountId: string;
  accountCode: string;
  fromDate: string;
  toDate: string;
  storeId: string;
  includeDescriptions: boolean;
};

// Account Ledger (docx 8.1): every debit and credit of one account for a date range with a running balance, found by searching the chart of
// accounts or directly by account number. "No description" prints without narrations. The opening balance, the totals and the closing balance
// come from the server and cover the whole range, not only the page on screen.
export function AccountLedgerPage() {
  const { translateMessage } = useTranslation();
  const [accountSearchText, setAccountSearchText] = useState("");
  const debouncedAccountSearchText = useDebouncedValue(accountSearchText, SEARCH_INPUT_DEBOUNCE_MILLISECONDS);
  const [isAccountNumberMode, setIsAccountNumberMode] = useState(false);
  const [chosenAccount, setChosenAccount] = useState<AccountLookupItemResponse | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonthAsIsoDate);
  const [toDate, setToDate] = useState(todayAsIsoDate);
  const [storeId, setStoreId] = useState("");
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [submitted, setSubmitted] = useState<LedgerFilters | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [message, setMessage] = useState<string>();

  const accountLookup = useApiQuery<AccountLookupItemResponse[]>(ApiEndpoints.accountReports.accounts, {
    query: { searchText: debouncedAccountSearchText },
    enabled: !isAccountNumberMode,
  });
  const accountOptions = useMemo<SearchableSelectOption<string>[]>(() => {
    const found = accountLookup.data ?? [];
    const merged = chosenAccount && !found.some((account) => account.accountId === chosenAccount.accountId) ? [chosenAccount, ...found] : found;
    return merged.map((account) => ({ value: account.accountId, label: `${account.code} ${account.title}`, description: `${account.groupTitle} · ${account.storeName}` }));
  }, [accountLookup.data, chosenAccount]);

  const ledger = useApiQuery<AccountLedgerResponse>(ApiEndpoints.accountReports.ledger, {
    query: submitted
      ? {
          accountId: submitted.accountId,
          accountCode: submitted.accountCode,
          fromDate: submitted.fromDate,
          toDate: submitted.toDate,
          storeId: submitted.storeId,
          includeDescriptions: submitted.includeDescriptions,
          [QueryStringParameterNames.page]: pageNumber,
          [QueryStringParameterNames.pageSize]: LEDGER_PAGE_SIZE,
        }
      : {},
    enabled: submitted !== null,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (!isValidIsoDate(fromDate) || !isValidIsoDate(toDate)) return setMessage(translateMessage("fields.invalidDate"));
    if (!isIsoDateRangeOrdered(fromDate, toDate)) return setMessage(translateMessage("accounting.reports.error.dateOrder"));
    const hasAccount = isAccountNumberMode ? accountNumber.trim() !== "" : chosenAccount !== null;
    if (!hasAccount) return setMessage(translateMessage("accounting.reports.error.chooseAccount"));
    setPageNumber(1);
    setSubmitted({
      accountId: isAccountNumberMode ? "" : (chosenAccount?.accountId ?? ""),
      accountCode: isAccountNumberMode ? accountNumber.trim() : "",
      fromDate,
      toDate,
      storeId,
      includeDescriptions,
    });
  }

  const words = { debit: translateMessage("accounting.common.dr"), credit: translateMessage("accounting.common.cr") };
  const totalPages = ledger.data ? Math.max(1, Math.ceil(ledger.data.lines.totalCount / LEDGER_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("accounting.reports.ledger.title")} subtitle={translateMessage("accounting.reports.ledger.subtitle")} />
      <div className="print:hidden">
        <SectionCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="ledger-use-account-number" checked={isAccountNumberMode} onCheckedChange={(checked) => setIsAccountNumberMode(checked === true)} />
              <Label htmlFor="ledger-use-account-number">{translateMessage("accounting.reports.ledger.useAccountNumber")}</Label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {isAccountNumberMode ? (
                <TextInputField
                  label={translateMessage("accounting.reports.ledger.accountNumber")}
                  name="ledger-account-number"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  dir="ltr"
                />
              ) : (
                <>
                  <FormField label={translateMessage("accounting.reports.ledger.findAccount")} name="ledger-account-search">
                    {(controlProps) => <Input {...controlProps} type="search" value={accountSearchText} onChange={(event) => setAccountSearchText(event.target.value)} />}
                  </FormField>
                  <FormField label={translateMessage("accounting.reports.ledger.account")} name="ledger-account" isRequired>
                    {(controlProps) => (
                      <SearchableSelect
                        {...controlProps}
                        options={accountOptions}
                        value={chosenAccount?.accountId ?? null}
                        onValueChange={(accountId) => setChosenAccount((accountLookup.data ?? []).concat(chosenAccount ? [chosenAccount] : []).find((account) => account.accountId === accountId) ?? null)}
                        isClearable
                      />
                    )}
                  </FormField>
                </>
              )}
            </div>
            <div className="grid items-end gap-4 sm:grid-cols-4">
              <DateField label={translateMessage("accounting.common.from")} name="ledger-from" value={fromDate} onValueChange={setFromDate} isRequired />
              <DateField label={translateMessage("accounting.common.to")} name="ledger-to" value={toDate} onValueChange={setToDate} isRequired />
              <ReportStoreSelect name="ledger-store" storeId={storeId} onStoreIdChange={setStoreId} />
              <div className="flex items-center gap-2 pb-1">
                <Checkbox id="ledger-no-description" checked={!includeDescriptions} onCheckedChange={(checked) => setIncludeDescriptions(checked !== true)} />
                <Label htmlFor="ledger-no-description">{translateMessage("accounting.reports.ledger.noDescription")}</Label>
              </div>
            </div>
            <Button type="submit">{translateMessage("accounting.common.showReport")}</Button>
          </form>
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {submitted !== null && ledger.status === "loading" && <LoadingIndicator />}
      {submitted !== null && ledger.status === "error" && <FormResultNotice errorMessage={ledger.problem?.message} />}
      {ledger.data && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.ACCOUNT_LEDGER.PRINT)}>
              <PrintButton />
            </PermissionGate>
          </div>
          <PrintedReportHeading
            title={translateMessage("accounting.reports.ledger.printTitle", {
              account: `${ledger.data.account.code} ${ledger.data.account.title}`,
              from: ledger.data.fromDate,
              to: ledger.data.toDate,
            })}
          />
          {ledger.data.lines.items.length === 0 && ledger.data.openingBalanceAmount === 0 ? (
            <EmptyState title={translateMessage("accounting.common.noRows")} text={translateMessage("accounting.common.noRowsText")} />
          ) : (
            <SectionCard isPadded={false}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{translateMessage("accounting.reports.ledger.column.date")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.ledger.column.type")}</TableHead>
                    <TableHead>{translateMessage("accounting.reports.ledger.column.description")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.ledger.column.debit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.ledger.column.credit")}</TableHead>
                    <TableHead className="text-end">{translateMessage("accounting.reports.ledger.column.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5}>{translateMessage("accounting.reports.ledger.openingBalance")}</TableCell>
                    <TableCell className="text-end" data-testid="ledger-opening-balance">{formatAmountWithSide(ledger.data.openingBalanceAmount, ledger.data.openingBalanceSideCode, words)}</TableCell>
                  </TableRow>
                  {ledger.data.lines.items.map((line, index) => (
                    <TableRow key={`${line.entryId}-${index}`}>
                      <TableCell dir="ltr">{line.entryDate}</TableCell>
                      <TableCell>{line.sourceTypeCode}</TableCell>
                      <TableCell>{line.description ?? ""}</TableCell>
                      <TableCell className="text-end">{formatColumnAmount(line.debitAmount)}</TableCell>
                      <TableCell className="text-end">{formatColumnAmount(line.creditAmount)}</TableCell>
                      <TableCell className="text-end">{formatAmountWithSide(line.runningBalanceAmount, line.runningBalanceSideCode, words)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3}>{translateMessage("accounting.common.totals")}</TableCell>
                    <TableCell className="text-end" data-testid="ledger-total-debit">{formatColumnAmount(ledger.data.totalDebitAmount)}</TableCell>
                    <TableCell className="text-end" data-testid="ledger-total-credit">{formatColumnAmount(ledger.data.totalCreditAmount)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5}>{translateMessage("accounting.reports.ledger.closingBalance")}</TableCell>
                    <TableCell className="text-end" data-testid="ledger-closing-balance">{formatAmountWithSide(ledger.data.closingBalanceAmount, ledger.data.closingBalanceSideCode, words)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 p-3 print:hidden">
                  <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>
                    {translateMessage("accounting.common.previousPage")}
                  </Button>
                  <span className="text-sm">{translateMessage("accounting.common.pageOf", { page: pageNumber, total: totalPages })}</span>
                  <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber(pageNumber + 1)}>
                    {translateMessage("accounting.common.nextPage")}
                  </Button>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
