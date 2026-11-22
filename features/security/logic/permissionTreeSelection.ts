import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type {
  PermissionCatalogModuleResponse,
  PermissionCatalogResponse,
  PermissionCatalogScreenResponse,
} from "@/lib/types/permissions";

// The logic of the permission tree (docx 1.2, Part 6), as pure functions so it can be tested without a screen:
//  * selecting a module selects all its screens, selecting a screen selects all its actions;
//  * a module or screen that is only partly selected is shown as indeterminate;
//  * a person can only hand out permissions they hold themselves (the server refuses anything else), so every function takes the
//    set of ASSIGNABLE codes and never changes a code outside it;
//  * the five "global rights" of the old Create New User screen (Can Edit, Can Delete, Can Print, Can Change Price, Can Give
//    Discount) are shortcuts that tick one kind of action on every screen.

export type SelectionState = "none" | "partial" | "all";

export function collectScreenPermissionCodes(screen: PermissionCatalogScreenResponse): string[] {
  return screen.actions.map((action) => action.permissionCode);
}

export function collectModulePermissionCodes(module: PermissionCatalogModuleResponse): string[] {
  return module.screens.flatMap(collectScreenPermissionCodes);
}

export function collectCatalogPermissionCodes(catalog: PermissionCatalogResponse): string[] {
  return catalog.modules.flatMap(collectModulePermissionCodes);
}

export function getSelectionState(permissionCodes: readonly string[], selectedCodes: ReadonlySet<string>): SelectionState {
  if (permissionCodes.length === 0) return "none";
  const selectedCount = permissionCodes.filter((code) => selectedCodes.has(code)).length;
  if (selectedCount === 0) return "none";
  return selectedCount === permissionCodes.length ? "all" : "partial";
}

// The state of a group counted over the codes the person can change. Codes they cannot change still count when selected,
// so a group that holds something unchangeable is never shown as empty.
export function getGroupSelectionState(
  permissionCodes: readonly string[],
  selectedCodes: ReadonlySet<string>,
  assignableCodes: ReadonlySet<string>,
): SelectionState {
  const relevantCodes = permissionCodes.filter((code) => assignableCodes.has(code) || selectedCodes.has(code));
  return getSelectionState(relevantCodes, selectedCodes);
}

// Ticking a group that is not fully ticked ticks everything assignable in it; ticking a fully ticked group clears the
// assignable codes in it. Codes the person cannot assign keep their current state.
export function toggleGroup(
  selectedCodes: ReadonlySet<string>,
  groupCodes: readonly string[],
  assignableCodes: ReadonlySet<string>,
): ReadonlySet<string> {
  const changeableCodes = groupCodes.filter((code) => assignableCodes.has(code));
  const shouldSelect = !changeableCodes.every((code) => selectedCodes.has(code));
  return setCodesSelected(selectedCodes, changeableCodes, shouldSelect);
}

export function setCodesSelected(
  selectedCodes: ReadonlySet<string>,
  permissionCodes: readonly string[],
  isSelected: boolean,
): ReadonlySet<string> {
  const next = new Set(selectedCodes);
  for (const code of permissionCodes) {
    if (isSelected) next.add(code);
    else next.delete(code);
  }
  return next;
}

export function toggleCode(
  selectedCodes: ReadonlySet<string>,
  permissionCode: string,
  assignableCodes: ReadonlySet<string>,
): ReadonlySet<string> {
  if (!assignableCodes.has(permissionCode)) return selectedCodes;
  return setCodesSelected(selectedCodes, [permissionCode], !selectedCodes.has(permissionCode));
}

// What a person can hand out: the codes they hold, plus the codes the user already has (those may stay, or be removed).
export function buildAssignableCodes(
  catalog: PermissionCatalogResponse,
  codesHeldByCaller: ReadonlySet<string>,
  codesAlreadyGranted: ReadonlySet<string>,
): ReadonlySet<string> {
  return new Set(collectCatalogPermissionCodes(catalog).filter((code) => codesHeldByCaller.has(code) || codesAlreadyGranted.has(code)));
}

// The Administrator checkbox grants every permission, so it exists only for a person who can assign every permission.
export function canGrantEveryPermission(catalog: PermissionCatalogResponse, assignableCodes: ReadonlySet<string>): boolean {
  const allCodes = collectCatalogPermissionCodes(catalog);
  return allCodes.length > 0 && allCodes.every((code) => assignableCodes.has(code));
}

export function selectEveryAssignablePermission(
  selectedCodes: ReadonlySet<string>,
  catalog: PermissionCatalogResponse,
  assignableCodes: ReadonlySet<string>,
): ReadonlySet<string> {
  return setCodesSelected(selectedCodes, collectCatalogPermissionCodes(catalog).filter((code) => assignableCodes.has(code)), true);
}

// ---- the five "global rights" of the original screen ----

export const QuickRightKeys = {
  canEdit: "canEdit",
  canDelete: "canDelete",
  canPrint: "canPrint",
  canChangePrice: "canChangePrice",
  canGiveDiscount: "canGiveDiscount",
} as const;

export type QuickRightKey = (typeof QuickRightKeys)[keyof typeof QuickRightKeys];

export type QuickRightDefinition = {
  quickRightKey: QuickRightKey;
  // The action codes of the catalog (EDIT, DELETE, ...) this right ticks on every screen.
  actionCodes: readonly string[];
  // The legacy codes the database functions check for the same thing (sec.require_permission).
  legacyPermissionCodes: readonly string[];
};

export const quickRightDefinitions: readonly QuickRightDefinition[] = [
  { quickRightKey: QuickRightKeys.canEdit, actionCodes: ["EDIT"], legacyPermissionCodes: [] },
  { quickRightKey: QuickRightKeys.canDelete, actionCodes: ["DELETE"], legacyPermissionCodes: [] },
  { quickRightKey: QuickRightKeys.canPrint, actionCodes: ["PRINT"], legacyPermissionCodes: [] },
  {
    quickRightKey: QuickRightKeys.canChangePrice,
    actionCodes: ["CHANGE_SELLING_PRICE"],
    legacyPermissionCodes: [PermissionCodes.RESTRICTED_OPERATIONS.SALES.PRICE_CHANGE],
  },
  {
    quickRightKey: QuickRightKeys.canGiveDiscount,
    actionCodes: ["GIVE_DISCOUNT"],
    legacyPermissionCodes: [PermissionCodes.RESTRICTED_OPERATIONS.SALES.DISCOUNT_MANUAL],
  },
];

export function collectQuickRightCodes(catalog: PermissionCatalogResponse, definition: QuickRightDefinition): string[] {
  const catalogCodes = new Set(collectCatalogPermissionCodes(catalog));
  const actionCodesOfScreens = catalog.modules
    .flatMap((module) => module.screens)
    .flatMap((screen) => screen.actions)
    .filter((action) => definition.actionCodes.includes(action.actionCode))
    .map((action) => action.permissionCode);
  const legacyCodes = definition.legacyPermissionCodes.filter((code) => catalogCodes.has(code));
  return [...new Set([...actionCodesOfScreens, ...legacyCodes])];
}

export function getQuickRightState(
  catalog: PermissionCatalogResponse,
  definition: QuickRightDefinition,
  selectedCodes: ReadonlySet<string>,
  assignableCodes: ReadonlySet<string>,
): SelectionState {
  return getGroupSelectionState(collectQuickRightCodes(catalog, definition), selectedCodes, assignableCodes);
}

export function toggleQuickRight(
  catalog: PermissionCatalogResponse,
  definition: QuickRightDefinition,
  selectedCodes: ReadonlySet<string>,
  assignableCodes: ReadonlySet<string>,
): ReadonlySet<string> {
  return toggleGroup(selectedCodes, collectQuickRightCodes(catalog, definition), assignableCodes);
}

// Screens of a module grouped by their sub-group (Reports: Account Reports; Settings: GL Account), in catalog order.
// Screens without a sub-group come first, under a null key.
export function groupScreensBySubGroup(
  module: PermissionCatalogModuleResponse,
): { subGroupCode: string | null; screens: PermissionCatalogScreenResponse[] }[] {
  const groups = new Map<string | null, PermissionCatalogScreenResponse[]>();
  for (const screen of module.screens) {
    const group = groups.get(screen.subGroupCode) ?? [];
    group.push(screen);
    groups.set(screen.subGroupCode, group);
  }
  const noSubGroup = groups.get(null);
  groups.delete(null);
  return [
    ...(noSubGroup ? [{ subGroupCode: null, screens: noSubGroup }] : []),
    ...[...groups.entries()].map(([subGroupCode, screens]) => ({ subGroupCode, screens })),
  ];
}

// Keeps the modules and screens whose name contains the text (case-insensitive). A module whose own name matches keeps all screens.
export function filterCatalogByText(catalog: PermissionCatalogResponse, searchText: string): PermissionCatalogResponse {
  const text = searchText.trim().toLowerCase();
  if (text.length === 0) return catalog;
  const modules = catalog.modules
    .map((module) =>
      module.displayName.toLowerCase().includes(text)
        ? module
        : { ...module, screens: module.screens.filter((screen) => screen.displayName.toLowerCase().includes(text)) },
    )
    .filter((module) => module.screens.length > 0);
  return { modules };
}
