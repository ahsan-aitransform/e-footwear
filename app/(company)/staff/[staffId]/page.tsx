import { StaffDetailPage } from "@/features/humanResources/pages/StaffDetailPage";

// /staff/<staffId>: one staff member: pay terms, salary history and store history.
export default async function StaffDetailRoutePage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  return <StaffDetailPage staffId={staffId} />;
}
