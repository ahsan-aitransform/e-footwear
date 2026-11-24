"use client";

import { useMemo, useRef, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { QuantityField } from "@/components/forms/QuantityField";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { InventoryItemPicker } from "../components/InventoryItemPicker";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import { claimReasonMessageKey } from "../logic/inventoryStatusPresentation";
import { buildProductClaimColumns } from "../logic/productClaimColumns";
import { ProductClaimReasonCodes, type CreateProductClaimRequest, type InventoryItemResponse, type ProductClaimReasonCode, type ProductClaimResponse } from "../types/inventoryTypes";

// Product Claim (docx 4.16): ask for pieces of the working store to be taken out of stock because they are damaged, defective or lost. A claim is a request:
// stock moves only when someone with the approval permission approves it on the Claim Approval screen.
export function ProductClaimPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const { storeId, storeName } = useInventoryWorkingStore();
  const transactionIdReference = useRef(createClientTransactionId());
  const [item, setItem] = useState<InventoryItemResponse>();
  const [quantity, setQuantity] = useState<number | null>(1);
  const [reasonCode, setReasonCode] = useState<ProductClaimReasonCode | "">("");
  const [note, setNote] = useState("");
  const [claimDate, setClaimDate] = useState(todayAsIsoDate());
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [gridVersion, setGridVersion] = useState(0);
  const mayAdd = hasPermission(PermissionCodes.PRODUCTS.PRODUCT_CLAIM.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.CLAIM_REQUEST);

  const reasonOptions = useMemo(
    () => Object.values(ProductClaimReasonCodes).map((code) => ({ value: code, label: translateMessage(claimReasonMessageKey(code)) })),
    [translateMessage],
  );
  const columns = useMemo(() => buildProductClaimColumns(translateMessage, { showStatus: true }), [translateMessage]);

  function reset() {
    setItem(undefined);
    setQuantity(1);
    setReasonCode("");
    setNote("");
    setErrorMessage(undefined);
    transactionIdReference.current = createClientTransactionId();
  }

  async function handleSave() {
    if (storeId === null) return;
    setErrorMessage(undefined);
    if (!item) return setErrorMessage(translateMessage("inventory.claim.problem.noItem"));
    if (quantity === null || quantity <= 0) return setErrorMessage(translateMessage("inventory.claim.problem.quantity"));
    if (quantity > item.stockQuantity) return setErrorMessage(translateMessage("inventory.claim.problem.moreThanInStock", { stock: formatQuantity(item.stockQuantity) }));
    if (reasonCode === "") return setErrorMessage(translateMessage("inventory.claim.problem.reason"));
    if (!isValidIsoDate(claimDate)) return setErrorMessage(translateMessage("fields.invalidDate"));
    setIsSaving(true);
    const request: CreateProductClaimRequest = {
      storeId,
      claimDate,
      clientTransactionId: transactionIdReference.current,
      variantId: item.variantId,
      quantity,
      reasonCode,
      note: note.trim() === "" ? null : note.trim(),
    };
    const result = await apiRequest<ProductClaimResponse>(ApiEndpoints.inventory.productClaims.list, { method: "POST", body: request, idempotencyKey: transactionIdReference.current });
    setIsSaving(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.claim.saved", { number: result.data.claimNumber }), ToneNames.success);
    setGridVersion((version) => version + 1);
    reset();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.claim.title")} subtitle={translateMessage("inventory.claim.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : (
        <>
          {mayAdd && (
            <SectionCard>
              <div className="space-y-4">
                <InventoryItemPicker
                  storeId={storeId}
                  barcodePath={ApiEndpoints.inventory.productClaims.itemByBarcode}
                  searchPath={ApiEndpoints.inventory.productClaims.itemSearch}
                  onItemChosen={setItem}
                  isDisabled={isSaving}
                />
                {item && (
                  <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-medium">{item.productName}</span> — {translateMessage("inventory.common.size")} {item.sizeCode} —{" "}
                    <span dir="ltr">{item.barcode}</span> — {translateMessage("inventory.picker.inStock", { quantity: formatQuantity(item.stockQuantity) })}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DateField label={translateMessage("inventory.common.date")} name="claimDate" value={claimDate} onValueChange={setClaimDate} maximumIsoDate={todayAsIsoDate()} isRequired />
                  <QuantityField label={translateMessage("inventory.column.quantity")} name="claimQuantity" value={quantity} onValueChange={setQuantity} isRequired />
                  <FormField label={translateMessage("inventory.column.reason")} name="claimReason" isRequired>
                    {(controlProps) => (
                      <OptionSelect {...controlProps} options={reasonOptions} value={reasonCode} onValueChange={(value) => setReasonCode(value as ProductClaimReasonCode | "")} emptyOptionLabel={translateMessage("inventory.claim.chooseReason")} />
                    )}
                  </FormField>
                  <TextInputField label={translateMessage("inventory.common.description")} name="claimNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
                </div>
                <FormResultNotice errorMessage={errorMessage} />
                <div className="flex gap-2">
                  <Button type="button" onClick={handleSave} disabled={isSaving}>
                    {translateMessage("inventory.common.save")}
                  </Button>
                  <Button type="button" variant="outline" onClick={reset} disabled={isSaving}>
                    {translateMessage("inventory.common.reset")}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}
          <SectionCard title={translateMessage("inventory.claim.list.title")} isPadded={false}>
            <ServerPaginatedDataGrid<ProductClaimResponse>
              key={`${storeId}-${gridVersion}`}
              path={ApiEndpoints.inventory.productClaims.list}
              filters={{ storeId }}
              columns={columns}
              getRowKey={(claim) => claim.id}
              caption={translateMessage("inventory.claim.list.caption")}
              emptyTitle={translateMessage("inventory.claim.list.empty")}
              isSearchEnabled={false}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
