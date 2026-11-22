"use client";

import { Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWorkingStoreId } from "@/features/parties/hooks/useWorkingStoreId";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { BarcodeLabelSheet } from "../components/BarcodeLabelSheet";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import {
  BarcodeLabelLayouts,
  DEFAULT_BARCODE_LABEL_LAYOUT_CODE,
  checkLabelRequest,
  expandLabelCopies,
  findBarcodeLabelLayout,
  type LabelRequestProblem,
} from "../logic/barcodeLabelLayouts";
import { CatalogueLimits } from "../logic/catalogueLimits";
import type { BarcodeLabelRequest, BarcodeLabelResponse, ProductLookupResponse } from "../types/catalogueTypes";

type LabelListItem = ProductLookupResponse & { copies: number | null };

const problemMessageKeys: Record<LabelRequestProblem, MessageKey> = {
  noSizes: "catalogue.barcodes.problem.noSizes",
  tooManySizes: "catalogue.barcodes.problem.tooManySizes",
  copiesOutOfRange: "catalogue.barcodes.problem.copiesOutOfRange",
  tooManyLabels: "catalogue.barcodes.problem.tooManyLabels",
};

// Generate Bar Codes (designed page, no docx screen): find sizes by product name, code or barcode, choose how many labels each
// needs, pick the label size, and print. The price on the label is the sale price of the chosen store (or the list price).
// Printing uses the browser's print dialog: only the label sheet is on paper (everything else is print:hidden).
export function GenerateBarcodesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const workingStoreId = useWorkingStoreId();
  const lookups = useCatalogueLookups();
  const mayPrint = hasPermission(PermissionCodes.PRODUCTS.GENERATE_BARCODES.PRINT);

  const [items, setItems] = useState<LabelListItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(workingStoreId);
  const [layoutCode, setLayoutCode] = useState<string>(DEFAULT_BARCODE_LABEL_LAYOUT_CODE);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [labels, setLabels] = useState<BarcodeLabelResponse[] | null>(null);

  const layout = findBarcodeLabelLayout(layoutCode);

  function addItem(size: ProductLookupResponse) {
    setLabels(null);
    setItems((current) => (current.some((item) => item.variantId === size.variantId) ? current : [...current, { ...size, copies: 1 }]));
  }

  function changeCopies(variantId: string, copies: number | null) {
    setLabels(null);
    setItems((current) => current.map((item) => (item.variantId === variantId ? { ...item, copies } : item)));
  }

  function removeItem(variantId: string) {
    setLabels(null);
    setItems((current) => current.filter((item) => item.variantId !== variantId));
  }

  async function buildLabels() {
    const problem = checkLabelRequest(items);
    if (problem) return setErrorMessage(translateMessage(problemMessageKeys[problem], { count: CatalogueLimits.maximumLabelsPerRequest }));
    setIsBuilding(true);
    setErrorMessage(undefined);
    const body: BarcodeLabelRequest = { items: items.map((item) => ({ variantId: item.variantId, copies: item.copies ?? 1 })), storeId };
    const result = await apiRequest<BarcodeLabelResponse[]>(ApiEndpoints.barcodes.labels, { method: "POST", body });
    setIsBuilding(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    setLabels(result.data);
  }

  const searchColumns = useMemo<DataGridColumn<ProductLookupResponse>[]>(
    () => [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), render: (row) => row.sizeCode },
      { key: "colorName", header: translateMessage("catalogue.field.color"), isSecondary: true, render: (row) => row.colorName ?? "" },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSecondary: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      {
        key: "add",
        header: "",
        alignment: "end",
        render: (row) => (
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(row)}>
            <Plus />
            {translateMessage("common.add")}
          </Button>
        ),
      },
    ],
    [translateMessage],
  );

  const listColumns = useMemo<DataGridColumn<LabelListItem>[]>(
    () => [
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), render: (row) => row.sizeCode },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSecondary: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      {
        key: "copies",
        header: translateMessage("catalogue.barcodes.copies"),
        alignment: "end",
        render: (row) => (
          <Input
            type="number"
            min={1}
            max={CatalogueLimits.maximumLabelCopiesPerSize}
            inputMode="numeric"
            dir="ltr"
            className="ms-auto w-24 text-end"
            aria-label={translateMessage("catalogue.barcodes.copies")}
            value={row.copies ?? ""}
            onChange={(event) => changeCopies(row.variantId, event.target.value === "" ? null : Number(event.target.value))}
          />
        ),
      },
      {
        key: "remove",
        header: "",
        alignment: "end",
        render: (row) => (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={translateMessage("masterData.action.delete")} onClick={() => removeItem(row.variantId)}>
            <Trash2 />
          </Button>
        ),
      },
    ],
    [translateMessage],
  );

  const printableLabels = labels === null ? [] : expandLabelCopies(labels);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader title={translateMessage("navigation.item.generateBarcodes")} subtitle={translateMessage("catalogue.barcodes.subtitle")} />
      </div>
      <div className="space-y-6 print:hidden">
        <SectionCard title={translateMessage("catalogue.barcodes.findTitle")} isPadded={false}>
          <ServerPaginatedDataGrid<ProductLookupResponse>
            path={ApiEndpoints.products.lookupForLabels}
            columns={searchColumns}
            getRowKey={(row) => row.variantId}
            caption={translateMessage("catalogue.barcodes.findTitle")}
            emptyTitle={translateMessage("catalogue.empty.title")}
            emptyText={translateMessage("catalogue.barcodes.findEmptyText")}
            initialPageSize={10}
            searchPlaceholder={translateMessage("catalogue.search.placeholder")}
          />
        </SectionCard>

        <SectionCard title={translateMessage("catalogue.barcodes.listTitle")} isPadded={false}>
          <DataGridTable rows={items} columns={listColumns} getRowKey={(row) => row.variantId} caption={translateMessage("catalogue.barcodes.listTitle")} emptyTitle={translateMessage("catalogue.barcodes.listEmpty")} emptyText={translateMessage("catalogue.barcodes.listEmptyText")} />
        </SectionCard>

        <SectionCard title={translateMessage("catalogue.barcodes.optionsTitle")}>
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label={translateMessage("catalogue.barcodes.labelSize")} name="catalogueLabelSize">
              {(controlProps) => (
                <OptionSelect {...controlProps} value={layoutCode} onValueChange={setLayoutCode} options={BarcodeLabelLayouts.map((candidate) => ({ value: candidate.code, label: `${candidate.widthMillimetres} × ${candidate.heightMillimetres} mm` }))} />
              )}
            </FormField>
            <FormField label={translateMessage("catalogue.filter.store")} name="catalogueLabelStore" hint={translateMessage("catalogue.barcodes.storeHint")}>
              {(controlProps) => <SearchableSelect {...controlProps} options={lookups.storeOptions} value={storeId} isClearable placeholder={translateMessage("catalogue.priceCheck.noStore")} onValueChange={(next) => { setLabels(null); setStoreId(next); }} />}
            </FormField>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="catalogueLabelShowName" checked={showName} onCheckedChange={setShowName} />
              <Label htmlFor="catalogueLabelShowName">{translateMessage("catalogue.barcodes.showName")}</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="catalogueLabelShowPrice" checked={showPrice} onCheckedChange={setShowPrice} />
              <Label htmlFor="catalogueLabelShowPrice">{translateMessage("catalogue.barcodes.showPrice")}</Label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={isBuilding} onClick={buildLabels}>
              {translateMessage("catalogue.barcodes.preview")}
            </Button>
            {mayPrint && (
              <Button type="button" variant="outline" disabled={printableLabels.length === 0} onClick={() => window.print()}>
                <Printer />
                {translateMessage("catalogue.barcodes.print", { count: printableLabels.length })}
              </Button>
            )}
          </div>
        </SectionCard>
        <FormResultNotice errorMessage={errorMessage} />
      </div>

      {labels !== null && (
        <section aria-label={translateMessage("catalogue.barcodes.sheetTitle")} className="space-y-2">
          <h2 className="text-sm font-semibold print:hidden">{translateMessage("catalogue.barcodes.sheetTitle")}</h2>
          <BarcodeLabelSheet labels={printableLabels} layout={layout} showName={showName} showPrice={showPrice} />
        </section>
      )}
    </div>
  );
}
