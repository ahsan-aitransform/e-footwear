"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PaymentMethodsSettings } from "@/lib/types/settings";
import { PaymentMethodsForm } from "../components/PaymentMethodsForm";
import { CompanySettingsSection } from "../components/SettingsSection";

// Payment Methods: which of the five methods the till offers, with display names and order.
export function PaymentMethodsPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionCodes.SETTINGS.PAYMENT_METHODS.EDIT);
  return (
    <>
      <PageHeader title={translateMessage("settings.paymentMethods.title")} subtitle={translateMessage("settings.paymentMethods.subtitle")} />
      <CompanySettingsSection<PaymentMethodsSettings>
        path={ApiEndpoints.companySettings.paymentMethods}
        canEdit={canEdit}
        renderForm={(props) => <PaymentMethodsForm {...props} />}
      />
    </>
  );
}
