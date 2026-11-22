import { ProductVariantListPage } from "@/features/catalogue/pages/ProductVariantListPage";

// /products/search-product: find sizes by name, code or barcode.
export default function SearchProductRoutePage() {
  return <ProductVariantListPage mode="search" />;
}
