"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";

// "Are you sure?" before a salary sheet is approved: approving posts the salary expense and the sheet can never be changed afterwards. It names the store,
// the month and the amount that will be posted. Nothing is paid by approving.
export function ApproveSalarySheetDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  storeName,
  monthLabel,
  totalNetPay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  storeName: string;
  monthLabel: string;
  totalNetPay: number;
}) {
  const { translateMessage } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{translateMessage("payroll.approve.title")}</AlertDialogTitle>
        <AlertDialogDescription>
          {translateMessage("payroll.approve.text", { amount: formatWholeRupees(totalNetPay), store: storeName, month: monthLabel })}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" disabled={isPending} />}>{translateMessage("payroll.approve.cancel")}</AlertDialogClose>
          <Button disabled={isPending} onClick={onConfirm}>
            {translateMessage("payroll.approve.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
