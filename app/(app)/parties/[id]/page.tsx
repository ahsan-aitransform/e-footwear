import { PartyView } from "@/features/party/parties";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartyView id={Number(id)} />;
}
