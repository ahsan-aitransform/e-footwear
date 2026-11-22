// The route registry entries of the master data screens (Settings module, docx chapter 2 and Part 7). The registry
// (lib/routing/routeRegistry.ts) spreads this list; keeping the entries here leaves the shared file small.
import { ApplicationRoutePatterns } from "@/lib/constants/applicationRoutes";
import { PermissionCodes, PermissionModuleCodes } from "@/lib/contracts/permissionCodes";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { ApplicationRouteDefinition, NavigationIconName } from "@/lib/routing/routeRegistry";
import type { PermissionCode } from "@/lib/contracts/permissionCodes";

function settingsScreenRoute(
  routeKey: string,
  pathPattern: string,
  viewPermissionCode: PermissionCode,
  labelMessageKey: MessageKey,
  iconName: NavigationIconName,
  sortOrder: number,
): ApplicationRouteDefinition {
  return {
    routeKey,
    pathPattern,
    audience: "companyUser",
    requiredPermissions: requireAnyPermission(viewPermissionCode),
    navigation: { labelMessageKey, iconName, groupCode: PermissionModuleCodes.SETTINGS, sortOrder },
  };
}

export const masterDataRouteDefinitions: readonly ApplicationRouteDefinition[] = [
  settingsScreenRoute("departments", ApplicationRoutePatterns.departments, PermissionCodes.SETTINGS.DEPARTMENT.VIEW, "navigation.item.departments", "masterList", 210),
  settingsScreenRoute("categories", ApplicationRoutePatterns.categories, PermissionCodes.SETTINGS.CATEGORY.VIEW, "navigation.item.categories", "masterList", 211),
  settingsScreenRoute("brands", ApplicationRoutePatterns.brands, PermissionCodes.SETTINGS.COMPANY_BRAND.VIEW, "navigation.item.brands", "masterList", 212),
  settingsScreenRoute("seasons", ApplicationRoutePatterns.seasons, PermissionCodes.SETTINGS.SEASON.VIEW, "navigation.item.seasons", "masterList", 213),
  settingsScreenRoute("genders", ApplicationRoutePatterns.genders, PermissionCodes.SETTINGS.GENDER.VIEW, "navigation.item.genders", "masterList", 214),
  settingsScreenRoute("colors", ApplicationRoutePatterns.colors, PermissionCodes.SETTINGS.COLOR.VIEW, "navigation.item.colors", "masterList", 215),
  settingsScreenRoute("locations", ApplicationRoutePatterns.locations, PermissionCodes.SETTINGS.LOCATION.VIEW, "navigation.item.locations", "masterList", 216),
  settingsScreenRoute("units", ApplicationRoutePatterns.units, PermissionCodes.SETTINGS.UNIT.VIEW, "navigation.item.units", "masterList", 217),
  settingsScreenRoute("sizeGroups", ApplicationRoutePatterns.sizeGroups, PermissionCodes.SETTINGS.SIZE_GROUP.VIEW, "navigation.item.sizeGroups", "masterList", 218),
  settingsScreenRoute("productTypes", ApplicationRoutePatterns.productTypes, PermissionCodes.SETTINGS.PRODUCT_TYPE.VIEW, "navigation.item.productTypes", "masterList", 219),
  settingsScreenRoute("citiesAndAreas", ApplicationRoutePatterns.citiesAndAreas, PermissionCodes.SETTINGS.CITY_AREA.VIEW, "navigation.item.citiesAndAreas", "masterList", 220),
  settingsScreenRoute("glAccounts", ApplicationRoutePatterns.glAccounts, PermissionCodes.SETTINGS.GL_ACCOUNTS.VIEW, "navigation.item.glAccounts", "chartOfAccounts", 230),
  settingsScreenRoute("newSecondLevelAccountGroup", ApplicationRoutePatterns.newSecondLevelAccountGroup, PermissionCodes.SETTINGS.NEW_SECOND_LEVEL.ADD, "navigation.item.newSecondLevelAccountGroup", "chartOfAccounts", 231),
  settingsScreenRoute("viewSecondLevelAccountGroups", ApplicationRoutePatterns.viewSecondLevelAccountGroups, PermissionCodes.SETTINGS.VIEW_SECOND_LEVEL.VIEW, "navigation.item.viewSecondLevelAccountGroups", "chartOfAccounts", 232),
  settingsScreenRoute("openingBalances", ApplicationRoutePatterns.openingBalances, PermissionCodes.SETTINGS.OPENING_BALANCE.VIEW, "navigation.item.openingBalances", "chartOfAccounts", 240),
];
