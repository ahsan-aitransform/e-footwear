"use client";

import { PromotionKindCodes } from "../types/promotionTypes";
import { PromotionRulesPage } from "./PromotionRulesPage";

// Sale on Stores (docx 2.15): one discount on everything in the chosen stores between two moments.
export function SaleOnStoresPage() {
  return <PromotionRulesPage kindCode={PromotionKindCodes.saleOnStores} />;
}
