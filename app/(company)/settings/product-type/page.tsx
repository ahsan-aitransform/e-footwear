import { MasterListRoutePage } from "@/features/masterData/pages/MasterListRoutePage";

// /settings/product-type: a simple master list (name, Urdu name, code, order, active).
export default function ProductTypesRoutePage() {
  return <MasterListRoutePage screenKey="productTypes" />;
}
