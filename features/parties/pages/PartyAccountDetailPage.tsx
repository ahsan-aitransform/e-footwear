"use client";

import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { formatPartyBalance } from "../logic/partyBalanceFormatting";
import type { PartyLedgerResponse, PartyLookupItemResponse } from "../types/partyTypes";

const LEDGER_PAGE_SIZE = 100;

// Account Detail (docx 3.4): pick a party and, if wanted, a date range. The ledger shows an opening balance, every debit and
// credit with a running balance, and the totals. Ledger lines come from the journal, which is append-only, so the screen has
// no Edit or Delete on a line: a mistake is corrected by a reversing entry made where the document came from.
export function PartyAccountDetailPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const searchParameters = useSearchParams();
  const [partyId, setPartyId] = useState(searchParameters.get("partyId") ?? "");
  const [partySearchText, setPartySearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const candidates = useApiQuery<PartyLookupItemResponse[]>(ApiEndpoints.parties.lookup, {
    query: { searchText: partySearchText || undefined },
  });
  const ledger = useApiQuery<PartyLedgerResponse>(ApiEndpoints.partyLedger.ledger, {
    query: { partyId, from: fromDate || undefined, to: toDate || undefined, pageNumber, pageSize: LEDGER_PAGE_SIZE },
    enabled: partyId !== "",
  });
  const words = { receivable: translateMessage("parties.balance.receivable"), payable: translateMessage("parties.balance.payable") };
  const mayPrint = hasPermission(PermissionCodes.PARTY.ACCOUNT_DETAIL.PRINT);
  const totalPages = ledger.data ? Math.max(1, Math.ceil(ledger.data.lines.totalCount / LEDGER_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("navigation.item.partyAccountDetail")}
        subtitle={translateMessage("parties.ledger.subtitle")}
        actions={
          mayPrint && partyId ? (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer /> {translateMessage("parties.ledger.print")}
            </Button>
          ) : undefined
        }
      />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-4 print:hidden">
          <FormField label={translateMessage("parties.ledger.findParty")} name="ledgerPartySearch">
            {(controlProps) => <Input {...controlProps} type="search" value={partySearchText} onChange={(event) => setPartySearchText(event.target.value)} />}
          </FormField>
          <FormField label={translateMessage("parties.ledger.party")} name="ledgerParty">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={partyId} onChange={(event) => { setPartyId(event.target.value); setPageNumber(1); }}>
                <option value="">{translateMessage("masterData.choose")}</option>
                {(candidates.data ?? []).map((party) => (
                  <option key={party.id} value={party.id}>{party.code} {party.name}</option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <DateField label={translateMessage("parties.ledger.from")} name="ledgerFrom" value={fromDate} onValueChange={(date) => { setFromDate(date); setPageNumber(1); }} />
          <DateField label={translateMessage("parties.ledger.to")} name="ledgerTo" value={toDate} onValueChange={(date) => { setToDate(date); setPageNumber(1); }} />
        </div>
      </SectionCard>

      {partyId === "" && <p className="text-sm text-muted-foreground">{translateMessage("parties.ledger.choosePartyFirst")}</p>}
      {ledger.status === "loading" && partyId !== "" && <LoadingIndicator />}
      {ledger.status === "error" && <FormResultNotice errorMessage={ledger.problem?.message} />}
      {ledger.data && (
        <SectionCard isPadded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("parties.ledger.date")}</TableHead>
                <TableHead>{translateMessage("parties.ledger.document")}</TableHead>
                <TableHead>{translateMessage("parties.ledger.description")}</TableHead>
                <TableHead className="text-end">{translateMessage("parties.ledger.debit")}</TableHead>
                <TableHead className="text-end">{translateMessage("parties.ledger.credit")}</TableHead>
                <TableHead className="text-end">{translateMessage("parties.ledger.balance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5}>{translateMessage("parties.ledger.openingBalance")}</TableCell>
                <TableCell className="text-end">{formatPartyBalance(ledger.data.openingBalanceAmount, words)}</TableCell>
              </TableRow>
              {ledger.data.lines.items.map((line) => (
                <TableRow key={line.lineId}>
                  <TableCell dir="ltr">{line.entryDate}</TableCell>
                  <TableCell>{[line.sourceType, line.documentNumber].filter((part) => part !== null && part !== "").join(" #")}</TableCell>
                  <TableCell>{line.description ?? ""}</TableCell>
                  <TableCell className="text-end">{line.debitAmount === 0 ? "" : formatWholeRupees(line.debitAmount)}</TableCell>
                  <TableCell className="text-end">{line.creditAmount === 0 ? "" : formatWholeRupees(line.creditAmount)}</TableCell>
                  <TableCell className="text-end">{formatPartyBalance(line.runningBalanceAmount, words)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>{translateMessage("parties.ledger.totals")}</TableCell>
                <TableCell className="text-end" data-testid="ledger-total-debit">{formatWholeRupees(ledger.data.totalDebitAmount)}</TableCell>
                <TableCell className="text-end" data-testid="ledger-total-credit">{formatWholeRupees(ledger.data.totalCreditAmount)}</TableCell>
                <TableCell className="text-end" data-testid="ledger-closing-balance">{formatPartyBalance(ledger.data.closingBalanceAmount, words)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-3 print:hidden">
              <Button type="button" variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)}>
                {translateMessage("parties.ledger.previousPage")}
              </Button>
              <span className="text-sm">{pageNumber} / {totalPages}</span>
              <Button type="button" variant="outline" size="sm" disabled={pageNumber >= totalPages} onClick={() => setPageNumber(pageNumber + 1)}>
                {translateMessage("parties.ledger.nextPage")}
              </Button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
