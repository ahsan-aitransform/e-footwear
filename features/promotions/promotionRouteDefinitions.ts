// The route registry entries of the promotion screens (docx 2.12 to 2.16, Part 18). Their permissions are the Settings screens of the docx tree (Deals, Special Offers, Special Offer
// Details, Sale on Stores, Sale on Categories) and the Promotions screen Promotion Conflict Resolution; the menu groups them all under Promotions.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { ApplicationRouteDefinition } from "@/lib/routing/routeRegistry";

export const promotionRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  {
    routeKey: "specialOffers",
    pathPattern: ApplicationRoutePatterns.specialOffers,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.SPECIAL_OFFERS.VIEW),
    navigation: { labelMessageKey: "navigation.item.specialOffers", iconName: "priceTag", groupCode: PermissionModuleCodes.PROMOTIONS, sortOrder: 10 },
  },
  {
    routeKey: "specialOfferDetails",
    pathPattern: ApplicationRoutePatterns.specialOfferDetails,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.VIEW),
    navigation: { labelMessageKey: "navigation.item.specialOfferDetails", iconName: "priceTag", groupCode: PermissionModuleCodes.PROMOTIONS, sortOrder: 20 },
  },
  {
    routeKey: "saleOnStores",
    pathPattern: ApplicationRoutePatterns.saleOnStores,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.SALE_ON_STORES.VIEW),
    navigation: { labelMessageKey: "navigation.item.saleOnStores", iconName: "priceTag", groupCode: PermissionModuleCodes.PROMOTIONS, sortOrder: 30 },
  },
  {
    routeKey: "saleOnCategories",
    pathPattern: ApplicationRoutePatterns.saleOnCategories,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.SALE_ON_CATEGORIES.VIEW),
    navigation: { labelMessageKey: "navigation.item.saleOnCategories", iconName: "priceTag", groupCode: PermissionModuleCodes.PROMOTIONS, sortOrder: 40 },
  },
  {
    routeKey: "deals",
    pathPattern: ApplicationRoutePatterns.deals,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.SETTINGS.DEALS.VIEW),
    navigation: { labelMessageKey: "navigation.item.deals", iconName: "priceTag", groupCode: PermissionModuleCodes.PROMOTIONS, sortOrder: 50 },
  },
  {
    routeKey: "promotionConflicts",
    pathPattern: ApplicationRoutePatterns.promotionConflicts,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.VIEW),
    navigation: { labelMessageKey: "navigation.item.promotionConflicts", iconName: "discrepancy", groupCode: PermissionModuleCodes.PROMOTIONS, sortOrder: 60 },
  },
];
