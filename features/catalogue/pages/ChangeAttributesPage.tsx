"use client";

import { useMemo, useRef, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { useCatalogueLookups, type CatalogueLookups } from "../hooks/useCatalogueLookups";
import {
  ProductAttributeFieldCodes,
  type AttributeChangeAppliedResponse,
  type ChangeProductAttributeRequest,
  type ProductAttributeFieldCode,
  type ProductAttributeRowResponse,
} from "../types/catalogueTypes";

const fieldDefinitions: { code: ProductAttributeFieldCode; labelKey: MessageKey; lookup: keyof CatalogueLookups }[] = [
  { code: ProductAttributeFieldCodes.unit, labelKey: "catalogue.field.unit", lookup: "unitOptions" },
  { code: ProductAttributeFieldCodes.brand, labelKey: "catalogue.field.brand", lookup: "brandOptions" },
  { code: ProductAttributeFieldCodes.category, labelKey: "catalogue.field.category", lookup: "categoryOptions" },
  { code: ProductAttributeFieldCodes.gender, labelKey: "catalogue.field.gender", lookup: "genderOptions" },
  { code: ProductAttributeFieldCodes.season, labelKey: "catalogue.field.season", lookup: "seasonOptions" },
  { code: ProductAttributeFieldCodes.color, labelKey: "catalogue.field.color", lookup: "colorOptions" },
];

// Change Attributes (docx 4.6): replace one value of a product field by another for every product that has it (for example move all
// products of brand "A" to brand "B"). The list shows the products that will change before anything is applied.
export function ChangeAttributesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const lookups = useCatalogueLookups();
  const mayApply = hasPermission(PermissionCodes.PRODUCTS.CHANGE_ATTRIBUTES.EDIT);
  const [fieldCode, setFieldCode] = useState<ProductAttributeFieldCode>(ProductAttributeFieldCodes.brand);
  const [oldValueId, setOldValueId] = useState<string | null>(null);
  const [newValueId, setNewValueId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [resultMessage, setResultMessage] = useState<string>();
  const transactionIdReference = useRef<string | null>(null);

  const definition = fieldDefinitions.find((candidate) => candidate.code === fieldCode) ?? fieldDefinitions[0];
  const options = lookups[definition.lookup];
  const newValueOptions = useMemo(() => options.filter((option) => option.value !== oldValueId), [options, oldValueId]);
  const canApply = mayApply && oldValueId !== null && newValueId !== null && oldValueId !== newValueId;

  function reset() {
    transactionIdReference.current = null;
    setResultMessage(undefined);
  }

  async function apply() {
    if (!oldValueId || !newValueId) return;
    transactionIdReference.current ??= createClientTransactionId();
    const body: ChangeProductAttributeRequest = { fieldType: fieldCode, oldValueId, newValueId, clientTransactionId: transactionIdReference.current };
    setIsApplying(true);
    setErrorMessage(undefined);
    const result = await apiRequest<AttributeChangeAppliedResponse>(ApiEndpoints.productAttributes.apply, { method: "POST", body, idempotencyKey: body.clientTransactionId });
    setIsApplying(false);
    setIsConfirming(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    transactionIdReference.current = null;
    const skipped = result.data.skippedProducts;
    setResultMessage(
      translateMessage("catalogue.result.attributesChanged", { count: result.data.changedProductCount }) +
        (skipped.length > 0 ? ` ${translateMessage("catalogue.result.attributesSkipped", { count: skipped.length, names: skipped.slice(0, 5).join(", ") })}` : ""),
    );
    showToast(translateMessage("catalogue.toast.attributesChanged"), ToneNames.success);
    setNewValueId(null);
    setOldValueId(null);
    setRefreshCounter((counter) => counter + 1);
  }

  const columns = useMemo<DataGridColumn<ProductAttributeRowResponse>[]>(
    () => [
      { key: "productCode", header: translateMessage("catalogue.field.productCode"), render: (row) => <span dir="ltr">{row.productCode}</span> },
      { key: "productName", header: translateMessage("catalogue.field.productName"), render: (row) => row.productName },
      { key: "unitName", header: translateMessage("catalogue.field.unit"), isSecondary: true, render: (row) => row.unitName ?? "" },
      { key: "brandName", header: translateMessage("catalogue.field.brand"), isSecondary: true, render: (row) => row.brandName ?? "" },
      { key: "categoryName", header: translateMessage("catalogue.field.category"), isSecondary: true, render: (row) => row.categoryName ?? "" },
      { key: "genderName", header: translateMessage("catalogue.field.gender"), isSecondary: true, render: (row) => row.genderName ?? "" },
      { key: "seasonName", header: translateMessage("catalogue.field.season"), isSecondary: true, render: (row) => row.seasonName ?? "" },
      { key: "colorName", header: translateMessage("catalogue.field.color"), isSecondary: true, render: (row) => row.colorName ?? "" },
    ],
    [translateMessage],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.changeAttributes")} subtitle={translateMessage("catalogue.changeAttributes.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label={translateMessage("catalogue.changeAttributes.attribute")} name="catalogueAttributeField">
            {(controlProps) => (
              <OptionSelect
                {...controlProps}
                value={fieldCode}
                onValueChange={(next) => {
                  reset();
                  setFieldCode(next as ProductAttributeFieldCode);
                  setOldValueId(null);
                  setNewValueId(null);
                }}
                options={fieldDefinitions.map((candidate) => ({ value: candidate.code, label: translateMessage(candidate.labelKey) }))}
              />
            )}
          </FormField>
          <FormField label={translateMessage("catalogue.changeAttributes.oldValue")} name="catalogueAttributeOld" isRequired>
            {(controlProps) => <SearchableSelect {...controlProps} options={options} value={oldValueId} onValueChange={(next) => { reset(); setOldValueId(next); }} />}
          </FormField>
          <FormField label={translateMessage("catalogue.changeAttributes.newValue")} name="catalogueAttributeNew" isRequired>
            {(controlProps) => <SearchableSelect {...controlProps} options={newValueOptions} value={newValueId} onValueChange={(next) => { reset(); setNewValueId(next); }} />}
          </FormField>
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} successMessage={resultMessage} />
      <SectionCard
        title={translateMessage("catalogue.changeAttributes.productsTitle")}
        isPadded={false}
        action={
          mayApply && (
            <Button type="button" disabled={!canApply || isApplying} onClick={() => setIsConfirming(true)}>
              {translateMessage("catalogue.action.apply")}
            </Button>
          )
        }
      >
        {oldValueId === null ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">{translateMessage("catalogue.changeAttributes.pickOldValue")}</p>
        ) : (
          <ServerPaginatedDataGrid<ProductAttributeRowResponse>
            path={ApiEndpoints.productAttributes.productsWithValue}
            columns={columns}
            getRowKey={(row) => row.productId}
            caption={translateMessage("catalogue.changeAttributes.productsTitle")}
            emptyTitle={translateMessage("catalogue.changeAttributes.noProducts")}
            // This list previews what the change below will touch, so it follows the chosen value at once.
            fixedFilters={{ fieldType: fieldCode, oldValueId }}
            refreshKey={refreshCounter}
            isSearchEnabled={false}
          />
        )}
      </SectionCard>
      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={apply}
        isPending={isApplying}
        isDestructive={false}
        titleMessageKey="catalogue.changeAttributes.confirmTitle"
        descriptionMessageKey="catalogue.changeAttributes.confirmText"
        confirmLabelMessageKey="catalogue.action.apply"
      />
    </div>
  );
}
