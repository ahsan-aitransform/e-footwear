"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { PercentageField } from "@/components/forms/PercentageField";
import { QuantityField } from "@/components/forms/QuantityField";
import { WholeRupeeAmountField } from "@/components/forms/WholeRupeeAmountField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { fetchApiImageObjectUrl } from "@/lib/api/fileTransfer";
import type { RoundingMode } from "@/lib/constants/moneyFormat";
import { SEARCH_INPUT_DEBOUNCE_MILLISECONDS } from "@/lib/constants/paginationDefaults";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { calculateSaleLineAmounts } from "../logic/saleCalculations";
import type { SaleScreenConfiguration } from "../logic/saleScreenEndpoints";
import { SaleLineDiscountTypeCodes, type SaleItemResponse, type SaleLineDiscountTypeCode } from "../types/saleTypes";

export type AddedItem = {
  item: SaleItemResponse;
  quantity: number;
  unitPrice: number;
  discountTypeCode: SaleLineDiscountTypeCode;
  discountValue: number | null;
};

type PendingEntry = {
  item: SaleItemResponse;
  quantity: number | null;
  unitPrice: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
};

const MINIMUM_SEARCH_LENGTH = 2;

function createPendingEntry(item: SaleItemResponse): PendingEntry {
  return { item, quantity: 1, unitPrice: item.suggestedUnitPrice, discountPercent: null, discountAmount: null };
}

// The left panel of New Sale and Exchange (docx 5.1): Bar Code (F2) with [+], Manual, product name, Stock, Qty, Price, Disc. %, Discount, Total, the [+]
// button and the picture box. Scanning a barcode and pressing Enter adds the item at once with quantity 1; with Manual ticked the cashier searches by
// name or code, picks the item, adjusts quantity, price or discount and presses [+].
export function SaleItemEntryPanel({
  screen,
  storeId,
  roundingMode,
  mayChangeSellingPrice,
  mayGiveDiscount,
  barcodeInputRef,
  onItemAdded,
}: {
  screen: SaleScreenConfiguration;
  storeId: string;
  roundingMode: RoundingMode;
  mayChangeSellingPrice: boolean;
  mayGiveDiscount: boolean;
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  onItemAdded: (added: AddedItem) => void;
}) {
  const { translateMessage } = useTranslation();
  const [barcodeText, setBarcodeText] = useState("");
  const [isManual, setIsManual] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [message, setMessage] = useState<string>();
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearchText(searchText.trim()), SEARCH_INPUT_DEBOUNCE_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const suggestions = useApiQuery<SaleItemResponse[]>(screen.itemSearchPath, {
    query: { storeId, searchText: appliedSearchText },
    enabled: isManual && storeId !== "" && appliedSearchText.length >= MINIMUM_SEARCH_LENGTH && pending === null,
  });

  const pendingProductId = pending?.item.hasPicture ? pending.item.productId : null;
  useEffect(() => {
    if (!pendingProductId) return;
    let isCurrent = true;
    let createdUrl: string | null = null;
    void fetchApiImageObjectUrl(screen.itemPicturePath(pendingProductId)).then((url) => {
      if (!isCurrent) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      createdUrl = url;
      setPictureUrl(url);
    });
    return () => {
      isCurrent = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [pendingProductId, screen]);

  function addPendingEntry(entry: PendingEntry) {
    const quantity = entry.quantity ?? 0;
    const unitPrice = entry.unitPrice ?? entry.item.suggestedUnitPrice;
    if (!(quantity > 0)) {
      setMessage(translateMessage("sales.problem.quantity"));
      return;
    }
    const hasPercent = (entry.discountPercent ?? 0) > 0;
    const hasAmount = !hasPercent && (entry.discountAmount ?? 0) > 0;
    onItemAdded({
      item: entry.item,
      quantity,
      unitPrice,
      discountTypeCode: hasPercent ? SaleLineDiscountTypeCodes.percent : hasAmount ? SaleLineDiscountTypeCodes.amount : SaleLineDiscountTypeCodes.none,
      discountValue: hasPercent ? entry.discountPercent : hasAmount ? entry.discountAmount : null,
    });
    setPending(null);
    setPictureUrl(null);
    setBarcodeText("");
    setSearchText("");
    setAppliedSearchText("");
    setMessage(undefined);
    barcodeInputRef.current?.focus();
  }

  async function lookUpBarcode() {
    const barcode = barcodeText.trim();
    if (barcode === "") return;
    setMessage(undefined);
    const result = await apiRequest<SaleItemResponse>(screen.itemByBarcodePath, { query: { storeId, barcode } });
    if (!result.ok) {
      setMessage(result.problem.message);
      setBarcodeText("");
      barcodeInputRef.current?.focus();
      return;
    }
    // A scanned item goes straight into the grid; "Manual" keeps it in the panel so quantity, price and discount can be set first.
    if (isManual) {
      setPending(createPendingEntry(result.data));
      return;
    }
    addPendingEntry(createPendingEntry(result.data));
  }

  function handleBarcodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    void lookUpBarcode();
  }

  function handlePendingKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || !pending) return;
    event.preventDefault();
    event.stopPropagation();
    addPendingEntry(pending);
  }

  const pendingAmounts = pending
    ? calculateSaleLineAmounts(
        {
          quantity: pending.quantity ?? 0,
          listPrice: pending.item.listPrice,
          unitPrice: pending.unitPrice ?? pending.item.suggestedUnitPrice,
          discountTypeCode:
            (pending.discountPercent ?? 0) > 0
              ? SaleLineDiscountTypeCodes.percent
              : (pending.discountAmount ?? 0) > 0
                ? SaleLineDiscountTypeCodes.amount
                : SaleLineDiscountTypeCodes.none,
          discountValue: (pending.discountPercent ?? 0) > 0 ? pending.discountPercent : pending.discountAmount,
        },
        roundingMode,
      )
    : null;

  return (
    <div className="space-y-3 print:hidden" data-testid="sale-item-entry-panel">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField label={translateMessage("sales.entry.barcode")} name="sale-barcode" hint={translateMessage("sales.entry.barcodeHint")}>
            {(controlProps) => (
              <Input
                {...controlProps}
                ref={barcodeInputRef}
                value={barcodeText}
                onChange={(event) => setBarcodeText(event.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                autoComplete="off"
                dir="ltr"
              />
            )}
          </FormField>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label={translateMessage("sales.entry.addItem")} onClick={() => void lookUpBarcode()}>
          <Plus />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="sale-manual"
          checked={isManual}
          onCheckedChange={(checked) => {
            setIsManual(checked === true);
            setPending(null);
          }}
        />
        <Label htmlFor="sale-manual">{translateMessage("sales.entry.manual")}</Label>
      </div>

      {isManual && pending === null && (
        <div className="space-y-2">
          <FormField label={translateMessage("sales.entry.searchProduct")} name="sale-product-search">
            {(controlProps) => <Input {...controlProps} value={searchText} onChange={(event) => setSearchText(event.target.value)} autoComplete="off" />}
          </FormField>
          {(suggestions.data ?? []).length > 0 && (
            <ul className="max-h-48 divide-y overflow-auto rounded-lg border" role="listbox" aria-label={translateMessage("sales.entry.searchResults")}>
              {(suggestions.data ?? []).map((item) => (
                <li key={item.variantId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-muted focus-visible:bg-muted"
                    onClick={() => setPending(createPendingEntry(item))}
                  >
                    <span>
                      {item.productName} · {item.sizeCode}
                      {item.colorName ? ` · ${item.colorName}` : ""}
                    </span>
                    <span className="text-muted-foreground" dir="ltr">
                      {formatWholeRupees(item.suggestedUnitPrice, { withSymbol: false })} / {formatQuantity(item.stockQuantity)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pending && (
        <div className="space-y-3 rounded-lg border p-3" onKeyDown={handlePendingKeyDown} data-testid="sale-pending-item">
          <div className="flex gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-xs text-muted-foreground">
              {pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pictureUrl} alt={pending.item.productName} className="size-full object-cover" />
              ) : (
                translateMessage("sales.entry.noPicture")
              )}
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{pending.item.productName}</p>
              <p className="text-muted-foreground">
                {pending.item.productCode} · {pending.item.sizeCode}
              </p>
              <p>
                {translateMessage("sales.entry.stock")}: <span dir="ltr">{formatQuantity(pending.item.stockQuantity)}</span>
              </p>
            </div>
          </div>
          {pending.item.hasPromotionConflict && <InlineNotice tone={ToneNames.warning}>{translateMessage("sales.entry.promotionConflict")}</InlineNotice>}
          <div className="grid grid-cols-2 gap-3">
            <QuantityField
              label={translateMessage("sales.grid.quantity")}
              name="sale-pending-quantity"
              value={pending.quantity}
              onValueChange={(quantity) => setPending((current) => (current ? { ...current, quantity } : current))}
            />
            <WholeRupeeAmountField
              label={translateMessage("sales.grid.price")}
              name="sale-pending-price"
              value={pending.unitPrice}
              isDisabled={!mayChangeSellingPrice}
              onValueChange={(unitPrice) => setPending((current) => (current ? { ...current, unitPrice } : current))}
            />
            <PercentageField
              label={translateMessage("sales.grid.discountPercent")}
              name="sale-pending-discount-percent"
              value={pending.discountPercent}
              isDisabled={!mayGiveDiscount}
              onValueChange={(discountPercent) => setPending((current) => (current ? { ...current, discountPercent, discountAmount: null } : current))}
            />
            <WholeRupeeAmountField
              label={translateMessage("sales.grid.discountPerUnit")}
              name="sale-pending-discount-amount"
              value={pending.discountAmount}
              isDisabled={!mayGiveDiscount}
              onValueChange={(discountAmount) => setPending((current) => (current ? { ...current, discountAmount, discountPercent: null } : current))}
            />
          </div>
          <p className="text-sm font-medium">
            {translateMessage("sales.grid.total")}: <span dir="ltr">{formatWholeRupees(pendingAmounts?.netAmount ?? 0)}</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={() => addPendingEntry(pending)}>
              <Plus />
              {translateMessage("sales.entry.addItem")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPending(null);
                setPictureUrl(null);
              }}
            >
              {translateMessage("sales.entry.cancelItem")}
            </Button>
          </div>
        </div>
      )}

      {message && <InlineNotice tone={ToneNames.danger}>{message}</InlineNotice>}
    </div>
  );
}
