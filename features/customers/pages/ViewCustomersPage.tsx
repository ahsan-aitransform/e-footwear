"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { ContactListPage } from "@/features/contacts/pages/ContactListPage";
import { CustomerFormDialog } from "../components/CustomerFormDialog";
import { customerScreenConfig } from "../customerScreenConfig";

// View Customers, the one customers screen: add, edit (both in a dialog) and delete.
export function ViewCustomersPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  // null = closed; without a customerId the dialog adds a new customer.
  const [dialog, setDialog] = useState<{ customerId?: string } | null>(null);
  const [savedCounter, setSavedCounter] = useState(0);

  return (
    <>
      <ContactListPage
        config={customerScreenConfig}
        refreshSignal={savedCounter}
        onEditContact={(customerId) => setDialog({ customerId })}
        toolbarActions={
          hasPermission(customerScreenConfig.permissions.add) && (
            <Button type="button" onClick={() => setDialog({})}>
              <Plus /> {translateMessage("customers.action.add")}
            </Button>
          )
        }
      />
      {dialog && (
        <CustomerFormDialog
          customerId={dialog.customerId}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            setSavedCounter((counter) => counter + 1);
          }}
        />
      )}
    </>
  );
}
