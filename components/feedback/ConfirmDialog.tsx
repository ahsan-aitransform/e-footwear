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
import type { MessageKey } from "@/lib/i18n/messageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";

// "Are you sure?" before a destructive action (Part 28: delete actions require confirmation).
// The caller owns `open`; onConfirm runs the action. The dialog stays open while isPending.
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  titleMessageKey = "confirmDialog.deleteTitle",
  descriptionMessageKey = "confirmDialog.deleteText",
  confirmLabelMessageKey = "confirmDialog.deleteConfirm",
  isDestructive = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
  titleMessageKey?: MessageKey;
  descriptionMessageKey?: MessageKey;
  confirmLabelMessageKey?: MessageKey;
  isDestructive?: boolean;
}) {
  const { translateMessage } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{translateMessage(titleMessageKey)}</AlertDialogTitle>
        <AlertDialogDescription>{translateMessage(descriptionMessageKey)}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" disabled={isPending} />}>
            {translateMessage("confirmDialog.cancel")}
          </AlertDialogClose>
          <Button variant={isDestructive ? "destructive" : "default"} disabled={isPending} onClick={onConfirm}>
            {translateMessage(confirmLabelMessageKey)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
