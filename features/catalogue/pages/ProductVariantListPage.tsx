"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { SearchButton } from "@/components/forms/SearchButton";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFocusSearchWithControlF } from "@/features/masterData/hooks/useFocusSearchWithControlF";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { formatPercentage, formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { CatalogueFilterFields, type CatalogueFilterFieldName } from "../components/CatalogueFilterFields";
import { ProductRowActionsMenu } from "../components/ProductRowActionsMenu";
import { ProductStatusBadge } from "../components/ProductStatusBadge";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import {
  ProductMatchModeCodes,
  ProductSearchFieldCodes,
  type PriceChangeAppliedResponse,
  type ProductDiscountAppliedResponse,
  type ProductListFilterValues,
  type ProductVariantListItemResponse,
  type RemoveProductDiscountsRequest,
  type SetNewSalePriceRequest,
} from "../types/catalogueTypes";

export type ProductVariantListMode = "view" | "search" | "discounts" | "discountRemoval";

const modeSettings: Record<
  ProductVariantListMode,
  { path: string; titleKey: MessageKey; subtitleKey: MessageKey; cacheName: string; hasSelection: boolean; needsStore: boolean }
> = {
  view: { path: ApiEndpoints.products.variants, titleKey: "navigation.item.viewProducts", subtitleKey: "catalogue.view.subtitle", cacheName: "catalogueViewProducts", hasSelection: false, needsStore: false },
  search: { path: ApiEndpoints.products.variantsSearch, titleKey: "navigation.item.searchProduct", subtitleKey: "catalogue.search.subtitle", cacheName: "catalogueSearchProduct", hasSelection: false, needsStore: false },
  discounts: { path: ApiEndpoints.products.variantsForDiscounts, titleKey: "navigation.item.productDiscounts", subtitleKey: "catalogue.productDiscounts.subtitle", cacheName: "catalogueProductDiscounts", hasSelection: true, needsStore: false },
  discountRemoval: { path: ApiEndpoints.products.variantsForDiscountRemoval, titleKey: "navigation.item.removeDiscountsAndReversePrice", subtitleKey: "catalogue.removeDiscounts.subtitle", cacheName: "catalogueRemoveDiscounts", hasSelection: true, needsStore: true },
};

const filterFields: readonly CatalogueFilterFieldName[] = ["storeId", "departmentId", "categoryId", "brandId", "genderId", "seasonId", "colorId"];

// The product grid of four screens (docx 4.2 View Products, 4.3 Search Product, 4.10 Product Discounts, 4.12 Remove Discounts and
// Reverse Price): one row per size, with stock, prices, discount, net price, margin and markup. View edits or deletes a product,
// Search adds the search-in and match options, Product Discounts sets a new sale price for the ticked products, and Remove
// Discounts takes the discount rule off the ticked products in one store (and can put the previous sale price back).
export function ProductVariantListPage({ mode }: { mode: ProductVariantListMode }) {
  const settings = modeSettings[mode];
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const containerReference = useRef<HTMLDivElement>(null);
  useFocusSearchWithControlF(containerReference);
  const workingStoreId = useWorkingStoreId();

  const [filter, setFilter] = useState<ProductListFilterValues>({ storeId: workingStoreId ?? undefined });
  // The store of the list on screen. The actions below work on it, not on a store that was chosen but not searched yet.
  const [searchedStoreId, setSearchedStoreId] = useState(filter.storeId);
  const [onlyActive, setOnlyActive] = useState(false);
  const [searchField, setSearchField] = useState<string>(ProductSearchFieldCodes.all);
  const [matchMode, setMatchMode] = useState<string>(ProductMatchModeCodes.contains);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
  const [toDelete, setToDelete] = useState<ProductVariantListItemResponse | null>(null);
  const [newSalePrice, setNewSalePrice] = useState<number | null>(null);
  const [alsoRestorePrice, setAlsoRestorePrice] = useState(false);
  const [isConfirmingApply, setIsConfirmingApply] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();

  const lookups = useCatalogueLookups(filter.departmentId);
  const mayEdit = hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.EDIT);
  const mayDelete = hasPermission(PermissionCodes.PRODUCTS.VIEW_PRODUCTS.DELETE);
  const mayApply = hasPermission(
    mode === "discounts" ? PermissionCodes.PRODUCTS.PRODUCT_DISCOUNTS.EDIT : PermissionCodes.PRODUCTS.REMOVE_DISCOUNTS_AND_REVERSE_PRICE.EDIT,
  );
  const mayOpenProduct = hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW);

  const selectedProductIds = useMemo(() => [...new Set([...selectedKeys].map((key) => key.split("|")[0]))], [selectedKeys]);
  const storeIsMissing = settings.needsStore && !searchedStoreId;

  const columns = useMemo<DataGridColumn<ProductVariantListItemResponse>[]>(() => {
    const base: DataGridColumn<ProductVariantListItemResponse>[] = [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), isSortable: true, render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "barcode", header: translateMessage("catalogue.field.barcode"), isSortable: true, render: (row) => <span dir="ltr">{row.barcode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), isSortable: true, render: (row) => row.productName },
      { key: "sizeCode", header: translateMessage("catalogue.field.size"), isSortable: true, render: (row) => row.sizeCode },
      { key: "color", header: translateMessage("catalogue.field.color"), isSortable: true, isSecondary: true, render: (row) => row.colorName ?? "" },
      { key: "unit", header: translateMessage("catalogue.field.unit"), isSortable: true, isSecondary: true, render: (row) => row.unitName ?? "" },
      { key: "stock", header: translateMessage("catalogue.field.stock"), isSortable: true, alignment: "end", render: (row) => formatQuantity(row.stockQuantity) },
      { key: "purchasePrice", header: translateMessage("catalogue.field.purchasePrice"), isSortable: true, alignment: "end", isSecondary: true, render: (row) => formatWholeRupees(row.purchasePrice, { withSymbol: false }) },
      { key: "salePrice", header: translateMessage("catalogue.field.salePrice"), isSortable: true, alignment: "end", render: (row) => formatWholeRupees(row.salePrice, { withSymbol: false }) },
      { key: "discountPercent", header: translateMessage("catalogue.field.discountPercent"), alignment: "end", isSecondary: true, render: (row) => (row.discountPercent === null ? "" : formatPercentage(row.discountPercent)) },
      { key: "discountAmount", header: translateMessage("catalogue.field.discountAmount"), alignment: "end", isSecondary: true, render: (row) => formatWholeRupees(row.discountAmount, { withSymbol: false }) },
      { key: "netPrice", header: translateMessage("catalogue.field.netPrice"), alignment: "end", render: (row) => formatWholeRupees(row.netPrice, { withSymbol: false }) },
      { key: "marginPercent", header: translateMessage("catalogue.field.marginPercent"), alignment: "end", isSecondary: true, render: (row) => (row.marginPercent === null ? "" : formatPercentage(row.marginPercent)) },
      { key: "markupPercent", header: translateMessage("catalogue.field.markupPercent"), alignment: "end", isSecondary: true, render: (row) => (row.markupPercent === null ? "" : formatPercentage(row.markupPercent)) },
      { key: "category", header: translateMessage("catalogue.field.category"), isSortable: true, isSecondary: true, render: (row) => row.categoryName },
      { key: "brand", header: translateMessage("catalogue.field.brand"), isSortable: true, isSecondary: true, render: (row) => row.brandName ?? "" },
      { key: "status", header: translateMessage("catalogue.field.status"), isSecondary: true, render: (row) => <ProductStatusBadge statusCode={row.status} /> },
    ];
    if (mode !== "view") return base;
    base.push({
      key: "actions",
      header: translateMessage("masterData.column.actions"),
      alignment: "end",
      render: (row) => (
        <div className="flex justify-end">
          <ProductRowActionsMenu onEdit={mayEdit ? () => router.push(ApplicationRoutes.editProduct(row.productId)) : undefined} onDelete={mayDelete ? () => setToDelete(row) : undefined} />
        </div>
      ),
    });
    return base;
  }, [translateMessage, mode, mayEdit, mayDelete, router]);

  async function confirmDelete() {
    if (!toDelete) return;
    const result = await apiRequest<void>(ApiEndpoints.products.byId(toDelete.productId), { method: "DELETE" });
    if (!result.ok) setErrorMessage(result.problem.message);
    else {
      setErrorMessage(undefined);
      showToast(translateMessage("catalogue.toast.productDeleted"), ToneNames.success);
      setRefreshCounter((counter) => counter + 1);
    }
    setToDelete(null);
  }

  function describeConflicts(conflictCount: number): string {
    return conflictCount > 0 ? ` ${translateMessage("catalogue.result.conflicts", { count: conflictCount })}` : "";
  }

  async function applyNewSalePrice() {
    if (newSalePrice === null) return;
    setIsApplying(true);
    setErrorMessage(undefined);
    const body: SetNewSalePriceRequest = {
      storeId: searchedStoreId ?? null,
      productIds: selectedProductIds,
      newSalePrice,
      clientTransactionId: createClientTransactionId(),
    };
    const result = await apiRequest<PriceChangeAppliedResponse>(ApiEndpoints.productPrices.newSalePrice, { method: "POST", body, idempotencyKey: body.clientTransactionId });
    setIsApplying(false);
    setIsConfirmingApply(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    setResultMessage(translateMessage("catalogue.result.pricesChanged", { count: result.data.changedVariantCount }) + describeConflicts(result.data.conflictingVariantCount));
    setSelectedKeys(new Set());
    setRefreshCounter((counter) => counter + 1);
  }

  async function removeDiscounts() {
    if (!searchedStoreId) return;
    setIsApplying(true);
    setErrorMessage(undefined);
    const body: RemoveProductDiscountsRequest = {
      storeId: searchedStoreId,
      productIds: selectedProductIds,
      alsoRestorePreviousSalePrice: alsoRestorePrice,
      clientTransactionId: createClientTransactionId(),
    };
    const result = await apiRequest<ProductDiscountAppliedResponse>(ApiEndpoints.productDiscounts.remove, { method: "POST", body, idempotencyKey: body.clientTransactionId });
    setIsApplying(false);
    setIsConfirmingApply(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    const data = result.data;
    setResultMessage(
      [
        translateMessage("catalogue.result.discountsRemoved", { count: data.affectedProductCount }),
        alsoRestorePrice ? translateMessage("catalogue.result.pricesRestored", { restored: data.restoredPriceVariantCount, skipped: data.skippedRestoreVariantCount }) : "",
        describeConflicts(data.conflictingVariantCount).trim(),
      ].filter(Boolean).join(" "),
    );
    setSelectedKeys(new Set());
    setRefreshCounter((counter) => counter + 1);
  }

  const gridFilters = {
    storeId: filter.storeId,
    departmentId: filter.departmentId,
    categoryId: filter.categoryId,
    brandId: filter.brandId,
    genderId: filter.genderId,
    seasonId: filter.seasonId,
    colorId: filter.colorId,
    onlyActive: onlyActive || undefined,
    searchField: mode === "search" ? searchField : undefined,
    matchMode: mode === "search" ? matchMode : undefined,
    includeDescription: mode === "search" && includeDescription ? true : undefined,
  };

  const canApplyDiscountsChange = mayApply && selectedProductIds.length > 0 && (mode === "discountRemoval" ? Boolean(searchedStoreId) : newSalePrice !== null);

  return (
    <div ref={containerReference} className="space-y-6">
      <PageHeader title={translateMessage(settings.titleKey)} subtitle={translateMessage(settings.subtitleKey)} />
      <SectionCard>
        <div className="space-y-4">
          <CatalogueFilterFields fields={filterFields} values={filter} onChange={setFilter} lookups={lookups} />
          <div className="flex flex-wrap items-end gap-4">
            {mode === "search" && (
              <>
                <FormField label={translateMessage("catalogue.search.searchIn")} name="catalogueSearchField">
                  {(controlProps) => (
                    <OptionSelect
                      {...controlProps}
                      className="w-44"
                      value={searchField}
                      onValueChange={setSearchField}
                      options={[
                        { value: ProductSearchFieldCodes.all, label: translateMessage("catalogue.search.fieldAll") },
                        { value: ProductSearchFieldCodes.name, label: translateMessage("catalogue.search.fieldName") },
                        { value: ProductSearchFieldCodes.code, label: translateMessage("catalogue.search.fieldCode") },
                        { value: ProductSearchFieldCodes.barcode, label: translateMessage("catalogue.search.fieldBarcode") },
                      ]}
                    />
                  )}
                </FormField>
                <FormField label={translateMessage("catalogue.search.matchMode")} name="catalogueMatchMode">
                  {(controlProps) => (
                    <OptionSelect
                      {...controlProps}
                      className="w-44"
                      value={matchMode}
                      onValueChange={setMatchMode}
                      options={[
                        { value: ProductMatchModeCodes.startsWith, label: translateMessage("catalogue.search.matchStartsWith") },
                        { value: ProductMatchModeCodes.contains, label: translateMessage("catalogue.search.matchContains") },
                        { value: ProductMatchModeCodes.endsWith, label: translateMessage("catalogue.search.matchEndsWith") },
                        { value: ProductMatchModeCodes.exact, label: translateMessage("catalogue.search.matchExact") },
                      ]}
                    />
                  )}
                </FormField>
                <div className="flex items-center gap-2 pb-1.5">
                  <Checkbox id="catalogueIncludeDescription" checked={includeDescription} onCheckedChange={(next) => setIncludeDescription(next === true)} />
                  <Label htmlFor="catalogueIncludeDescription">{translateMessage("catalogue.search.includeDescription")}</Label>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 pb-1.5">
              <Checkbox id="catalogueOnlyActive" checked={onlyActive} onCheckedChange={(next) => setOnlyActive(next === true)} />
              <Label htmlFor="catalogueOnlyActive">{translateMessage("catalogue.filter.onlyActive")}</Label>
            </div>
          </div>
        </div>
      </SectionCard>

      {settings.hasSelection && (
        <SectionCard title={translateMessage(mode === "discounts" ? "catalogue.productDiscounts.actionTitle" : "catalogue.removeDiscounts.actionTitle")}>
          <div className="flex flex-wrap items-end gap-4">
            {mode === "discounts" ? (
              <div className="w-56">
                <WholeRupeeAmountField
                  label={translateMessage("catalogue.productDiscounts.newSalePrice")}
                  name="catalogueNewSalePrice"
                  value={newSalePrice}
                  onValueChange={setNewSalePrice}
                  hint={translateMessage(searchedStoreId ? "catalogue.productDiscounts.storePriceHint" : "catalogue.productDiscounts.listPriceHint")}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 pb-1.5">
                <Checkbox id="catalogueAlsoRestorePrice" checked={alsoRestorePrice} onCheckedChange={(next) => setAlsoRestorePrice(next === true)} />
                <Label htmlFor="catalogueAlsoRestorePrice">{translateMessage("catalogue.removeDiscounts.restorePrice")}</Label>
              </div>
            )}
            <span className="pb-2 text-sm text-muted-foreground">{translateMessage("catalogue.selection.productsSelected", { count: selectedProductIds.length })}</span>
            {mayApply && (
              <Button type="button" disabled={!canApplyDiscountsChange || isApplying} onClick={() => setIsConfirmingApply(true)}>
                {translateMessage(mode === "discounts" ? "catalogue.productDiscounts.apply" : "catalogue.removeDiscounts.apply")}
              </Button>
            )}
          </div>
        </SectionCard>
      )}

      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      {storeIsMissing ? (
        <div className="flex flex-wrap items-center gap-3">
          <InlineNotice tone={ToneNames.info}>{translateMessage("catalogue.removeDiscounts.chooseStore")}</InlineNotice>
          <form onSubmit={(event) => { event.preventDefault(); setSearchedStoreId(filter.storeId); }}>
            <SearchButton isDisabled={!filter.storeId} />
          </form>
        </div>
      ) : (
        <SectionCard isPadded={false}>
          <ServerPaginatedDataGrid<ProductVariantListItemResponse>
            path={settings.path}
            columns={columns}
            getRowKey={(row) => `${row.productId}|${row.variantId}`}
            caption={translateMessage(settings.titleKey)}
            emptyTitle={translateMessage("catalogue.empty.title")}
            emptyText={translateMessage("catalogue.empty.text")}
            filters={gridFilters}
            refreshKey={refreshCounter}
            onSearch={() => setSearchedStoreId(filter.storeId)}
            isSearchDisabled={settings.needsStore && !filter.storeId}
            isSelectionEnabled={settings.hasSelection && mayApply}
            onSelectedRowKeysChange={setSelectedKeys}
            onRowOpen={mode !== "discounts" && mode !== "discountRemoval" && mayOpenProduct ? (row) => router.push(ApplicationRoutes.editProduct(row.productId)) : undefined}
            searchPlaceholder={translateMessage("catalogue.search.placeholder")}
            offlineCacheName={settings.cacheName}
          />
        </SectionCard>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={isConfirmingApply}
        onOpenChange={setIsConfirmingApply}
        onConfirm={mode === "discounts" ? applyNewSalePrice : removeDiscounts}
        isPending={isApplying}
        isDestructive={false}
        titleMessageKey={mode === "discounts" ? "catalogue.productDiscounts.confirmTitle" : "catalogue.removeDiscounts.confirmTitle"}
        descriptionMessageKey={mode === "discounts" ? "catalogue.productDiscounts.confirmText" : "catalogue.removeDiscounts.confirmText"}
        confirmLabelMessageKey="catalogue.action.apply"
      />
    </div>
  );
}
