"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatPercentage, formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import type { VariantPriceLookupResponse } from "../types/catalogueTypes";

function DetailRow({ label, value, isEmphasised = false }: { label: string; value: string; isEmphasised?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={isEmphasised ? "text-2xl font-semibold tabular-nums" : "font-medium tabular-nums"}>{value}</dd>
    </div>
  );
}

// Check Price (docx 4.5): scan or type a barcode and see the price the till would charge: the list price, the store's own price,
// the discount and the price after it. The barcode field keeps the focus and is selected after every lookup, so the next
// scan replaces it. The store decides which store price and discount apply.
export function PriceCheckPage() {
  const { translateMessage } = useTranslation();
  const workingStoreId = useWorkingStoreId();
  const lookups = useCatalogueLookups();
  const barcodeReference = useRef<HTMLInputElement>(null);
  const [barcode, setBarcode] = useState("");
  const [storeId, setStoreId] = useState<string | null>(workingStoreId);
  const [isLooking, setIsLooking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [lookup, setLookup] = useState<VariantPriceLookupResponse | null>(null);

  useEffect(() => {
    barcodeReference.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (barcode.trim() === "") return setErrorMessage(translateMessage("catalogue.priceCheck.barcodeRequired"));
    setIsLooking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<VariantPriceLookupResponse>(ApiEndpoints.products.priceCheck, { query: { barcode: barcode.trim(), storeId: storeId ?? undefined } });
    setIsLooking(false);
    if (result.ok) setLookup(result.data);
    else {
      setLookup(null);
      setErrorMessage(result.problem.message);
    }
    barcodeReference.current?.select();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.priceCheck")} subtitle={translateMessage("catalogue.priceCheck.subtitle")} />
      <SectionCard>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4" noValidate>
          <div className="min-w-64 flex-1">
            <FormField label={translateMessage("catalogue.field.barcode")} name="cataloguePriceCheckBarcode">
              {(controlProps) => (
                <Input {...controlProps} ref={barcodeReference} dir="ltr" autoComplete="off" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder={translateMessage("catalogue.priceCheck.scanHint")} />
              )}
            </FormField>
          </div>
          <div className="w-64">
            <FormField label={translateMessage("catalogue.filter.store")} name="cataloguePriceCheckStore">
              {(controlProps) => (
                <SearchableSelect {...controlProps} options={lookups.storeOptions} value={storeId} isClearable placeholder={translateMessage("catalogue.priceCheck.noStore")} onValueChange={setStoreId} />
              )}
            </FormField>
          </div>
          <Button type="submit" disabled={isLooking}>
            {translateMessage("catalogue.priceCheck.check")}
          </Button>
        </form>
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} />
      {lookup && (
        <SectionCard title={lookup.productName} description={`${lookup.productCode} · ${translateMessage("catalogue.field.size")} ${lookup.sizeCode}${lookup.colorName ? ` · ${lookup.colorName}` : ""}${lookup.brandName ? ` · ${lookup.brandName}` : ""}`}>
          <dl>
            <DetailRow label={translateMessage("catalogue.field.barcode")} value={lookup.barcode} />
            <DetailRow label={translateMessage("catalogue.field.stock")} value={formatQuantity(lookup.stockQuantity)} />
            <DetailRow label={translateMessage("catalogue.priceCheck.listPrice")} value={formatWholeRupees(lookup.listPrice)} />
            {lookup.storeId && <DetailRow label={translateMessage("catalogue.priceCheck.storePrice")} value={formatWholeRupees(lookup.storePrice)} />}
            <DetailRow label={translateMessage("catalogue.field.discountPercent")} value={lookup.discountPercent === null ? translateMessage("common.notAvailable") : formatPercentage(lookup.discountPercent)} />
            <DetailRow label={translateMessage("catalogue.field.discountAmount")} value={formatWholeRupees(lookup.discountAmount)} />
            <DetailRow label={translateMessage("catalogue.priceCheck.effectivePrice")} value={formatWholeRupees(lookup.effectiveSalePrice)} isEmphasised />
          </dl>
          {lookup.isPriceInConflict && (
            <div className="mt-4">
              <InlineNotice tone={ToneNames.warning}>{translateMessage("catalogue.priceCheck.conflict")}</InlineNotice>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
