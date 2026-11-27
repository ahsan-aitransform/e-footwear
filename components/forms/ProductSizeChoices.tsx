"use client";

import { Button } from "@/components/ui/button";
import type { SizeOfProductResponse } from "@/lib/api/hooks/useSizesOfProductCode";
import { useTranslation } from "@/lib/i18n/useTranslation";

// One button per size of the product whose code was typed; choosing one carries on with that size's barcode.
export function ProductSizeChoices({ sizes, onChosen }: Readonly<{ sizes: readonly SizeOfProductResponse[]; onChosen: (barcode: string) => void }>) {
  const { translateMessage } = useTranslation();
  if (sizes.length === 0) return null;
  return (
    <div className="space-y-2" role="group" aria-label={translateMessage("common.chooseSize")}>
      <p className="text-sm font-medium">
        {sizes[0].productName}: {translateMessage("common.chooseSize")}
      </p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <Button key={size.variantId} type="button" variant="outline" size="sm" onClick={() => onChosen(size.barcode)}>
            {size.sizeCode}
            {size.colorName ? ` · ${size.colorName}` : ""}
          </Button>
        ))}
      </div>
    </div>
  );
}
