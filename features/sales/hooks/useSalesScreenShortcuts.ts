"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { interpretSalesShortcut, SalesShortcutActions } from "../logic/salesKeyboardShortcuts";

// Listens for the shortcuts of the sale screens while the screen is open. The latest handlers are kept in a ref so the listener is added only once.
// A shortcut for a screen the person may not open does nothing, and none of them acts while the person is working in a dialog.
export function useSalesScreenShortcuts({ onFocusBarcode, onSave }: { onFocusBarcode?: () => void; onSave?: () => void }) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const latest = useRef({ onFocusBarcode, onSave, hasPermission, push: router.push });

  useEffect(() => {
    latest.current = { onFocusBarcode, onSave, hasPermission, push: router.push };
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = interpretSalesShortcut(event);
      if (action === null) return;
      // F9 or Ctrl+S inside the Add customer dialog must not save the sale behind it (nor the browser's own page).
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return event.preventDefault();
      const { onFocusBarcode: focusBarcode, onSave: save, hasPermission: mayDo, push } = latest.current;
      event.preventDefault();
      switch (action) {
        case SalesShortcutActions.focusBarcode:
          focusBarcode?.();
          break;
        case SalesShortcutActions.save:
          save?.();
          break;
        case SalesShortcutActions.openNewSale:
          if (mayDo(PermissionCodes.INVOICE.NEW_SALE.VIEW)) push(ApplicationRoutes.newSale);
          break;
        case SalesShortcutActions.openSaleReturn:
          if (mayDo(PermissionCodes.INVOICE.SALE_RETURN.VIEW)) push(ApplicationRoutes.saleReturn);
          break;
        case SalesShortcutActions.openExchangeInvoice:
          if (mayDo(PermissionCodes.INVOICE.EXCHANGE_INVOICE.VIEW)) push(ApplicationRoutes.exchangeInvoice);
          break;
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
