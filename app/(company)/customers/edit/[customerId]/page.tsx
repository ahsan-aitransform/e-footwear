import { NewCustomerPage } from "@/features/customers/pages/NewCustomerPage";

// /customers/edit/<customerId>: edit one customer (opened from the list).
export default async function EditCustomerRoutePage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <NewCustomerPage customerId={customerId} />;
}
