"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { RoundingModes } from "@/lib/constants/moneyFormat";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { ReturnedItemsSection } from "../components/ReturnedItemsSection";
import { SaleDocumentPrint } from "../components/SaleDocumentPrint";
import { useSalesScreenShortcuts } from "../hooks/useSalesScreenShortcuts";
import { calculateReturnTotal, findReturnProblems, toReturnedLineRequests, type ReturnSelections } from "../logic/saleReturnSelections";
import type { CreateSaleReturnRequest, ReturnableInvoiceResponse, SaleEntryContextResponse, SaleInvoiceResponse } from "../types/saleTypes";
import { SalePrintFormatCodes, SalePrintLanguageCodes } from "../types/saleTypes";

// Sale Return (docx 5.2, Part 12), designed with the link to the original invoice: the cashier finds the sale by its number and says how many of each
// line come back. The stock goes back, and the value is credited to the account of the customer (or kept in suspense for a walk-in customer).
// Paying cash back is not offered: that refund rule is [BUSINESS DECISION REQUIRED]. A return without an original invoice is not possible for the same
// reason (the original design had no invoice field; see the status file for the conflict).
export function SaleReturnPage() {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const workingStoreId = useWorkingStoreId();
  const { stores } = useAccessibleStores();
  const storeId = workingStoreId ?? stores[0]?.id ?? "";

  const [returnDate, setReturnDate] = useState(todayAsIsoDate);
  const [invoices, setInvoices] = useState<ReturnableInvoiceResponse[]>([]);
  const [selections, setSelections] = useState<ReturnSelections>({});
  const [description, setDescription] = useState("");
  const [clientTransactionId, setClientTransactionId] = useState(createClientTransactionId);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [notSavedMessage, setNotSavedMessage] = useState<string>();
  const [savedReturn, setSavedReturn] = useState<SaleInvoiceResponse>();
  const [shouldPrintAfterSaving, setShouldPrintAfterSaving] = useState(false);

  const entryContext = useApiQuery<SaleEntryContextResponse>(ApiEndpoints.sales.saleReturn.entryContext, { query: { storeId, businessDate: returnDate }, enabled: storeId !== "" });
  const roundingMode = entryContext.data?.roundingModeCode ?? RoundingModes.floor;
  const mayAdd = hasPermission(PermissionCodes.INVOICE.SALE_RETURN.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.SALE_RETURN);
  const mayPrint = hasPermission(PermissionCodes.INVOICE.SALE_RETURN.PRINT);
  const returnTotal = calculateReturnTotal(invoices, selections, roundingMode);

  // The customer of the original invoice gets the credit; a return from invoices of different customers is refused here, before the server is asked.
  const customerIds = new Set(invoices.map((invoice) => invoice.customerId ?? ""));

  async function save(shouldPrint: boolean) {
    if (isSaving) return;
    setErrorMessages([]);
    setNotSavedMessage(undefined);
    const problems = findReturnProblems(invoices, selections).map((problem) => translateMessage(problem.messageKey));
    if (customerIds.size > 1) problems.push(translateMessage("sales.return.problem.differentCustomers"));
    if (problems.length > 0) {
      setErrorMessages(problems);
      return;
    }
    const request: CreateSaleReturnRequest = {
      storeId,
      returnDate,
      clientTransactionId,
      customerId: invoices[0]?.customerId ?? null,
      description: description.trim() || null,
      lines: toReturnedLineRequests(invoices, selections),
    };
    setIsSaving(true);
    const result = await apiRequest<SaleInvoiceResponse>(ApiEndpoints.sales.saleReturn.save, { method: "POST", body: request, idempotencyKey: clientTransactionId });
    setIsSaving(false);
    if (!result.ok) {
      if (result.kind === "offline") setNotSavedMessage(translateMessage("sales.notSaved.connectionLost"));
      else setErrorMessages([result.problem.message]);
      return;
    }
    setSavedReturn(result.data);
    setShouldPrintAfterSaving(shouldPrint);
    showToast(translateMessage("sales.return.saved", { number: result.data.invoiceNumber }), ToneNames.success);
    reset();
    entryContext.refetch();
    if (shouldPrint) requestAnimationFrame(() => window.print());
  }

  function reset() {
    setInvoices([]);
    setSelections({});
    setDescription("");
    setClientTransactionId(createClientTransactionId());
    setErrorMessages([]);
    setNotSavedMessage(undefined);
  }

  useSalesScreenShortcuts({ onSave: () => void save(false) });

  const hasEntry = invoices.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader title={translateMessage("sales.return.title")} subtitle={translateMessage("sales.return.subtitle")} />
      {hasEntry && <InlineNotice tone={ToneNames.info}>{translateMessage("sales.notSaved.inProgress")}</InlineNotice>}
      {notSavedMessage && <InlineNotice tone={ToneNames.warning}>{notSavedMessage}</InlineNotice>}
      {!mayAdd && <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.return.noAddPermission")}</InlineNotice>}
      {storeId === "" && <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.common.chooseStore")}</InlineNotice>}
      {errorMessages.length > 0 && (
        <InlineNotice tone={ToneNames.danger}>
          {errorMessages.map((message, messageIndex) => (
            <span key={messageIndex} className="block">
              {message}
            </span>
          ))}
        </InlineNotice>
      )}
      {savedReturn && (
        <InlineNotice tone={ToneNames.success}>
          {translateMessage("sales.return.savedNotice", { number: savedReturn.invoiceNumber, amount: formatWholeRupees(-savedReturn.netAmount) })}
          {mayPrint && (
            <Button type="button" variant="link" className="ms-2 h-auto p-0" onClick={() => window.print()}>
              {translateMessage("sales.saved.printAgain")}
            </Button>
          )}
        </InlineNotice>
      )}

      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-3 print:hidden">
          <DateField label={translateMessage("sales.header.date")} name="return-date" value={returnDate} onValueChange={setReturnDate} isRequired />
          <div className="space-y-1.5">
            <Label htmlFor="field-return-number">{translateMessage("sales.return.returnNumber")}</Label>
            <Input id="field-return-number" readOnly dir="ltr" value={entryContext.data ? String(entryContext.data.nextReturnInvoiceNumber) : ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="field-return-customer">{translateMessage("sales.header.customer")}</Label>
            <Input
              id="field-return-customer"
              readOnly
              value={invoices[0] ? (invoices[0].customerName ?? invoices[0].walkInCustomerName ?? translateMessage("sales.header.cashSale")) : ""}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <ReturnedItemsSection
          invoiceByNumberPath={ApiEndpoints.sales.saleReturn.invoiceByNumber}
          storeId={storeId}
          roundingMode={roundingMode}
          invoices={invoices}
          onInvoicesChange={setInvoices}
          selections={selections}
          onSelectionsChange={setSelections}
        />
      </SectionCard>

      <SectionCard>
        <div className="space-y-4 print:hidden">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="field-return-description">{translateMessage("sales.bottom.description")}</Label>
              <Input id="field-return-description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <p className="text-lg font-semibold" data-testid="return-total">
              {translateMessage("sales.return.returnAmount")}: <span dir="ltr">{formatWholeRupees(returnTotal)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={isSaving || !mayAdd} onClick={() => void save(false)}>
              {translateMessage("sales.bottom.save")}
            </Button>
            {mayPrint && (
              <Button type="button" variant="secondary" disabled={isSaving || !mayAdd} onClick={() => void save(true)}>
                {translateMessage("sales.bottom.saveAndPrint")}
              </Button>
            )}
            <Button type="button" variant="outline" disabled={isSaving} onClick={reset}>
              {translateMessage("sales.bottom.reset")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push(ApplicationRoutes.companyDashboard)}>
              {translateMessage("sales.bottom.close")}
            </Button>
          </div>
        </div>
      </SectionCard>

      {savedReturn && entryContext.data && (
        <SaleDocumentPrint
          businessHeader={entryContext.data.businessHeader}
          invoice={savedReturn}
          options={{
            formatCode: entryContext.data.printDefaults.printFormatCode ?? SalePrintFormatCodes.thermal,
            languageCode: entryContext.data.printDefaults.printLanguageCode ?? SalePrintLanguageCodes.english,
            includeGatePass: false,
          }}
          copyCount={shouldPrintAfterSaving ? entryContext.data.printDefaults.receiptCopies : 1}
        />
      )}
    </div>
  );
}
