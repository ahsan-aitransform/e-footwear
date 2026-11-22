import { ProductVariantListPage } from "@/features/catalogue/pages/ProductVariantListPage";

// /products/view-products: every size with stock, prices and margin; edit or delete a product.
export default function ViewProductsRoutePage() {
  return <ProductVariantListPage mode="view" />;
}
