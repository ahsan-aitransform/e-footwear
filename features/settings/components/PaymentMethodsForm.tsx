"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsLimits } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PaymentMethodSetting, PaymentMethodsSettings } from "@/lib/types/settings";
import { SettingsFormCard } from "./SettingsFormCard";
import type { SettingsFormProps } from "./SettingsSection";

// Which payment methods the company offers: switch each on or off, give it a display name (English and Urdu) and an order.
// The five methods are fixed by the sales tables; every one stays in the list.
export function PaymentMethodsForm({
  values: initialValues,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  onSave,
}: SettingsFormProps<PaymentMethodsSettings>) {
  const { translateMessage } = useTranslation();
  const [methods, setMethods] = useState<PaymentMethodSetting[]>(initialValues.methods);

  function updateMethod(code: string, changes: Partial<PaymentMethodSetting>) {
    setMethods((current) => current.map((method) => (method.code === code ? { ...method, ...changes } : method)));
  }

  return (
    <SettingsFormCard
      title={translateMessage("settings.paymentMethods.formTitle")}
      description={translateMessage("settings.paymentMethods.formDescription")}
      isStored={isStored}
      canEdit={canEdit}
      isSaving={isSaving}
      errorMessage={errorMessage}
      successMessage={successMessage}
      note={translateMessage("settings.paymentMethods.note")}
      onSubmit={() =>
        void onSave({
          methods: methods.map((method) => ({
            ...method,
            displayNameEnglish: method.displayNameEnglish?.trim() ? method.displayNameEnglish.trim() : null,
            displayNameUrdu: method.displayNameUrdu?.trim() ? method.displayNameUrdu.trim() : null,
          })),
        })
      }
    >
      <div className="overflow-x-auto sm:col-span-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translateMessage("settings.paymentMethods.method")}</TableHead>
              <TableHead>{translateMessage("settings.paymentMethods.enabled")}</TableHead>
              <TableHead>{translateMessage("settings.paymentMethods.englishName")}</TableHead>
              <TableHead>{translateMessage("settings.paymentMethods.urduName")}</TableHead>
              <TableHead>{translateMessage("settings.paymentMethods.sortOrder")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => {
              const methodLabel = translateMessage(`settings.paymentMethod.${method.code}` as "settings.paymentMethod.CASH");
              return (
                <TableRow key={method.code}>
                  <TableCell className="font-medium">{methodLabel}</TableCell>
                  <TableCell>
                    <Checkbox
                      aria-label={`${methodLabel}: ${translateMessage("settings.paymentMethods.enabled")}`}
                      checked={method.isEnabled}
                      onCheckedChange={(checked) => updateMethod(method.code, { isEnabled: checked === true })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`${methodLabel}: ${translateMessage("settings.paymentMethods.englishName")}`}
                      value={method.displayNameEnglish ?? ""}
                      maxLength={SettingsLimits.paymentMethodDisplayNameMaximumLength}
                      onChange={(event) => updateMethod(method.code, { displayNameEnglish: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`${methodLabel}: ${translateMessage("settings.paymentMethods.urduName")}`}
                      dir="rtl"
                      value={method.displayNameUrdu ?? ""}
                      maxLength={SettingsLimits.paymentMethodDisplayNameMaximumLength}
                      onChange={(event) => updateMethod(method.code, { displayNameUrdu: event.target.value })}
                    />
                  </TableCell>
                  <TableCell className="w-28">
                    <Input
                      aria-label={`${methodLabel}: ${translateMessage("settings.paymentMethods.sortOrder")}`}
                      type="number"
                      dir="ltr"
                      min={0}
                      max={SettingsLimits.paymentMethodSortOrderMaximum}
                      value={method.sortOrder}
                      onChange={(event) => updateMethod(method.code, { sortOrder: Number(event.target.value) })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SettingsFormCard>
  );
}
