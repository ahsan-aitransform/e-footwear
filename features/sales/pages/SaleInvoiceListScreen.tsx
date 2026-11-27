"use client";

import { Pencil, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { RoleCodes } from "@/lib/constants/roleCodes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { showToast } from "@/lib/toast/toastStore";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { SaleDocumentPrint } from "../components/SaleDocumentPrint";
import { SaleInvoiceDetailCard } from "../components/SaleInvoiceDetailCard";
import { createRowKey } from "../hooks/useSaleEntryWorkspace";
import { buildCorrectionDraft } from "../logic/saleCorrectionDraft";
import { SalesDraftScreenCodes, saveSalesDraft } from "../logic/saleEntryDraftStorage";
import {
  SaleDocumentTypeCodes,
  SaleInvoiceStatusCodes,
  SalePrintFormatCodes,
  SalePrintLanguageCodes,
  type SaleInvoiceListItemResponse,
  type SaleInvoiceResponse,
  type SalePrintDocumentResponse,
  type SalePrintFormatCode,
  type SalePrintLanguageCode,
  type VoidSaleInvoiceResponse,
} from "../types/saleTypes";

export const SaleInvoiceListModes = { invoices: "invoices", deleted: "deleted" } as const;
export type SaleInvoiceListMode = (typeof SaleInvoiceListModes)[keyof typeof SaleInvoiceListModes];

type FilterDraft = {
  storeId: string;
  fromDate: string;
  toDate: string;
  invoiceNumber: string;
  documentTypeCode: string;
  statusCode: string;
  minimumNetAmount: number | null;
  maximumNetAmount: number | null;
};

const emptyFilterDraft: FilterDraft = {
  storeId: "",
  fromDate: "",
  toDate: "",
  invoiceNumber: "",
  documentTypeCode: "",
  statusCode: "",
  minimumNetAmount: null,
  maximumNetAmount: null,
};

// View Invoices (the designed page of Part 11) and View Deleted Invoices (docx 5.13): filter, list, open, print. From View Invoices a posted sale can be
// voided (a reason is required; the stock, the journal and the commission are reversed and the invoice stays in the history) or corrected with
// "void and re-enter", which opens the New Sale screen filled with the same items. Nothing here ever edits a posted invoice in place.
// On View Invoices a cashier has no filters: only the search box of the list.
export function SaleInvoiceListScreen({ mode }: { mode: SaleInvoiceListMode }) {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const session = useCurrentSession();
  const { hasPermission } = usePermissions();
  const { stores } = useAccessibleStores();
  const isDeletedMode = mode === SaleInvoiceListModes.deleted;
  const permissions = isDeletedMode ? PermissionCodes.INVOICE.VIEW_DELETED_INVOICES : PermissionCodes.INVOICE.VIEW_INVOICES;
  const areFiltersShown = isDeletedMode || session?.roleCode !== RoleCodes.cashierSalesman;
  const listPath = isDeletedMode ? ApiEndpoints.sales.deletedInvoices.list : ApiEndpoints.sales.invoices.list;

  const [draft, setDraft] = useState<FilterDraft>(emptyFilterDraft);
  const [applied, setApplied] = useState<FilterDraft>(emptyFilterDraft);
  const [gridVersion, setGridVersion] = useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>();
  const [printDocument, setPrintDocument] = useState<SalePrintDocumentResponse>();
  const [printFormat, setPrintFormat] = useState<SalePrintFormatCode | "">("");
  const [printLanguage, setPrintLanguage] = useState<SalePrintLanguageCode | "">("");
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string }>();

  const mayPrint = hasPermission(permissions.PRINT);
  const mayVoid = !isDeletedMode && hasPermission(PermissionCodes.INVOICE.VIEW_INVOICES.DELETE);
  const mayCorrect =
    !isDeletedMode &&
    hasPermission(PermissionCodes.INVOICE.VIEW_INVOICES.EDIT) &&
    hasPermission(PermissionCodes.INVOICE.VIEW_INVOICES.DELETE) &&
    hasPermission(PermissionCodes.INVOICE.NEW_SALE.ADD) &&
    hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.SALES.SALE_CREATE);

  const filters = useMemo(
    () => ({
      storeId: applied.storeId || undefined,
      fromDate: applied.fromDate || undefined,
      toDate: applied.toDate || undefined,
      invoiceNumber: applied.invoiceNumber.trim() === "" ? undefined : applied.invoiceNumber.trim(),
      documentTypeCode: applied.documentTypeCode || undefined,
      statusCode: isDeletedMode ? undefined : applied.statusCode || undefined,
      minimumNetAmount: applied.minimumNetAmount ?? undefined,
      maximumNetAmount: applied.maximumNetAmount ?? undefined,
    }),
    [applied, isDeletedMode],
  );

  const detailPath = selectedInvoiceId ? (isDeletedMode ? ApiEndpoints.sales.deletedInvoices.byId(selectedInvoiceId) : ApiEndpoints.sales.invoices.byId(selectedInvoiceId)) : null;
  const detail = useApiQuery<SaleInvoiceResponse>(detailPath ?? "", { enabled: detailPath !== null });
  const invoice = detailPath ? detail.data : undefined;

  const columns: DataGridColumn<SaleInvoiceListItemResponse>[] = [
    { key: "invoiceNumber", header: translateMessage("sales.list.invoiceNumber"), isSortable: true, render: (row) => <span dir="ltr">{row.invoiceNumber}</span> },
    { key: "saleDate", header: translateMessage("sales.header.date"), isSortable: true, render: (row) => <span dir="ltr">{row.saleDate}</span> },
    {
      key: "documentTypeCode",
      header: translateMessage("sales.list.type"),
      render: (row) => (
        <span>
          {translateMessage(row.documentTypeCode === SaleDocumentTypeCodes.return ? "sales.detail.typeReturn" : "sales.detail.typeSale")}
          {row.isPartOfExchange ? ` (${translateMessage("sales.list.exchange")})` : ""}
        </span>
      ),
    },
    { key: "customerName", header: translateMessage("sales.header.customer"), isSortable: true, render: (row) => row.customerName ?? row.walkInCustomerName ?? "" },
    { key: "salesmanName", header: translateMessage("sales.header.salesman"), isSecondary: true, render: (row) => row.salesmanName ?? "" },
    { key: "netAmount", header: translateMessage("sales.totals.netBill"), alignment: "end", isSortable: true, render: (row) => <span dir="ltr">{formatWholeRupees(row.netAmount)}</span> },
    { key: "outstandingAmount", header: translateMessage("sales.payment.balance"), alignment: "end", isSecondary: true, render: (row) => <span dir="ltr">{formatWholeRupees(row.outstandingAmount)}</span> },
    {
      key: "statusCode",
      header: translateMessage("sales.list.status"),
      render: (row) => (
        <ToneBadge tone={row.statusCode === SaleInvoiceStatusCodes.void ? ToneNames.danger : ToneNames.success}>
          {translateMessage(row.statusCode === SaleInvoiceStatusCodes.void ? "sales.status.VOID" : "sales.status.POSTED")}
        </ToneBadge>
      ),
    },
    ...(isDeletedMode
      ? [
          { key: "voidReason", header: translateMessage("sales.detail.voidReason"), render: (row: SaleInvoiceListItemResponse) => row.voidReason ?? "" },
          { key: "voidedByName", header: translateMessage("sales.detail.voidedBy"), isSecondary: true, render: (row: SaleInvoiceListItemResponse) => row.voidedByName ?? "" },
        ]
      : []),
    {
      key: "open",
      header: "",
      render: (row) => (
        <Button type="button" variant="outline" size="sm" onClick={() => openInvoice(row.id)}>
          {translateMessage("sales.list.open")}
        </Button>
      ),
    },
  ];

  function openInvoice(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    setPrintDocument(undefined);
    setMessage(undefined);
  }

  async function printInvoice() {
    if (!selectedInvoiceId) return;
    const path = isDeletedMode ? ApiEndpoints.sales.deletedInvoices.printDocument(selectedInvoiceId) : ApiEndpoints.sales.invoices.printDocument(selectedInvoiceId);
    const result = await apiRequest<SalePrintDocumentResponse>(path);
    if (!result.ok) {
      setMessage({ tone: "danger", text: result.problem.message });
      return;
    }
    setPrintDocument(result.data);
    requestAnimationFrame(() => window.print());
  }

  async function voidInvoice() {
    if (!selectedInvoiceId) return;
    if (voidReason.trim() === "") {
      setMessage({ tone: "danger", text: translateMessage("sales.void.reasonNeeded") });
      return;
    }
    setIsVoiding(true);
    const result = await apiRequest<VoidSaleInvoiceResponse>(ApiEndpoints.sales.invoices.voidInvoice(selectedInvoiceId), {
      method: "POST",
      body: { reason: voidReason.trim() },
      idempotencyKey: createClientTransactionId(),
    });
    setIsVoiding(false);
    if (!result.ok) {
      setMessage({ tone: "danger", text: result.problem.message });
      setIsVoidDialogOpen(false);
      return;
    }
    setIsVoidDialogOpen(false);
    setVoidReason("");
    setMessage({
      tone: "success",
      text: translateMessage(result.data.voidedInvoiceCount > 1 ? "sales.void.doneBoth" : "sales.void.done", { number: result.data.invoice.invoiceNumber }),
    });
    showToast(translateMessage("sales.void.done", { number: result.data.invoice.invoiceNumber }), ToneNames.success);
    detail.refetch();
    setGridVersion((current) => current + 1);
  }

  async function startCorrection(source: SaleInvoiceResponse) {
    if (!session?.companyId || !session.userId) return;
    await saveSalesDraft(
      { companyId: session.companyId, userId: session.userId, storeId: source.storeId, screenCode: SalesDraftScreenCodes.newSale },
      buildCorrectionDraft(source, createClientTransactionId(), createRowKey),
    );
    router.push(ApplicationRoutes.newSale);
  }

  const canStillBeChanged =
    invoice !== undefined &&
    invoice.statusCode === SaleInvoiceStatusCodes.posted &&
    invoice.relatedInvoiceId === null;
  const canBeCorrected = canStillBeChanged && invoice.documentTypeCode === SaleDocumentTypeCodes.sale;

  return (
    <div className="space-y-4">
      <PageHeader
        title={translateMessage(isDeletedMode ? "sales.deleted.title" : "sales.list.title")}
        subtitle={translateMessage(isDeletedMode ? "sales.deleted.subtitle" : "sales.list.subtitle")}
      />

      {areFiltersShown && (
        <SectionCard>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(draft);
            }}
          >
            <FormField label={translateMessage("sales.detail.store")} name="invoice-filter-store">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={draft.storeId} onChange={(event) => setDraft({ ...draft, storeId: event.target.value })}>
                  <option value="">{translateMessage("sales.list.allStores")}</option>
                  {stores.filter((store) => !store.isHeadOffice).map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <DateField label={translateMessage("sales.list.fromDate")} name="invoice-filter-from" value={draft.fromDate} onValueChange={(fromDate) => setDraft({ ...draft, fromDate })} />
            <DateField label={translateMessage("sales.list.toDate")} name="invoice-filter-to" value={draft.toDate} onValueChange={(toDate) => setDraft({ ...draft, toDate })} />
            <div className="space-y-1.5">
              <Label htmlFor="field-invoice-filter-number">{translateMessage("sales.list.invoiceNumber")}</Label>
              <Input id="field-invoice-filter-number" inputMode="numeric" dir="ltr" value={draft.invoiceNumber} onChange={(event) => setDraft({ ...draft, invoiceNumber: event.target.value })} />
            </div>
            <FormField label={translateMessage("sales.list.type")} name="invoice-filter-type">
              {(controlProps) => (
                <NativeSelect {...controlProps} value={draft.documentTypeCode} onChange={(event) => setDraft({ ...draft, documentTypeCode: event.target.value })}>
                  <option value="">{translateMessage("sales.list.anyType")}</option>
                  <option value={SaleDocumentTypeCodes.sale}>{translateMessage("sales.detail.typeSale")}</option>
                  <option value={SaleDocumentTypeCodes.return}>{translateMessage("sales.detail.typeReturn")}</option>
                </NativeSelect>
              )}
            </FormField>
            {!isDeletedMode && (
              <FormField label={translateMessage("sales.list.status")} name="invoice-filter-status">
                {(controlProps) => (
                  <NativeSelect {...controlProps} value={draft.statusCode} onChange={(event) => setDraft({ ...draft, statusCode: event.target.value })}>
                    <option value="">{translateMessage("sales.list.anyStatus")}</option>
                    <option value={SaleInvoiceStatusCodes.posted}>{translateMessage("sales.status.POSTED")}</option>
                    <option value={SaleInvoiceStatusCodes.void}>{translateMessage("sales.status.VOID")}</option>
                  </NativeSelect>
                )}
              </FormField>
            )}
            <WholeRupeeAmountField label={translateMessage("sales.list.minimumAmount")} name="invoice-filter-minimum" value={draft.minimumNetAmount} onValueChange={(minimumNetAmount) => setDraft({ ...draft, minimumNetAmount })} />
            <WholeRupeeAmountField label={translateMessage("sales.list.maximumAmount")} name="invoice-filter-maximum" value={draft.maximumNetAmount} onValueChange={(maximumNetAmount) => setDraft({ ...draft, maximumNetAmount })} />
            <div className="flex items-end gap-2">
              <Button type="submit">{translateMessage("sales.list.search")}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(emptyFilterDraft);
                  setApplied(emptyFilterDraft);
                }}
              >
                {translateMessage("sales.list.clearFilters")}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      {message && <InlineNotice tone={message.tone === "danger" ? ToneNames.danger : ToneNames.success}>{message.text}</InlineNotice>}

      <div className="print:hidden">
        <ServerPaginatedDataGrid<SaleInvoiceListItemResponse>
          key={gridVersion}
          path={listPath}
          columns={columns}
          getRowKey={(row) => row.id}
          caption={translateMessage(isDeletedMode ? "sales.deleted.title" : "sales.list.title")}
          emptyTitle={translateMessage(isDeletedMode ? "sales.deleted.empty" : "sales.list.empty")}
          fixedFilters={filters}
          onSearch={() => setApplied(draft)}
          defaultSort={{ columnKey: "saleDate", direction: "descending" }}
          isSearchEnabled
          searchPlaceholder={translateMessage("sales.list.searchPlaceholder")}
          onRowOpen={(row) => openInvoice(row.id)}
        />
      </div>

      {selectedInvoiceId && detail.status === "loading" && <p className="text-sm text-muted-foreground">{translateMessage("sales.detail.loading")}</p>}
      {selectedInvoiceId && detail.status === "error" && <InlineNotice tone={ToneNames.danger}>{detail.problem?.message ?? translateMessage("sales.detail.failed")}</InlineNotice>}

      {invoice && (
        <div className="print:hidden">
          <SaleInvoiceDetailCard
            invoice={invoice}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {mayPrint && (
                  <>
                    <NativeSelect
                      aria-label={translateMessage("sales.bottom.paper")}
                      className="w-28"
                      value={printFormat}
                      onChange={(event) => setPrintFormat(event.target.value as SalePrintFormatCode | "")}
                    >
                      <option value="">{translateMessage("sales.detail.paperDefault")}</option>
                      <option value={SalePrintFormatCodes.thermal}>{translateMessage("sales.bottom.paperThermal")}</option>
                      <option value={SalePrintFormatCodes.a4}>{translateMessage("sales.bottom.paperAFour")}</option>
                      <option value={SalePrintFormatCodes.a5}>{translateMessage("sales.bottom.paperAFive")}</option>
                    </NativeSelect>
                    <NativeSelect
                      aria-label={translateMessage("sales.bottom.language")}
                      className="w-32"
                      value={printLanguage}
                      onChange={(event) => setPrintLanguage(event.target.value as SalePrintLanguageCode | "")}
                    >
                      <option value="">{translateMessage("sales.detail.languageDefault")}</option>
                      <option value={SalePrintLanguageCodes.english}>{translateMessage("sales.bottom.languageEnglish")}</option>
                      <option value={SalePrintLanguageCodes.urdu}>{translateMessage("sales.bottom.languageUrdu")}</option>
                    </NativeSelect>
                    <Button type="button" variant="outline" onClick={() => void printInvoice()}>
                      <Printer />
                      {translateMessage("sales.detail.print")}
                    </Button>
                  </>
                )}
                {mayCorrect && canBeCorrected && (
                  <Button type="button" variant="outline" onClick={() => void startCorrection(invoice)}>
                    <Pencil />
                    {translateMessage("sales.detail.voidAndReenter")}
                  </Button>
                )}
                {mayVoid && canStillBeChanged && (
                  <Button type="button" variant="destructive" onClick={() => setIsVoidDialogOpen(true)}>
                    <Trash2 />
                    {translateMessage("sales.detail.void")}
                  </Button>
                )}
              </div>
            }
          />
        </div>
      )}

      <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translateMessage("sales.void.title", { number: invoice?.invoiceNumber ?? "" })}</DialogTitle>
            <DialogDescription>{translateMessage("sales.void.explanation")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="field-void-reason">{translateMessage("sales.correction.reason")}</Label>
            <Textarea id="field-void-reason" maxLength={200} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsVoidDialogOpen(false)}>
              {translateMessage("sales.void.cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={isVoiding} onClick={() => void voidInvoice()}>
              {translateMessage("sales.void.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printDocument && (
        <SaleDocumentPrint
          businessHeader={printDocument.businessHeader}
          invoice={printDocument.invoice}
          options={{
            formatCode: printFormat || printDocument.printDefaults.printFormatCode,
            languageCode: printLanguage || printDocument.printDefaults.printLanguageCode,
            includeGatePass: false,
          }}
          copyCount={printDocument.printDefaults.receiptCopies}
        />
      )}
    </div>
  );
}
