import { MasterListRoutePage } from "@/features/masterData/pages/MasterListRoutePage";

// /settings/department: a simple master list (name, Urdu name, code, order, active).
export default function DepartmentsRoutePage() {
  return <MasterListRoutePage screenKey="departments" />;
}
