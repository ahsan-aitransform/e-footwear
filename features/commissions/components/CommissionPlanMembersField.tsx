"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { SearchableSelect, type SearchableSelectOption } from "@/components/forms/SearchableSelect";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CommissionPlanMemberResponse, StaffLookupResponse } from "../types/commissionTypes";

// The people a commission plan is limited to. Nobody chosen means the plan covers every person of the role. "Add a person" is a searchable list of staff;
// each chosen person can be removed again. A person already on the plan but no longer in the lookup (left the company) keeps their saved name.
export function CommissionPlanMembersField({
  memberStaffIds,
  onMemberStaffIdsChange,
  knownMembers,
}: {
  memberStaffIds: string[];
  onMemberStaffIdsChange: (memberStaffIds: string[]) => void;
  knownMembers: readonly CommissionPlanMemberResponse[];
}) {
  const { translateMessage } = useTranslation();
  const staff = useApiQuery<StaffLookupResponse[]>(ApiEndpoints.staffMembers.lookup, { offlineCacheName: "commission-staff-lookup" });

  const nameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of knownMembers) names.set(member.staffId, `${member.staffName} (${member.staffCode})`);
    for (const person of staff.data ?? []) names.set(person.id, `${person.name} (${person.code})`);
    return names;
  }, [knownMembers, staff.data]);

  const options: SearchableSelectOption<string>[] = (staff.data ?? [])
    .filter((person) => !memberStaffIds.includes(person.id))
    .map((person) => ({ value: person.id, label: person.name, description: person.code }));

  return (
    <div className="space-y-3">
      <FormField label={translateMessage("commissions.planForm.members")} name="commissionPlanMembers" hint={translateMessage("commissions.planForm.membersHint")}>
        {(controlProps) => (
          <SearchableSelect
            {...controlProps}
            options={options}
            value={null}
            placeholder={translateMessage("commissions.planForm.addMemberPlaceholder")}
            onValueChange={(staffId) => {
              if (staffId !== null) onMemberStaffIdsChange([...memberStaffIds, staffId]);
            }}
          />
        )}
      </FormField>
      {staff.status === "error" && <InlineNotice>{translateMessage("commissions.planForm.membersLoadFailed")}</InlineNotice>}
      {memberStaffIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">{translateMessage("commissions.planForm.noMembers")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {memberStaffIds.map((staffId) => {
            const label = nameById.get(staffId) ?? staffId;
            return (
              <li key={staffId} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm">
                <span>{label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={translateMessage("commissions.planForm.removeMember", { name: label })}
                  onClick={() => onMemberStaffIdsChange(memberStaffIds.filter((id) => id !== staffId))}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
