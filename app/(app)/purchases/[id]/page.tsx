import { PurchaseView } from "@/features/purchases/purchases";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseView id={Number(id)} />;
}
