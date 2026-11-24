"use client";

import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/apiRequest";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import type { InventoryItemResponse } from "../types/inventoryTypes";

// The "Bar Code / Product Name" box of the entry screens (docx 4.16, 5.7, 5.9): a scanned or typed barcode finds the size at once; anything else is searched by
// product name or code and the person picks the size from the answer. The stock shown is the stock of the working store.
export function InventoryItemPicker({
  storeId,
  barcodePath,
  searchPath,
  onItemChosen,
  isDisabled = false,
}: {
  storeId: string;
  barcodePath: string;
  searchPath: string;
  onItemChosen: (item: InventoryItemResponse) => void;
  isDisabled?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const [text, setText] = useState("");
  const [results, setResults] = useState<InventoryItemResponse[]>([]);
  const [message, setMessage] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  function chooseItem(item: InventoryItemResponse) {
    onItemChosen(item);
    setText("");
    setResults([]);
    setMessage(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText === "") return;
    setIsBusy(true);
    setMessage(undefined);
    setResults([]);
    const byBarcode = await apiRequest<InventoryItemResponse>(barcodePath, { query: { storeId, barcode: trimmedText } });
    if (byBarcode.ok) {
      chooseItem(byBarcode.data);
      setIsBusy(false);
      return;
    }
    if (byBarcode.kind !== "notFound") {
      setMessage(byBarcode.problem.message);
      setIsBusy(false);
      return;
    }
    const bySearch = await apiRequest<InventoryItemResponse[]>(searchPath, { query: { storeId, searchText: trimmedText } });
    setIsBusy(false);
    if (!bySearch.ok) return setMessage(bySearch.problem.message);
    if (bySearch.data.length === 0) return setMessage(translateMessage("inventory.picker.nothingFound"));
    if (bySearch.data.length === 1) return chooseItem(bySearch.data[0]);
    setResults(bySearch.data);
  }

  return (
    <div className="space-y-2 print:hidden">
      <form onSubmit={handleSubmit} className="flex gap-2" role="search">
        <Input
          name="inventoryItemSearch"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={translateMessage("inventory.picker.placeholder")}
          aria-label={translateMessage("inventory.picker.label")}
          disabled={isDisabled || isBusy}
          autoComplete="off"
          dir="ltr"
        />
        <Button type="submit" variant="outline" disabled={isDisabled || isBusy || text.trim() === ""}>
          <Search />
          {translateMessage("inventory.picker.find")}
        </Button>
      </form>
      {message && <InlineNotice>{message}</InlineNotice>}
      {results.length > 0 && (
        <ul className="divide-y rounded-lg border" aria-label={translateMessage("inventory.picker.results")}>
          {results.map((item) => (
            <li key={item.variantId}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => chooseItem(item)}
              >
                <span>
                  {item.productName} <span className="text-muted-foreground">({translateMessage("inventory.common.size")} {item.sizeCode}{item.colorName ? `, ${item.colorName}` : ""})</span>
                </span>
                <span className="tabular-nums text-muted-foreground">{translateMessage("inventory.picker.inStock", { quantity: formatQuantity(item.stockQuantity) })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
