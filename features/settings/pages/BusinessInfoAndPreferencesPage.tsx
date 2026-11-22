"use client";

import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type {
  BusinessInfoSettings,
  InventoryPolicySettings,
  PrintingSettings,
  PromotionPolicySettings,
  RegionalPreferencesSettings,
  TaxSettings,
} from "@/lib/types/settings";
import { BusinessInfoForm } from "../components/BusinessInfoForm";
import { InventoryPolicyForm, PromotionPolicyForm, TaxForm } from "../components/PolicyForms";
import { PrintingForm } from "../components/PrintingForm";
import { RegionalPreferencesForm } from "../components/RegionalPreferencesForm";
import { CompanySettingsSection, StoreSettingsSection } from "../components/SettingsSection";
import { SettingsTabs } from "../components/SettingsTabs";
import { StoreScopeSelector } from "../components/StoreScopeSelector";
import { useSellingStores } from "../hooks/useSellingStores";

const TabKeys = { businessInfo: "businessInfo", preferences: "preferences" } as const;
type TabKey = (typeof TabKeys)[keyof typeof TabKeys];

// The docx Preference (Shop Info) screen: a "Business Info" tab and a "Preferences" tab. The company's values apply to every
// store; choosing a store edits only that store's overrides (business info and printing), where an empty field inherits.
export function BusinessInfoAndPreferencesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionCodes.SETTINGS.PREFERENCE.EDIT);
  const { sellingStores } = useSellingStores();
  const [storeId, setStoreId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>(TabKeys.businessInfo);
  const isStoreScope = storeId !== "";

  return (
    <>
      <PageHeader title={translateMessage("settings.preference.title")} subtitle={translateMessage("settings.preference.subtitle")} />
      <StoreScopeSelector stores={sellingStores} value={storeId} onChange={setStoreId} />
      <SettingsTabs
        ariaLabel={translateMessage("settings.preference.tabsLabel")}
        activeKey={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: TabKeys.businessInfo, label: translateMessage("settings.businessInfo.tab") },
          { key: TabKeys.preferences, label: translateMessage("settings.preferences.tab") },
        ]}
      />

      {activeTab === TabKeys.businessInfo &&
        (isStoreScope ? (
          <StoreSettingsSection<BusinessInfoSettings>
            path={ApiEndpoints.companySettings.storeBusinessInfo(storeId)}
            canEdit={canEdit}
            renderForm={(props) => <BusinessInfoForm {...props} isStoreScope inheritedValues={props.effectiveValues} />}
          />
        ) : (
          <CompanySettingsSection<BusinessInfoSettings>
            path={ApiEndpoints.companySettings.businessInfo}
            canEdit={canEdit}
            renderForm={(props) => <BusinessInfoForm {...props} isStoreScope={false} />}
          />
        ))}

      {activeTab === TabKeys.preferences && (
        <>
          {isStoreScope ? (
            <>
              <InlineNotice tone={ToneNames.info}>{translateMessage("settings.preferences.storeScopeNote")}</InlineNotice>
              <StoreSettingsSection<PrintingSettings>
                path={ApiEndpoints.companySettings.storePrinting(storeId)}
                canEdit={canEdit}
                renderForm={(props) => <PrintingForm {...props} isStoreScope />}
              />
            </>
          ) : (
            <>
              <CompanySettingsSection<RegionalPreferencesSettings>
                path={ApiEndpoints.companySettings.regionalPreferences}
                canEdit={canEdit}
                renderForm={(props) => <RegionalPreferencesForm {...props} />}
              />
              <CompanySettingsSection<PrintingSettings>
                path={ApiEndpoints.companySettings.printing}
                canEdit={canEdit}
                renderForm={(props) => <PrintingForm {...props} isStoreScope={false} />}
              />
              <CompanySettingsSection<TaxSettings>
                path={ApiEndpoints.companySettings.tax}
                canEdit={canEdit}
                renderForm={(props) => <TaxForm {...props} />}
              />
              <CompanySettingsSection<InventoryPolicySettings>
                path={ApiEndpoints.companySettings.inventoryPolicy}
                canEdit={canEdit}
                renderForm={(props) => <InventoryPolicyForm {...props} />}
              />
              <CompanySettingsSection<PromotionPolicySettings>
                path={ApiEndpoints.companySettings.promotionPolicy}
                canEdit={canEdit}
                renderForm={(props) => <PromotionPolicyForm {...props} />}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
