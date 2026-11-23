import { StaffDetailPage } from "@/features/humanResources/pages/StaffDetailPage";

// /staff/<partyId>: one staff member: pay terms, salary history and store history.
export default async function StaffDetailRoutePage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  return <StaffDetailPage partyId={partyId} />;
}
