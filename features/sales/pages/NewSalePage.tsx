"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useIsOnline } from "@/lib/session/useSessionState";
import { showToast } from "@/lib/toast/toastStore";
import { SaleActionBar } from "../components/SaleActionBar";
import { SaleDocumentPrint } from "../components/SaleDocumentPrint";
import { SaleHeaderPanel } from "../components/SaleHeaderPanel";
import { SaleItemEntryPanel, type AddedItem } from "../components/SaleItemEntryPanel";
import { SaleLinesTable } from "../components/SaleLinesTable";
import { SalePaymentPanel } from "../components/SalePaymentPanel";
import { SaleTotalsPanel } from "../components/SaleTotalsPanel";
import { createRowKey, useSaleEntryWorkspace } from "../hooks/useSaleEntryWorkspace";
import { useSalesScreenShortcuts } from "../hooks/useSalesScreenShortcuts";
import { toSaleLineRequests } from "../logic/saleEntryLines";
import { newSaleScreen } from "../logic/saleScreenEndpoints";
import type { CreateSaleInvoiceRequest, SaleInvoiceResponse, VoidAndReenterSaleResponse } from "../types/saleTypes";

// New Sale (docx 5.1, Part 11). Scan or search items into the grid, take payment, save, print.
// Save sends ONE request carrying the client transaction id made when the entry was started: a double click, a retry or a lost answer can never post
// twice (Part 23). While the server has not confirmed it, the entry is kept in this browser and the screen says plainly that it is NOT saved.
export function NewSalePage() {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const isOnline = useIsOnline();
  const { hasPermission } = usePermissions();
  const workspace = useSaleEntryWorkspace(newSaleScreen);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [notSavedMessage, setNotSavedMessage] = useState<string>();
  const [savedInvoice, setSavedInvoice] = useState<SaleInvoiceResponse>();

  const mayAdd = hasPermission(newSaleScreen.addPermission) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.SALE_CREATE);
  const mayPrint = hasPermission(PermissionCodes.INVOICE.NEW_SALE.PRINT);
  const mayChangeSellingPrice = hasPermission(newSaleScreen.changeSellingPricePermission) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.PRICE_CHANGE);
  const mayGiveDiscount = hasPermission(newSaleScreen.giveDiscountPermission) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.DISCOUNT_MANUAL);

  const split = workspace.buildPaymentSplit(workspace.totals.netAmount);

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

  async function save(shouldPrint: boolean) {
    if (isSaving) return;
    setErrorMessages([]);
    setNotSavedMessage(undefined);
    const problems = workspace.findProblems(split.outstandingAmount).filter((problem) => problem.messageKey !== "sales.problem.stock");
    if (!split.isChangeCoveredByCash) problems.push({ messageKey: "sales.payment.changeNeedsCash" });
    if (workspace.invoiceBeingCorrected && workspace.voidReason.trim() === "") problems.push({ messageKey: "sales.correction.problem.reasonNeeded" });
    if (problems.length > 0) {
      setErrorMessages(problems.map((problem) => translateMessage(problem.messageKey as never, problem.params)));
      return;
    }

    const request: CreateSaleInvoiceRequest = {
      storeId: workspace.storeId,
      saleDate: workspace.header.saleDate,
      clientTransactionId: workspace.clientTransactionId,
      customerPartyId: workspace.header.customer?.partyId ?? null,
      salesmanPartyId: workspace.header.salesmanPartyId,
      walkInCustomerName: workspace.header.customer ? null : workspace.header.walkInCustomerName.trim() || null,
      walkInCustomerMobile: workspace.header.customer ? null : workspace.header.walkInCustomerMobile.trim() || null,
      posTerminalDeviceId: workspace.header.posTerminalDeviceId,
      description: workspace.header.description.trim() || null,
      lines: toSaleLineRequests(workspace.lines),
      payments: workspace.toPaymentRequests(split),
      cashReturnedAmount: split.changeAmount,
    };

    setIsSaving(true);
    // A correction ("void and re-enter") sends the old invoice's void reason together with the corrected sale; it is one transaction on the server.
    const correctedInvoiceId = workspace.invoiceBeingCorrected?.invoiceId;
    const result = correctedInvoiceId
      ? await apiRequest<VoidAndReenterSaleResponse>(ApiEndpoints.sales.invoices.voidAndReenter(correctedInvoiceId), {
          method: "POST",
          body: { voidReason: workspace.voidReason.trim(), correctedSale: request },
          idempotencyKey: workspace.clientTransactionId,
        })
      : await apiRequest<SaleInvoiceResponse>(newSaleScreen.savePath, { method: "POST", body: request, idempotencyKey: workspace.clientTransactionId });
    setIsSaving(false);

    if (!result.ok) {
      if (result.kind === "offline") {
        // The entry stays in the grid and in this browser, and the same client transaction id is sent again on the next try.
        setNotSavedMessage(translateMessage("sales.notSaved.connectionLost"));
      } else {
        setErrorMessages([result.problem.message]);
      }
      return;
    }

    const postedInvoice = "correctedInvoice" in result.data ? result.data.correctedInvoice : result.data;
    setSavedInvoice(postedInvoice);
    showToast(translateMessage("sales.saved.toast", { number: postedInvoice.invoiceNumber }), ToneNames.success);
    workspace.startNextEntry();
    workspace.entryContext.refetch();
    barcodeInputRef.current?.focus();
    if (shouldPrint) requestAnimationFrame(() => window.print());
  }

  function handleReset() {
    workspace.startNextEntry();
    setErrorMessages([]);
    setNotSavedMessage(undefined);
    barcodeInputRef.current?.focus();
  }

  useSalesScreenShortcuts({
    onFocusBarcode: () => barcodeInputRef.current?.focus(),
    onSave: () => void save(false),
  });

  const entryContext = workspace.entryContext.data;

  return (
    <div className="space-y-4">
      <PageHeader title={translateMessage("sales.newSale.title")} subtitle={translateMessage("sales.newSale.subtitle")} />

      {workspace.hasUnsavedEntry && (
        <InlineNotice tone={isOnline ? ToneNames.info : ToneNames.warning}>
          {isOnline ? translateMessage("sales.notSaved.inProgress") : translateMessage("sales.notSaved.offline")}
        </InlineNotice>
      )}
      {workspace.invoiceBeingCorrected && (
        <SectionCard>
          <div className="space-y-2" data-testid="sale-correction-banner">
            <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.correction.banner", { number: workspace.invoiceBeingCorrected.invoiceNumber })}</InlineNotice>
            <div className="max-w-xl space-y-1.5">
              <Label htmlFor="field-sale-void-reason">{translateMessage("sales.correction.reason")}</Label>
              <Input id="field-sale-void-reason" maxLength={200} value={workspace.voidReason} onChange={(event) => workspace.setVoidReason(event.target.value)} />
            </div>
          </div>
        </SectionCard>
      )}
      {workspace.wasDraftRestored && <InlineNotice tone={ToneNames.info}>{translateMessage("sales.notSaved.restored")}</InlineNotice>}
      {notSavedMessage && <InlineNotice tone={ToneNames.warning}>{notSavedMessage}</InlineNotice>}
      {!mayAdd && <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.newSale.noAddPermission")}</InlineNotice>}
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
      {savedInvoice && (
        <InlineNotice tone={ToneNames.success}>
          {translateMessage("sales.saved.notice", { number: savedInvoice.invoiceNumber, amount: formatWholeRupees(savedInvoice.netAmount) })}
          {mayPrint && (
            <Button type="button" variant="link" className="ms-2 h-auto p-0" onClick={() => window.print()}>
              {translateMessage("sales.saved.printAgain")}
            </Button>
          )}
        </InlineNotice>
      )}

      <SectionCard>
        <SaleHeaderPanel
          screen={newSaleScreen}
          header={workspace.header}
          onHeaderChange={workspace.updateHeader}
          entryContext={entryContext}
          nextInvoiceNumber={entryContext?.nextInvoiceNumber}
          salesmen={workspace.salesmen}
          posTerminals={workspace.posTerminals}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,340px)]">
        <SectionCard>
          <SaleItemEntryPanel
            screen={newSaleScreen}
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
          />
        </SectionCard>

        <div className="space-y-4">
          <SaleTotalsPanel totals={workspace.totals} />
          <SectionCard title={translateMessage("sales.payment.heading")}>
            <SalePaymentPanel
              paymentRows={workspace.paymentRows}
              onPaymentRowsChange={workspace.setPaymentRows}
              onAddPaymentRow={workspace.addPaymentRow}
              paymentAccounts={workspace.paymentAccounts}
              enabledMethods={entryContext?.paymentMethods ?? []}
              amountDue={workspace.totals.netAmount}
              split={split}
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard>
        <SaleActionBar
          description={workspace.header.description}
          onDescriptionChange={(description) => workspace.updateHeader({ description })}
          printChoices={workspace.printChoices}
          onPrintChoicesChange={workspace.updatePrintChoices}
          showsGatePassAndPromise
          isSaving={isSaving || !mayAdd}
          mayPrint={mayPrint}
          onSave={() => void save(false)}
          onSaveAndPrint={() => void save(true)}
          onReset={handleReset}
          onClose={() => router.push(ApplicationRoutes.companyDashboard)}
        />
      </SectionCard>

      {savedInvoice && entryContext && (
        <SaleDocumentPrint
          businessHeader={entryContext.businessHeader}
          invoice={savedInvoice}
          options={{ formatCode: workspace.printChoices.formatCode, languageCode: workspace.printChoices.languageCode, includeGatePass: workspace.printChoices.includeGatePass }}
          copyCount={entryContext.printDefaults.receiptCopies}
        />
      )}
    </div>
  );
}
