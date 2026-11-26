"use client";

import { PromotionKindCodes } from "../types/promotionTypes";
import { PromotionRulesPage } from "./PromotionRulesPage";

// Sale on Categories (docx 2.16): one discount on whole categories in the chosen stores between two moments.
export function SaleOnCategoriesPage() {
  return <PromotionRulesPage kindCode={PromotionKindCodes.saleOnCategories} />;
}
