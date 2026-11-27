"use client";

import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SearchButton } from "@/components/forms/SearchButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { formatContactBalance } from "../logic/contactBalanceFormatting";
import type { ContactScreenConfig } from "../types/contactScreenConfig";
import type { ContactLedgerResponse, ContactLookupItemResponse } from "../types/contactTypes";

const LEDGER_PAGE_SIZE = 100;

// Account Detail: pick a customer, vendor or staff member and, if wanted, a date range. The ledger shows an opening balance, every debit
// and credit with a running balance, and the totals. Ledger lines come from the journal, which is append-only, so the screen has no Edit
// or Delete on a line: a mistake is corrected by a reversing entry made where the document came from.
export function ContactAccountDetailPage({ config }: { config: ContactScreenConfig }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const searchParameters = useSearchParams();
  const prefix = config.messagePrefix;
  const text = (suffix: string) => translateMessage(`${prefix}.${suffix}` as MessageKey);
  const [contactId, setContactId] = useState(searchParameters.get(config.ledgerContactQueryName) ?? "");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  // The ledger shows what was last searched; a link to one contact opens it straight away.
  const [searched, setSearched] = useState({ contactId, fromDate, toDate });

  const candidates = useApiQuery<ContactLookupItemResponse[]>(config.endpoints.lookup, { query: { searchText: searchText || undefined } });
  const ledger = useApiQuery<ContactLedgerResponse>(config.endpoints.ledger, {
    query: { [config.ledgerContactQueryName]: searched.contactId, from: searched.fromDate || undefined, to: searched.toDate || undefined, pageNumber, pageSize: LEDGER_PAGE_SIZE },
    enabled: searched.contactId !== "",
  });
  const words = { receivable: text("balance.receivable"), payable: text("balance.payable") };
  const mayPrint = hasPermission(config.permissions.accountDetailPrint);
  const totalPages = ledger.data ? Math.max(1, Math.ceil(ledger.data.lines.totalCount / LEDGER_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage(config.titleMessageKeys.accountDetail as MessageKey)}
        subtitle={text("ledger.subtitle")}
        actions={
          mayPrint && searched.contactId ? (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer /> {text("ledger.print")}
            </Button>
          ) : undefined
        }
      />
      <SectionCard>
        <form
          className="grid items-end gap-4 md:grid-cols-5 print:hidden"
          onSubmit={(event) => {
            event.preventDefault();
            setSearched({ contactId, fromDate, toDate });
            setPageNumber(1);
            if (searched.contactId !== "") ledger.refetch();
          }}
        >
          <FormField label={text("ledger.find")} name="ledgerContactSearch">
            {(controlProps) => <Input {...controlProps} type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />}
          </FormField>
          <FormField label={text("ledger.contact")} name="ledgerContact">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={contactId} onChange={(event) => setContactId(event.target.value)}>
                <option value="">{translateMessage("masterData.choose")}</option>
                {(candidates.data ?? []).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.code} {candidate.name}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <DateField label={text("ledger.from")} name="ledgerFrom" value={fromDate} onValueChange={setFromDate} />
          <DateField label={text("ledger.to")} name="ledgerTo" value={toDate} onValueChange={setToDate} />
          <SearchButton className="w-fit" />
        </form>
      </SectionCard>

      {searched.contactId === "" && <p className="text-sm text-muted-foreground">{text("ledger.chooseFirst")}</p>}
      {ledger.status === "loading" && searched.contactId !== "" && <LoadingIndicator />}
      {ledger.status === "error" && <FormResultNotice errorMessage={ledger.problem?.message} />}
      {ledger.data && (
        <SectionCard isPadded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{text("ledger.date")}</TableHead>
                <TableHead>{text("ledger.document")}</TableHead>
                <TableHead>{text("ledger.description")}</TableHead>
                <TableHead className="text-end">{text("ledger.debit")}</TableHead>
                <TableHead className="text-end">{text("ledger.credit")}</TableHead>
                <TableHead className="text-end">{text("ledger.balance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5}>{text("ledger.openingBalance")}</TableCell>
                <TableCell className="text-end">{formatContactBalance(ledger.data.openingBalanceAmount, words)}</TableCell>
              </TableRow>
              {ledger.data.lines.items.map((line) => (
                <TableRow key={line.lineId}>
                  <TableCell dir="ltr">{line.entryDate}</TableCell>
                  <TableCell>{[line.sourceType, line.documentNumber].filter((part) => part !== null && part !== "").join(" #")}</TableCell>
                  <TableCell>{line.description ?? ""}</TableCell>
                  <TableCell className="text-end">{line.debitAmount === 0 ? "" : formatWholeRupees(line.debitAmount)}</TableCell>
                  <TableCell className="text-end">{line.creditAmount === 0 ? "" : formatWholeRupees(line.creditAmount)}</TableCell>
                  <TableCell className="text-end">{formatContactBalance(line.runningBalanceAmount, words)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{text("ledger.totals")}</TableCell>
                <TableCell className="text-end" data-testid="ledger-total-debit">{formatWholeRupees(ledger.data.totalDebitAmount)}</TableCell>
                <TableCell className="text-end" data-testid="ledger-total-credit">{formatWholeRupees(ledger.data.totalCreditAmount)}</TableCell>
                <TableCell className="text-end" data-testid="ledger-closing-balance">{formatContactBalance(ledger.data.closingBalanceAmount, words)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-3 print:hidden">
              <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>
                {text("ledger.previousPage")}
              </Button>
              <span className="text-sm">{pageNumber} / {totalPages}</span>
              <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber(pageNumber + 1)}>
                {text("ledger.nextPage")}
              </Button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
