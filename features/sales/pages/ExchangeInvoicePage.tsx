"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ReturnedItemsSection } from "../components/ReturnedItemsSection";
import { SaleActionBar } from "../components/SaleActionBar";
import { SaleDocumentPrint } from "../components/SaleDocumentPrint";
import { SaleHeaderPanel } from "../components/SaleHeaderPanel";
import { SaleItemEntryPanel, type AddedItem } from "../components/SaleItemEntryPanel";
import { SaleLinesTable } from "../components/SaleLinesTable";
import { SalePaymentPanel } from "../components/SalePaymentPanel";
import { createRowKey, useSaleEntryWorkspace } from "../hooks/useSaleEntryWorkspace";
import { useSalesScreenShortcuts } from "../hooks/useSalesScreenShortcuts";
import { calculateExchangeAmounts } from "../logic/saleCalculations";
import { toSaleLineRequests } from "../logic/saleEntryLines";
import { calculateReturnTotal, findReturnProblems, toReturnedLineRequests, type ReturnSelections } from "../logic/saleReturnSelections";
import { exchangeScreen } from "../logic/saleScreenEndpoints";
import type { CreateExchangeRequest, ExchangeResponse, ReturnableInvoiceResponse } from "../types/saleTypes";

function AmountBox({ label, amount, testId }: { label: string; amount: number; testId: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums" dir="ltr" data-testid={testId}>
        {formatWholeRupees(amount)}
      </p>
    </div>
  );
}

// Exchange Invoice (docx 5.3): the old items come back (each tied to the invoice it was sold on) and the new items go out in ONE transaction. The
// customer pays, or is owed, only the difference: Difference = New Sale Amount - Return Amount. Either both documents are posted or neither.
export function ExchangeInvoicePage() {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const workspace = useSaleEntryWorkspace(exchangeScreen);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const [returnedInvoices, setReturnedInvoices] = useState<ReturnableInvoiceResponse[]>([]);
  const [selections, setSelections] = useState<ReturnSelections>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [notSavedMessage, setNotSavedMessage] = useState<string>();
  const [savedExchange, setSavedExchange] = useState<ExchangeResponse>();

  const mayAdd =
    hasPermission(PermissionCodes.INVOICE.EXCHANGE_INVOICE.ADD) &&
    hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.SALE_RETURN) &&
    hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.SALE_CREATE);
  const mayPrint = hasPermission(PermissionCodes.INVOICE.EXCHANGE_INVOICE.PRINT);
  const mayChangeSellingPrice = hasPermission(exchangeScreen.changeSellingPricePermission) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.PRICE_CHANGE);
  const mayGiveDiscount = hasPermission(exchangeScreen.giveDiscountPermission) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.DISCOUNT_MANUAL);

  const returnAmount = calculateReturnTotal(returnedInvoices, selections, workspace.roundingMode);
  const amounts = calculateExchangeAmounts(returnAmount, workspace.totals.netAmount);
  const split = workspace.buildPaymentSplit(amounts.customerPaysAmount);
  const returnedCustomerId = returnedInvoices[0]?.customerId ?? null;
  const hasEntry = workspace.hasUnsavedEntry || returnedInvoices.length > 0;

  function handleItemAdded(added: AddedItem) {
    workspace.dispatchLines({
      type: "itemAdded",
      item: added.item,
      quantity: added.quantity,
      lineKey: createRowKey(),
      unitPrice: added.unitPrice,
      discountTypeCode: added.discountTypeCode,
      discountValue: added.discountValue,
    });
  }

  function resetEverything() {
    workspace.startNextEntry();
    setReturnedInvoices([]);
    setSelections({});
    setErrorMessages([]);
    setNotSavedMessage(undefined);
  }

  async function save(shouldPrint: boolean) {
    if (isSaving) return;
    setErrorMessages([]);
    setNotSavedMessage(undefined);
    const customerId = workspace.header.customer?.customerId ?? returnedCustomerId;
    const problems = findReturnProblems(returnedInvoices, selections).map((problem) => translateMessage(problem.messageKey));
    for (const problem of workspace.findProblems(split.outstandingAmount).filter((candidate) => candidate.messageKey !== "sales.problem.creditNeedsCustomer")) {
      problems.push(translateMessage(problem.messageKey as never, problem.params));
    }
    if ((split.outstandingAmount > 0 || amounts.customerIsOwedAmount > 0) && customerId === null) problems.push(translateMessage("sales.exchange.problem.differenceNeedsCustomer"));
    if (!split.isChangeCoveredByCash) problems.push(translateMessage("sales.payment.changeNeedsCash"));
    if (problems.length > 0) {
      setErrorMessages(problems);
      return;
    }

    const request: CreateExchangeRequest = {
      storeId: workspace.storeId,
      exchangeDate: workspace.header.saleDate,
      clientTransactionId: workspace.clientTransactionId,
      customerId,
      salesmanStaffId: workspace.header.salesmanStaffId,
      walkInCustomerName: customerId ? null : workspace.header.walkInCustomerName.trim() || null,
      walkInCustomerMobile: customerId ? null : workspace.header.walkInCustomerMobile.trim() || null,
      posTerminalDeviceId: workspace.header.posTerminalDeviceId,
      description: workspace.header.description.trim() || null,
      returnedLines: toReturnedLineRequests(returnedInvoices, selections),
      newSaleLines: toSaleLineRequests(workspace.lines),
      payments: workspace.toPaymentRequests(split),
      cashReturnedAmount: split.changeAmount,
    };

    setIsSaving(true);
    const result = await apiRequest<ExchangeResponse>(exchangeScreen.savePath, { method: "POST", body: request, idempotencyKey: workspace.clientTransactionId });
    setIsSaving(false);
    if (!result.ok) {
      if (result.kind === "offline") setNotSavedMessage(translateMessage("sales.notSaved.connectionLost"));
      else setErrorMessages([result.problem.message]);
      return;
    }
    setSavedExchange(result.data);
    showToast(translateMessage("sales.exchange.saved", { returnNumber: result.data.returnInvoice.invoiceNumber, saleNumber: result.data.saleInvoice.invoiceNumber }), ToneNames.success);
    resetEverything();
    workspace.entryContext.refetch();
    if (shouldPrint) requestAnimationFrame(() => window.print());
  }

  useSalesScreenShortcuts({ onFocusBarcode: () => barcodeInputRef.current?.focus(), onSave: () => void save(false) });

  const entryContext = workspace.entryContext.data;

  return (
    <div className="space-y-4">
      <PageHeader title={translateMessage("sales.exchange.title")} subtitle={translateMessage("sales.exchange.subtitle")} />
      {hasEntry && <InlineNotice tone={ToneNames.info}>{translateMessage("sales.notSaved.inProgress")}</InlineNotice>}
      {workspace.wasDraftRestored && <InlineNotice tone={ToneNames.info}>{translateMessage("sales.notSaved.restoredNewItemsOnly")}</InlineNotice>}
      {notSavedMessage && <InlineNotice tone={ToneNames.warning}>{notSavedMessage}</InlineNotice>}
      {!mayAdd && <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.exchange.noAddPermission")}</InlineNotice>}
      {workspace.storeId === "" && <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.common.chooseStore")}</InlineNotice>}
      {errorMessages.length > 0 && (
        <InlineNotice tone={ToneNames.danger}>
          {errorMessages.map((message, messageIndex) => (
            <span key={messageIndex} className="block">
              {message}
            </span>
          ))}
        </InlineNotice>
      )}
      {savedExchange && (
        <InlineNotice tone={ToneNames.success}>
          {translateMessage("sales.exchange.savedNotice", { returnNumber: savedExchange.returnInvoice.invoiceNumber, saleNumber: savedExchange.saleInvoice.invoiceNumber })}
          {mayPrint && (
            <Button type="button" variant="link" className="ms-2 h-auto p-0" onClick={() => window.print()}>
              {translateMessage("sales.saved.printAgain")}
            </Button>
          )}
        </InlineNotice>
      )}

      <SectionCard>
        <SaleHeaderPanel
          screen={exchangeScreen}
          header={workspace.header}
          onHeaderChange={workspace.updateHeader}
          entryContext={entryContext}
          nextInvoiceNumber={entryContext?.nextInvoiceNumber}
          salesmen={workspace.salesmen}
          posTerminals={workspace.posTerminals}
        />
      </SectionCard>

      <SectionCard title={translateMessage("sales.exchange.returnedItems")}>
        <ReturnedItemsSection
          invoiceByNumberPath={ApiEndpoints.sales.exchange.invoiceByNumber}
          storeId={workspace.storeId}
          roundingMode={workspace.roundingMode}
          invoices={returnedInvoices}
          onInvoicesChange={setReturnedInvoices}
          selections={selections}
          onSelectionsChange={setSelections}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <SectionCard title={translateMessage("sales.exchange.newItems")}>
          <SaleItemEntryPanel
            screen={exchangeScreen}
            storeId={workspace.storeId}
            roundingMode={workspace.roundingMode}
            mayChangeSellingPrice={mayChangeSellingPrice}
            mayGiveDiscount={mayGiveDiscount}
            barcodeInputRef={barcodeInputRef}
            onItemAdded={handleItemAdded}
          />
        </SectionCard>
        <SectionCard isPadded={false}>
          <SaleLinesTable
            lines={workspace.lines}
            roundingMode={workspace.roundingMode}
            mayChangeSellingPrice={mayChangeSellingPrice}
            mayGiveDiscount={mayGiveDiscount}
            dispatchLines={workspace.dispatchLines}
            captionMessageKey="sales.exchange.newItemsCaption"
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-3 print:hidden" data-testid="exchange-amounts">
          <AmountBox label={translateMessage("sales.exchange.returnAmount")} amount={amounts.returnAmount} testId="exchange-return-amount" />
          <AmountBox label={translateMessage("sales.exchange.newSaleAmount")} amount={amounts.newSaleAmount} testId="exchange-new-sale-amount" />
          <AmountBox label={translateMessage("sales.exchange.difference")} amount={amounts.differenceAmount} testId="exchange-difference" />
          {amounts.customerIsOwedAmount > 0 && (
            <div className="sm:col-span-3">
              <InlineNotice tone={ToneNames.info}>{translateMessage("sales.exchange.customerIsOwed", { amount: formatWholeRupees(amounts.customerIsOwedAmount) })}</InlineNotice>
            </div>
          )}
        </div>
        <SectionCard title={translateMessage("sales.payment.heading")}>
          <SalePaymentPanel
            paymentRows={workspace.paymentRows}
            onPaymentRowsChange={workspace.setPaymentRows}
            onAddPaymentRow={workspace.addPaymentRow}
            paymentAccounts={workspace.paymentAccounts}
            enabledMethods={entryContext?.paymentMethods ?? []}
            amountDue={amounts.customerPaysAmount}
            split={split}
          />
        </SectionCard>
      </div>

      <SectionCard>
        <SaleActionBar
          description={workspace.header.description}
          onDescriptionChange={(description) => workspace.updateHeader({ description })}
          printChoices={workspace.printChoices}
          onPrintChoicesChange={workspace.updatePrintChoices}
          showsGatePassAndPromise={false}
          isSaving={isSaving || !mayAdd}
          mayPrint={mayPrint}
          onSave={() => void save(false)}
          onSaveAndPrint={() => void save(true)}
          onReset={resetEverything}
          onClose={() => router.push(ApplicationRoutes.home)}
        />
      </SectionCard>

      {savedExchange && entryContext && (
        <>
          {[savedExchange.returnInvoice, savedExchange.saleInvoice].map((invoice) => (
            <SaleDocumentPrint
              key={invoice.id}
              businessHeader={entryContext.businessHeader}
              invoice={invoice}
              options={{ formatCode: workspace.printChoices.formatCode, languageCode: workspace.printChoices.languageCode, includeGatePass: false }}
            />
          ))}
        </>
      )}
    </div>
  );
}
