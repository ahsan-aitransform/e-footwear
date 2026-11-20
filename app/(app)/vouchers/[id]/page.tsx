import { VoucherView } from "@/features/voucher/vouchers";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VoucherView id={Number(id)} />;
}
