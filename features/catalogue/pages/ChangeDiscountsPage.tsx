"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { ProductDiscountPanel } from "../components/ProductDiscountPanel";
import { ChangePricesPage } from "./ChangePricesPage";
import { ProductVariantListPage } from "./ProductVariantListPage";

// Change Discounts: one screen for the discount rules (docx 4.9), the price change in percent (4.8) and the new sale price of ticked
// products (4.10). Each tab keeps its own permission; a person sees only the tabs they may view.
export function ChangeDiscountsPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const Products = PermissionCodes.PRODUCTS;

  const tabs = [
    { value: "discount", label: "catalogue.changeDiscounts.tabDiscount", permission: Products.CHANGE_DISCOUNTS.VIEW, content: <ProductDiscountPanel /> },
    { value: "price-change", label: "catalogue.changeDiscounts.tabPriceChange", permission: Products.CHANGE_PRICES_BY_PERCENTAGE.VIEW, content: <ChangePricesPage mode="percentage" isEmbedded /> },
    { value: "new-price", label: "catalogue.changeDiscounts.tabNewPrice", permission: Products.PRODUCT_DISCOUNTS.VIEW, content: <ProductVariantListPage mode="discounts" isEmbedded /> },
  ] as const;
  const allowedTabs = tabs.filter((tab) => hasPermission(tab.permission));

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("navigation.item.changeDiscounts")} subtitle={translateMessage("catalogue.changeDiscounts.subtitle")} />
      {allowedTabs.length > 0 && (
        <Tabs defaultValue={allowedTabs[0].value}>
          <TabsList className="print:hidden">
            {allowedTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {translateMessage(tab.label)}
              </TabsTrigger>
            ))}
          </TabsList>
          {allowedTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="pt-4">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
