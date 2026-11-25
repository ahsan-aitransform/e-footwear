import { NewStaffPage } from "@/features/staff/pages/NewStaffPage";

// /staff/edit/<staffId>: edit one staff (opened from the list).
export default async function EditStaffRoutePage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  return <NewStaffPage staffId={staffId} />;
}
