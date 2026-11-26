"use client";

import { useState, type FormEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField, isValidIsoDate } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect, type OptionSelectOption } from "@/components/forms/OptionSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccessibleStores } from "@/features/accounting/hooks/useAccessibleStores";
import { firstDayOfCurrentMonthAsIsoDate, todayAsIsoDate } from "@/features/accounting/logic/reportDates";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { showToast } from "@/lib/toast/toastStore";
import type { ApproveCommissionsRequest, ApproveCommissionsResponse } from "../types/commissionTypes";

// Approves the pending commission of one store for the sales of a range of days (hr.approve_commissions). Approving twice is harmless: the second time nothing is
// pending. Approved commission goes onto the next salary sheet of the month it was sold in. Mount it only while it is open.
export function ApproveCommissionsDialog({ onClose, onApproved }: { onClose: () => void; onApproved: () => void }) {
  const { translateMessage } = useTranslation();
  const { stores } = useAccessibleStores();
  const [storeId, setStoreId] = useState("");
  const [fromDate, setFromDate] = useState(firstDayOfCurrentMonthAsIsoDate);
  const [toDate, setToDate] = useState(todayAsIsoDate);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [storeMessage, setStoreMessage] = useState<string>();

  const storeOptions: OptionSelectOption[] = stores.filter((store) => !store.isHeadOffice).map((store) => ({ value: store.id, label: store.name }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setStoreMessage(undefined);
    if (storeId === "") return setStoreMessage(translateMessage("commissions.entries.approve.error.store"));
    if (!isValidIsoDate(fromDate) || !isValidIsoDate(toDate)) return setMessage(translateMessage("commissions.entries.approve.error.dates"));
    if (fromDate > toDate) return setMessage(translateMessage("commissions.entries.approve.error.dateOrder"));
    const body: ApproveCommissionsRequest = { storeId, fromDate, toDate };
    setIsSaving(true);
    const result = await apiRequest<ApproveCommissionsResponse>(ApiEndpoints.commissions.approveEntries, { method: "POST", body });
    setIsSaving(false);
    if (!result.ok) return setMessage(result.problem.message);
    const count = result.data.approvedEntryCount;
    showToast(count > 0 ? translateMessage("commissions.entries.approve.done", { count }) : translateMessage("commissions.entries.approve.none"), count > 0 ? ToneNames.success : ToneNames.info);
    onApproved();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{translateMessage("commissions.entries.approve.title")}</DialogTitle>
            <DialogDescription>{translateMessage("commissions.entries.approve.description")}</DialogDescription>
          </DialogHeader>
          <FormResultNotice errorMessage={message} />
          <FormField label={translateMessage("commissions.entries.approve.store")} name="commissionApproveStore" isRequired errorMessage={storeMessage}>
            {(controlProps) => <OptionSelect {...controlProps} options={storeOptions} value={storeId} onValueChange={setStoreId} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField label={translateMessage("commissions.entries.filter.fromDate")} name="commissionApproveFrom" isRequired value={fromDate} onValueChange={setFromDate} />
            <DateField label={translateMessage("commissions.entries.filter.toDate")} name="commissionApproveTo" isRequired value={toDate} onValueChange={setToDate} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {translateMessage("common.cancel")}
            </Button>
            <SubmitButton label={translateMessage("commissions.entries.approve.submit")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
