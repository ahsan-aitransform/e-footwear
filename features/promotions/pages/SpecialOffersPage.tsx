"use client";

import { PromotionKindCodes } from "../types/promotionTypes";
import { PromotionRulesPage } from "./PromotionRulesPage";

// Special Offers (docx 2.13): a time-bound offer with its own discount for each product (the products are added on Special Offer Details).
export function SpecialOffersPage() {
  return <PromotionRulesPage kindCode={PromotionKindCodes.specialOffer} />;
}
