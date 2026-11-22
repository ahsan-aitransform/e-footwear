import { PartyFormPage } from "@/features/parties/pages/PartyFormPage";

// /party/new-party/<partyId>: edit one party (opened from Manage Party).
export default async function EditPartyRoutePage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  return <PartyFormPage partyId={partyId} />;
}
