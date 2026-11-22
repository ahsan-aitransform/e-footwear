import { ProductVariantListPage } from "@/features/catalogue/pages/ProductVariantListPage";

// /products/product-discounts: set a new sale price for chosen products.
export default function ProductDiscountsRoutePage() {
  return <ProductVariantListPage mode="discounts" />;
}
