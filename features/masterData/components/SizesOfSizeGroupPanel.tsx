"use client";

import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { MasterListOptionResponse, SaveSizeRequest, SizeResponse } from "../types/masterListTypes";

// The sizes (38, 39, 40 ... or S, M, L) of one size group, shown under the size group list. Pick the group, then add or
// delete its sizes. The server refuses a repeated size in the same group and a delete of a size that products still use.
export function SizesOfSizeGroupPanel() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [sizeGroupId, setSizeGroupId] = useState("");
  const [sizeCode, setSizeCode] = useState("");
  const [message, setMessage] = useState<string>();

  const groups = useApiQuery<MasterListOptionResponse[]>(ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.sizeGroups));
  const sizes = useApiQuery<SizeResponse[]>(sizeGroupId ? ApiEndpoints.masterData.sizesOfSizeGroup(sizeGroupId) : "", {
    enabled: sizeGroupId !== "",
  });
  const addSize = useApiMutation<SaveSizeRequest>(sizeGroupId ? ApiEndpoints.masterData.sizesOfSizeGroup(sizeGroupId) : "");

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const trimmedSizeCode = sizeCode.trim();
    if (!sizeGroupId || trimmedSizeCode === "") return;
    const nextSortOrder = (sizes.data ?? []).reduce((highest, size) => Math.max(highest, size.sortOrder), 0) + 10;
    const result = await addSize.execute({ sizeCode: trimmedSizeCode, sortOrder: nextSortOrder });
    if (!result.ok) return setMessage(result.problem.message);
    setSizeCode("");
    sizes.refetch();
  }

  async function handleDelete(size: SizeResponse) {
    setMessage(undefined);
    const result = await apiRequest<void>(ApiEndpoints.masterData.sizeOfSizeGroup(sizeGroupId, size.id), { method: "DELETE" });
    if (!result.ok) return setMessage(result.problem.message);
    sizes.refetch();
  }

  return (
    <div className="mt-6">
      <SectionCard title={translateMessage("masterData.sizes.title")} description={translateMessage("masterData.sizes.hint")}>
        <div className="space-y-4">
          <FormField label={translateMessage("masterData.sizes.groupLabel")} name="sizeGroupForSizes">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={sizeGroupId} onChange={(event) => setSizeGroupId(event.target.value)}>
                <option value="">{translateMessage("masterData.sizes.chooseGroup")}</option>
                {(groups.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>

          {sizeGroupId && (
            <>
              <ul className="flex flex-wrap gap-2" aria-label={translateMessage("masterData.sizes.title")}>
                {(sizes.data ?? []).map((size) => (
                  <li key={size.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
                    <span>{size.sizeCode}</span>
                    {hasPermission(PermissionCodes.SETTINGS.SIZE_GROUP.DELETE) && (
                      <Button type="button" variant="ghost" size="icon-xs" aria-label={translateMessage("masterData.sizes.deleteSize", { size: size.sizeCode })} onClick={() => handleDelete(size)}>
                        <Trash2 />
                      </Button>
                    )}
                  </li>
                ))}
                {sizes.status === "success" && (sizes.data ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">{translateMessage("masterData.sizes.empty")}</li>
                )}
              </ul>

              {hasPermission(PermissionCodes.SETTINGS.SIZE_GROUP.ADD) && (
                <form onSubmit={handleAdd} className="flex items-end gap-2" noValidate>
                  <TextInputField
                    label={translateMessage("masterData.sizes.sizeCodeLabel")}
                    name="newSizeCode"
                    value={sizeCode}
                    onChange={(event) => setSizeCode(event.target.value)}
                    maxLength={20}
                  />
                  <SubmitButton label={translateMessage("masterData.sizes.addSize")} pendingLabel={translateMessage("masterData.action.saving")} isPending={addSize.isPending} />
                </form>
              )}
              <FormResultNotice errorMessage={message} />
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
