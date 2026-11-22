import { ProductVariantListPage } from "@/features/catalogue/pages/ProductVariantListPage";

// /products/remove-discounts-and-reverse-price: take discounts off, optionally restoring the previous price.
export default function RemoveDiscountsAndReversePriceRoutePage() {
  return <ProductVariantListPage mode="discountRemoval" />;
}
