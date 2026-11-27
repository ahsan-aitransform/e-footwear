// The route registry entries of the Products menu (module catalogue, docx chapter 4).
// The registry (lib/routing/routeRegistry.ts) spreads this list; keeping the entries here leaves the shared file small.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes, type PermissionCode } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { ApplicationRouteDefinition, NavigationIconName } from "@/lib/routing/routeRegistry";

function catalogueScreenRoute(
  routeKey: string,
  pathPattern: string,
  viewPermissionCode: PermissionCode,
  navigation: { labelMessageKey: MessageKey; iconName: NavigationIconName; sortOrder: number } | undefined,
): ApplicationRouteDefinition {
  return {
    routeKey,
    pathPattern,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(viewPermissionCode),
    navigation: navigation ? { ...navigation, groupCode: PermissionModuleCodes.PRODUCTS } : undefined,
  };
}

const Products = PermissionCodes.PRODUCTS;

export const catalogueRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  catalogueScreenRoute("newProduct", ApplicationRoutePatterns.newProduct, Products.NEW_PRODUCT.ADD,
    { labelMessageKey: "navigation.item.newProduct", iconName: "product", sortOrder: 10 }),
  catalogueScreenRoute("editProduct", ApplicationRoutePatterns.editProduct, Products.NEW_PRODUCT.VIEW, undefined),
  catalogueScreenRoute("viewProducts", ApplicationRoutePatterns.viewProducts, Products.VIEW_PRODUCTS.VIEW,
    { labelMessageKey: "navigation.item.viewProducts", iconName: "product", sortOrder: 20 }),
  catalogueScreenRoute("productLedger", ApplicationRoutePatterns.productLedger, Products.PRODUCT_LEDGER.VIEW,
    { labelMessageKey: "navigation.item.productLedger", iconName: "chartOfAccounts", sortOrder: 40 }),
  catalogueScreenRoute("generateBarcodes", ApplicationRoutePatterns.generateBarcodes, Products.GENERATE_BARCODES.VIEW,
    { labelMessageKey: "navigation.item.generateBarcodes", iconName: "barcode", sortOrder: 50 }),
  catalogueScreenRoute("priceCheck", ApplicationRoutePatterns.priceCheck, Products.PRICE_CHECK.VIEW,
    { labelMessageKey: "navigation.item.priceCheck", iconName: "priceTag", sortOrder: 60 }),
  catalogueScreenRoute("changeAttributes", ApplicationRoutePatterns.changeAttributes, Products.CHANGE_ATTRIBUTES.VIEW,
    { labelMessageKey: "navigation.item.changeAttributes", iconName: "masterList", sortOrder: 70 }),
  catalogueScreenRoute("changePricesOldToNew", ApplicationRoutePatterns.changePricesOldToNew, Products.CHANGE_PRICES_OLD_TO_NEW.VIEW,
    { labelMessageKey: "navigation.item.changePricesOldToNew", iconName: "priceTag", sortOrder: 80 }),
  {
    // One screen with a tab for each of these permissions.
    ...catalogueScreenRoute("changeDiscounts", ApplicationRoutePatterns.changeDiscounts, Products.CHANGE_DISCOUNTS.VIEW,
      { labelMessageKey: "navigation.item.changeDiscounts", iconName: "priceTag", sortOrder: 100 }),
    requiredPermissions: requireAnyPermission<PermissionCode>(Products.CHANGE_DISCOUNTS.VIEW, Products.CHANGE_PRICES_BY_PERCENTAGE.VIEW, Products.PRODUCT_DISCOUNTS.VIEW),
  },
  catalogueScreenRoute("productDiscountsOnMultipleStores", ApplicationRoutePatterns.productDiscountsOnMultipleStores,
    Products.PRODUCT_DISCOUNTS_ON_MULTIPLE_STORES.VIEW,
    { labelMessageKey: "navigation.item.productDiscountsOnMultipleStores", iconName: "priceTag", sortOrder: 120 }),
  catalogueScreenRoute("removeDiscountsAndReversePrice", ApplicationRoutePatterns.removeDiscountsAndReversePrice,
    Products.REMOVE_DISCOUNTS_AND_REVERSE_PRICE.VIEW,
    { labelMessageKey: "navigation.item.removeDiscountsAndReversePrice", iconName: "priceTag", sortOrder: 130 }),
  catalogueScreenRoute("replaceBarcodes", ApplicationRoutePatterns.replaceBarcodes, Products.REPLACE_BARCODES.VIEW,
    { labelMessageKey: "navigation.item.replaceBarcodes", iconName: "barcode", sortOrder: 140 }),
  catalogueScreenRoute("productStockWithSizes", ApplicationRoutePatterns.productStockWithSizes,
    Products.PRODUCTS_STOCK_WITH_SIZES_ON_MULTIPLE_STORES.VIEW,
    { labelMessageKey: "navigation.item.productStockWithSizes", iconName: "product", sortOrder: 150 }),
  catalogueScreenRoute("productReport", ApplicationRoutePatterns.productReport, Products.PRODUCT_REPORT.VIEW,
    { labelMessageKey: "navigation.item.productReport", iconName: "chartOfAccounts", sortOrder: 160 }),
  catalogueScreenRoute("priceBands", ApplicationRoutePatterns.priceBands, Products.PRICE_BANDS.VIEW,
    { labelMessageKey: "navigation.item.priceBands", iconName: "priceTag", sortOrder: 170 }),
];
