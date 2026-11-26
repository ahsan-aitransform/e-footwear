"use client";

import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import type { StaffLookupResponse } from "../types/commissionTypes";

// The staff filter of the commission list and reports: the empty choice means everybody. The people come from the staff lookup, which needs no
// permission of the staff screens, so a person who may only look at commission can still pick a salesman.
export function CommissionStaffFilterSelect({
  staffId,
  onStaffIdChange,
  name,
  label,
  allStaffLabel,
}: {
  staffId: string;
  onStaffIdChange: (staffId: string) => void;
  name: string;
  label: string;
  allStaffLabel: string;
}) {
  const staff = useApiQuery<StaffLookupResponse[]>(ApiEndpoints.staffMembers.lookup, { offlineCacheName: "commission-staff-lookup" });
  const options: OptionSelectOption[] = (staff.data ?? []).map((person) => ({ value: person.id, label: `${person.name} (${person.code})` }));
  return (
    <FormField label={label} name={name}>
      {(controlProps) => <OptionSelect {...controlProps} options={options} value={staffId} onValueChange={onStaffIdChange} emptyOptionLabel={allStaffLabel} />}
    </FormField>
  );
}
