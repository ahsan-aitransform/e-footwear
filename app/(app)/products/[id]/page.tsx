import { ProductView } from "@/features/products/products";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductView id={Number(id)} />;
}
