import { NewVendorPage } from "@/features/vendors/pages/NewVendorPage";

// /vendors/edit/<vendorId>: edit one vendor (opened from the list).
export default async function EditVendorRoutePage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  return <NewVendorPage vendorId={vendorId} />;
}
