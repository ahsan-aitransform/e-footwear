import { ProductFormPage } from "@/features/catalogue/pages/ProductFormPage";

// /products/new-product/<productId>: edit one product (opened from View Products or after saving a new product).
export default async function EditProductRoutePage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return <ProductFormPage productId={productId} />;
}
