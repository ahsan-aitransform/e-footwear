"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";

export type SizeOfProductResponse = { variantId: string; productCode: string; productName: string; barcode: string; sizeCode: string; colorName: string | null };

// A barcode names one size. When a lookup fails because a product code was typed, these are the sizes to choose from.
export function useSizesOfProductCode() {
  const [sizes, setSizes] = useState<SizeOfProductResponse[]>([]);

  // true when the text is a product code with sizes to choose from
  async function findSizes(code: string): Promise<boolean> {
    const result = await apiRequest<SizeOfProductResponse[]>(ApiEndpoints.products.sizesByCode, { query: { code } });
    const found = result.ok && Array.isArray(result.data) ? result.data : [];
    setSizes(found);
    return found.length > 0;
  }

  return { sizes, findSizes, clearSizes: () => setSizes([]) };
}
