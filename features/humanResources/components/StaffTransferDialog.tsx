"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { translateValidationMessage } from "@/lib/validation/validationMessage";
import { hasFormErrors, validateTransferForm, type TransferFormErrors, type TransferFormValues } from "../logic/staffFormValidation";
import type { StaffListItemResponse, TransferStaffRequest } from "../types/staffTypes";

// How many staff the person picker loads. A company with more staff than this would need a searchable picker; the server limits a page to this size.
const STAFF_PICKER_PAGE_SIZE = 200;

// Moves a staff member to another store of the same company from a date (Part 16.1). The move is added to the store history (previous store, new store, date,
// who authorised it); nothing is overwritten. From the staff page the person is fixed; from the Staff Transfers screen the person is chosen.
// Mount it only while it is open: it starts empty every time.
export function StaffTransferDialog({
  fixedStaff,
  onClose,
  onTransferred,
}: {
  fixedStaff?: Pick<StaffListItemResponse, "partyId" | "name" | "currentStoreId">;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const { translateMessage } = useTranslation();
  const { stores } = useAccessibleStores();
  const staffList = useApiQuery<PaginatedResponse<StaffListItemResponse>>(fixedStaff ? null : ApiEndpoints.staff.list, { query: { pageSize: STAFF_PICKER_PAGE_SIZE } });
  const [values, setValues] = useState<TransferFormValues>({ staffPartyId: fixedStaff?.partyId ?? "", toStoreId: "", effectiveOn: todayAsIsoDate() });
  const [errors, setErrors] = useState<TransferFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();

  const staffOptions: OptionSelectOption[] = (staffList.data?.items ?? []).map((staff) => ({ value: staff.partyId, label: `${staff.name} (${staff.code}), ${staff.currentStoreName}` }));
  const storeOptions: OptionSelectOption[] = stores.filter((store) => !store.isHeadOffice).map((store) => ({ value: store.id, label: store.name }));
  const currentStoreId = fixedStaff?.currentStoreId ?? staffList.data?.items.find((staff) => staff.partyId === values.staffPartyId)?.currentStoreId ?? "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateTransferForm(values, currentStoreId);
    setErrors(found);
    if (hasFormErrors(found)) return;
    const body: TransferStaffRequest = { toStoreId: values.toStoreId, effectiveOn: values.effectiveOn };
    setIsSaving(true);
    const result = await apiRequest<void>(ApiEndpoints.parties.staffTransfers(values.staffPartyId), { method: "POST", body });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("humanResources.transfer.saved"), ToneNames.success);
    onTransferred();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{translateMessage("humanResources.transfer.dialog.title")}</DialogTitle>
            <DialogDescription>{translateMessage("humanResources.transfer.dialog.description")}</DialogDescription>
          </DialogHeader>
          <FormResultNotice errorMessage={message} />
          {fixedStaff ? (
            <p className="text-sm font-medium">{fixedStaff.name}</p>
          ) : (
            <FormField label={translateMessage("humanResources.transfer.field.staff")} name="staffTransferStaff" isRequired errorMessage={translateValidationMessage(translateMessage, errors.staffPartyId)}>
              {(controlProps) => (
                <OptionSelect
                  {...controlProps}
                  options={staffOptions}
                  value={values.staffPartyId}
                  onValueChange={(staffPartyId) => setValues((current) => ({ ...current, staffPartyId }))}
                  emptyOptionLabel={translateMessage("humanResources.transfer.field.chooseStaff")}
                />
              )}
            </FormField>
          )}
          <FormField label={translateMessage("humanResources.transfer.field.toStore")} name="staffTransferStore" isRequired errorMessage={translateValidationMessage(translateMessage, errors.toStoreId)}>
            {(controlProps) => (
              <OptionSelect
                {...controlProps}
                options={storeOptions}
                value={values.toStoreId}
                onValueChange={(toStoreId) => setValues((current) => ({ ...current, toStoreId }))}
                emptyOptionLabel={translateMessage("humanResources.transfer.field.chooseStore")}
              />
            )}
          </FormField>
          <DateField
            label={translateMessage("humanResources.transfer.field.effectiveOn")}
            name="staffTransferDate"
            isRequired
            value={values.effectiveOn}
            onValueChange={(effectiveOn) => setValues((current) => ({ ...current, effectiveOn }))}
            errorMessage={translateValidationMessage(translateMessage, errors.effectiveOn)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton label={translateMessage("humanResources.transfer.submit")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
