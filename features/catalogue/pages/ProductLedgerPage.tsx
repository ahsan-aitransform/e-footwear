"use client";

import { useMemo, useState, type FormEvent } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { firstDayOfCurrentMonthAsIsoDate, isIsoDateRangeOrdered, todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { ProductPicker, type PickedProduct } from "../components/ProductPicker";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import { ledgerDocumentTypeMessageKey } from "../logic/ledgerDocumentTypes";
import type { ProductLedgerLineResponse, ProductLedgerResponse, ProductLedgerSummaryLineResponse } from "../types/catalogueTypes";

// Product Ledger (docx 4.4): every stock movement of one product (all its sizes, or the one barcode) in one store between two
// dates, with the opening and closing stock. "Detail" lists each movement; without it, one line per kind of movement.
export function ProductLedgerPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const workingStoreId = useWorkingStoreId();
  const lookups = useCatalogueLookups();
  const [storeId, setStoreId] = useState<string | null>(workingStoreId);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [barcode, setBarcode] = useState("");
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonthAsIsoDate);
  const [toDate, setToDate] = useState(todayAsIsoDate);
  const [isDetail, setIsDetail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [ledger, setLedger] = useState<ProductLedgerResponse | null>(null);
  const mayPrint = hasPermission(PermissionCodes.PRODUCTS.PRODUCT_LEDGER.PRINT);
  const mayExport = hasPermission(PermissionCodes.PRODUCTS.PRODUCT_LEDGER.EXPORT);

  const documentTypeName = (code: string) => {
    const key = ledgerDocumentTypeMessageKey(code);
    return key ? translateMessage(key) : code;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return setErrorMessage(translateMessage("catalogue.ledger.storeRequired"));
    if (!product && barcode.trim() === "") return setErrorMessage(translateMessage("catalogue.ledger.productRequired"));
    if (!isIsoDateRangeOrdered(fromDate, toDate)) return setErrorMessage(translateMessage("catalogue.ledger.dateOrder"));
    setIsLoading(true);
    setErrorMessage(undefined);
    const result = await apiRequest<ProductLedgerResponse>(ApiEndpoints.products.ledger, {
      query: { storeId, productId: barcode.trim() === "" ? product?.productId : undefined, barcode: barcode.trim() || undefined, fromDate, toDate, detail: isDetail },
    });
    setIsLoading(false);
    if (result.ok) setLedger(result.data);
    else {
      setLedger(null);
      setErrorMessage(result.problem.message);
    }
  }

  const summaryColumns = useMemo<DataGridColumn<ProductLedgerSummaryLineResponse>[]>(
    () => [
      { key: "documentType", header: translateMessage("catalogue.ledger.documentType"), render: (row) => documentTypeName(row.documentType) },
      { key: "movementCount", header: translateMessage("catalogue.ledger.movements"), alignment: "end", render: (row) => row.movementCount },
      { key: "quantityIn", header: translateMessage("catalogue.ledger.quantityIn"), alignment: "end", render: (row) => formatQuantity(row.quantityIn) },
      { key: "quantityOut", header: translateMessage("catalogue.ledger.quantityOut"), alignment: "end", render: (row) => formatQuantity(row.quantityOut) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage],
  );

  const lineColumns = useMemo<DataGridColumn<ProductLedgerLineResponse>[]>(
    () => [
      { key: "transactionDate", header: translateMessage("catalogue.ledger.date"), render: (row) => <span dir="ltr">{row.transactionDate}</span> },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), render: (row) => row.sizeCode },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSecondary: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "documentType", header: translateMessage("catalogue.ledger.documentType"), render: (row) => documentTypeName(row.documentType) },
      { key: "quantityIn", header: translateMessage("catalogue.ledger.quantityIn"), alignment: "end", render: (row) => (row.quantityIn === 0 ? "" : formatQuantity(row.quantityIn)) },
      { key: "quantityOut", header: translateMessage("catalogue.ledger.quantityOut"), alignment: "end", render: (row) => (row.quantityOut === 0 ? "" : formatQuantity(row.quantityOut)) },
      { key: "quantityAfter", header: translateMessage("catalogue.ledger.quantityAfter"), alignment: "end", render: (row) => formatQuantity(row.quantityAfter) },
      { key: "unitCost", header: translateMessage("catalogue.ledger.unitCost"), alignment: "end", isSecondary: true, render: (row) => formatWholeRupees(row.unitCost, { withSymbol: false }) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateMessage],
  );

  async function loadExportTable() {
    if (!ledger) return { errorMessage: translateMessage("catalogue.ledger.nothingToExport") };
    return {
      headers: [translateMessage("catalogue.ledger.date"), translateMessage("catalogue.field.size"), translateMessage("catalogue.field.barcode"), translateMessage("catalogue.ledger.documentType"), translateMessage("catalogue.ledger.quantityIn"), translateMessage("catalogue.ledger.quantityOut"), translateMessage("catalogue.ledger.quantityAfter"), translateMessage("catalogue.ledger.unitCost")],
      rows: ledger.lines.map((line) => [line.transactionDate, line.sizeCode, line.barcode, documentTypeName(line.documentType), line.quantityIn, line.quantityOut, line.quantityAfter, line.unitCost]),
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("navigation.item.productLedger")}
        subtitle={translateMessage("catalogue.ledger.subtitle")}
        actions={
          ledger && (
            <div className="flex gap-2">
              {mayPrint && <PrintButton />}
              {mayExport && <ExportCsvButton fileName={`product-ledger-${ledger.productCode}.csv`} loadTable={loadExportTable} />}
            </div>
          )
        }
      />
      <SectionCard>
        <form onSubmit={handleSubmit} className="space-y-4 print:hidden" noValidate>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label={translateMessage("catalogue.filter.store")} name="catalogueLedgerStore" isRequired>
              {(controlProps) => <SearchableSelect {...controlProps} options={lookups.storeOptions} value={storeId} onValueChange={setStoreId} />}
            </FormField>
            <ProductPicker path={ApiEndpoints.products.lookupForLedger} label={translateMessage("catalogue.field.productName")} name="catalogueLedgerProduct" picked={product} onPick={setProduct} />
            <TextInputField label={translateMessage("catalogue.field.barcode")} name="catalogueLedgerBarcode" dir="ltr" value={barcode} onChange={(event) => setBarcode(event.target.value)} hint={translateMessage("catalogue.ledger.barcodeHint")} />
            <DateField label={translateMessage("catalogue.ledger.fromDate")} name="catalogueLedgerFrom" value={fromDate} onValueChange={setFromDate} isRequired />
            <DateField label={translateMessage("catalogue.ledger.toDate")} name="catalogueLedgerTo" value={toDate} onValueChange={setToDate} isRequired />
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="catalogueLedgerDetail" checked={isDetail} onCheckedChange={(next) => setIsDetail(next === true)} />
              <Label htmlFor="catalogueLedgerDetail">{translateMessage("catalogue.ledger.detail")}</Label>
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            {translateMessage("catalogue.ledger.show")}
          </Button>
        </form>
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} />
      {ledger && (
        <div className="space-y-4">
          <PrintedReportHeading title={`${translateMessage("navigation.item.productLedger")}: ${ledger.productName}`} />
          <SectionCard
            title={`${ledger.productCode} · ${ledger.productName}`}
            description={`${ledger.storeName} · ${ledger.fromDate} - ${ledger.toDate}`}
          >
            <div className="flex flex-wrap gap-8 text-sm">
              <span>
                {translateMessage("catalogue.ledger.opening")}: <strong className="tabular-nums">{formatQuantity(ledger.openingQuantity)}</strong>
              </span>
              <span>
                {translateMessage("catalogue.ledger.closing")}: <strong className="tabular-nums">{formatQuantity(ledger.closingQuantity)}</strong>
              </span>
            </div>
          </SectionCard>
          <SectionCard title={translateMessage("catalogue.ledger.summary")} isPadded={false}>
            <DataGridTable rows={ledger.summary} columns={summaryColumns} getRowKey={(row) => row.documentType} caption={translateMessage("catalogue.ledger.summary")} emptyTitle={translateMessage("catalogue.ledger.noMovements")} />
          </SectionCard>
          {isDetail && (
            <SectionCard title={translateMessage("catalogue.ledger.lines")} isPadded={false}>
              <DataGridTable isClientSortDisabled rows={ledger.lines} columns={lineColumns} getRowKey={(row) => `${row.documentId}|${row.barcode}|${row.transactionAt}`} caption={translateMessage("catalogue.ledger.lines")} emptyTitle={translateMessage("catalogue.ledger.noMovements")} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
