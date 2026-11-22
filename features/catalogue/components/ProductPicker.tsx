"use client";

import { useEffect, useMemo, useState } from "react";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { QueryStringParameterNames, SEARCH_INPUT_DEBOUNCE_MILLISECONDS } from "@/lib/constants/paginationDefaults";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { ApiPagedResponse } from "@/lib/api/normalisePagedResponse";
import type { ProductLookupResponse } from "../types/catalogueTypes";

export type PickedProduct = { productId: string; productCode: string; productName: string };
// A size picked by the size-level picker (barcode labels).
export type PickedSize = PickedProduct & { variantId: string; barcode: string; sizeCode: string };

const MINIMUM_SEARCH_LENGTH = 2;
const SUGGESTION_COUNT = 8;

// Finds a product by typing part of its name, code or barcode (the server searches). The person picks one suggestion.
// `path` is the picker endpoint of the screen (ApiEndpoints.products.lookupFor...), which carries that screen's permission.
export function ProductPicker({
  label,
  name,
  path,
  picked,
  onPick,
}: {
  label: string;
  name: string;
  path: string;
  picked: PickedProduct | null;
  onPick: (product: PickedProduct | null) => void;
}) {
  const { translateMessage } = useTranslation();
  const [text, setText] = useState("");
  const [appliedText, setAppliedText] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedText(text.trim()), SEARCH_INPUT_DEBOUNCE_MILLISECONDS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const isSearching = appliedText.length >= MINIMUM_SEARCH_LENGTH;
  const suggestions = useApiQuery<ApiPagedResponse<ProductLookupResponse>>(path, {
    query: { [QueryStringParameterNames.search]: appliedText, [QueryStringParameterNames.pageSize]: SUGGESTION_COUNT * 4 },
    enabled: isSearching && isOpen,
  });

  const products = useMemo(() => {
    const byProduct = new Map<string, PickedProduct>();
    for (const row of suggestions.data?.items ?? []) {
      if (!byProduct.has(row.productId)) byProduct.set(row.productId, { productId: row.productId, productCode: row.productCode, productName: row.productName });
    }
    return [...byProduct.values()].slice(0, SUGGESTION_COUNT);
  }, [suggestions.data]);

  return (
    <FormField label={label} name={name}>
      {(controlProps) => (
        <div className="relative">
          <Input
            {...controlProps}
            autoComplete="off"
            value={isOpen ? text : picked ? `${picked.productCode} - ${picked.productName}` : text}
            placeholder={translateMessage("catalogue.picker.placeholder")}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onChange={(event) => {
              setText(event.target.value);
              setIsOpen(true);
              if (picked) onPick(null);
            }}
          />
          {isOpen && isSearching && (
            <ul role="listbox" className="absolute start-0 top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover py-1 text-sm text-popover-foreground shadow-md">
              {suggestions.status === "loading" && <li className="px-3 py-2 text-muted-foreground">{translateMessage("common.loading")}</li>}
              {suggestions.status === "error" && <li className="px-3 py-2 text-destructive">{suggestions.problem?.message}</li>}
              {suggestions.status === "success" && products.length === 0 && <li className="px-3 py-2 text-muted-foreground">{translateMessage("searchableSelect.noResults")}</li>}
              {products.map((product) => (
                <li
                  key={product.productId}
                  role="option"
                  aria-selected={product.productId === picked?.productId}
                  className="cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                  // mousedown (not click) so the choice happens before the input loses focus and closes the list
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onPick(product);
                    setText("");
                    setIsOpen(false);
                  }}
                >
                  <span dir="ltr" className="me-2 text-xs text-muted-foreground">{product.productCode}</span>
                  {product.productName}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </FormField>
  );
}
