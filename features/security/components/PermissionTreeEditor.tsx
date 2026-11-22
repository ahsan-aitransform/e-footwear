"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MessageKey } from "@/lib/i18n/messageKeys";
import type { PermissionCatalogModuleResponse, PermissionCatalogResponse } from "@/lib/types/permissions";
import {
  canGrantEveryPermission,
  collectCatalogPermissionCodes,
  collectModulePermissionCodes,
  collectScreenPermissionCodes,
  filterCatalogByText,
  getGroupSelectionState,
  getQuickRightState,
  groupScreensBySubGroup,
  quickRightDefinitions,
  selectEveryAssignablePermission,
  toggleCode,
  toggleGroup,
  toggleQuickRight,
} from "../logic/permissionTreeSelection";
import { TriStateCheckbox } from "./TriStateCheckbox";

const quickRightMessageKeyByKey: Record<string, MessageKey> = {
  canEdit: "securityManagement.permissionTree.quickRight.canEdit",
  canDelete: "securityManagement.permissionTree.quickRight.canDelete",
  canPrint: "securityManagement.permissionTree.quickRight.canPrint",
  canChangePrice: "securityManagement.permissionTree.quickRight.canChangePrice",
  canGiveDiscount: "securityManagement.permissionTree.quickRight.canGiveDiscount",
};

// The permission tree of the Create New User screen (docx 1.2), generated from the catalog the server sends:
//  * a module ticks all its screens, a screen ticks all its actions; a partly ticked group is indeterminate;
//  * the Administrator box ticks everything and locks the tree (only for a person who can assign every permission);
//  * the five "global rights" of the old screen tick one kind of action on every screen;
//  * a person can only hand out permissions they hold themselves, so the others are shown but disabled.
// The server enforces all of it again when the set is saved.
export function PermissionTreeEditor({
  catalog,
  selectedCodes,
  assignableCodes,
  onChange,
  isReadOnly = false,
}: {
  catalog: PermissionCatalogResponse;
  selectedCodes: ReadonlySet<string>;
  assignableCodes: ReadonlySet<string>;
  onChange: (nextSelectedCodes: ReadonlySet<string>) => void;
  isReadOnly?: boolean;
}) {
  const { translateMessage } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [expandedModuleCodes, setExpandedModuleCodes] = useState<ReadonlySet<string>>(new Set());
  // The tree locks only when the Administrator box itself was ticked. Ticking every module by hand does not lock it, so the last
  // click can always be undone. If the selection changes some other way (a template), the lock lifts by itself.
  const [isAdministratorChosen, setIsAdministratorChosen] = useState(false);

  const everyCode = collectCatalogPermissionCodes(catalog);
  const administratorIsAvailable = canGrantEveryPermission(catalog, assignableCodes);
  const administratorIsTicked = isAdministratorChosen && administratorIsAvailable && everyCode.every((code) => selectedCodes.has(code));
  const isLocked = isReadOnly || administratorIsTicked;
  const visibleCatalog = filterCatalogByText(catalog, searchText);
  const isSearching = searchText.trim().length > 0;

  function toggleModuleExpansion(moduleCode: string) {
    const next = new Set(expandedModuleCodes);
    if (next.has(moduleCode)) next.delete(moduleCode);
    else next.add(moduleCode);
    setExpandedModuleCodes(next);
  }

  function toggleAdministrator() {
    // Ticking grants everything assignable; clearing leaves nothing, so the tree can be filled in by hand.
    setIsAdministratorChosen(!administratorIsTicked);
    onChange(administratorIsTicked ? new Set() : selectEveryAssignablePermission(selectedCodes, catalog, assignableCodes));
  }

  function renderModule(module: PermissionCatalogModuleResponse) {
    const moduleCodes = collectModulePermissionCodes(module);
    const isExpanded = isSearching || expandedModuleCodes.has(module.moduleCode);
    return (
      <li key={module.moduleCode} className="rounded-lg border">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-expanded={isExpanded}
            aria-label={translateMessage("securityManagement.permissionTree.toggleModule", { moduleName: module.displayName })}
            onClick={() => toggleModuleExpansion(module.moduleCode)}
          >
            {isExpanded ? <ChevronDown className="size-4 rtl:rotate-0" /> : <ChevronRight className="size-4 rtl:rotate-180" />}
          </button>
          <TriStateCheckbox
            className="font-medium"
            label={module.displayName}
            selectionState={getGroupSelectionState(moduleCodes, selectedCodes, assignableCodes)}
            isDisabled={isLocked}
            onToggle={() => onChange(toggleGroup(selectedCodes, moduleCodes, assignableCodes))}
          />
        </div>
        {isExpanded && (
          <div className="space-y-3 border-t px-3 py-3 ps-10">
            {groupScreensBySubGroup(module).map((subGroup) => (
              <div key={subGroup.subGroupCode ?? "none"} className="space-y-2">
                {subGroup.subGroupCode && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {subGroup.subGroupCode.replaceAll("_", " ")}
                  </p>
                )}
                {subGroup.screens.map((screen) => {
                  const screenCodes = collectScreenPermissionCodes(screen);
                  return (
                    <div key={screen.screenCode} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <TriStateCheckbox
                        className="min-w-52 font-medium"
                        label={screen.displayName}
                        selectionState={getGroupSelectionState(screenCodes, selectedCodes, assignableCodes)}
                        isDisabled={isLocked}
                        onToggle={() => onChange(toggleGroup(selectedCodes, screenCodes, assignableCodes))}
                      />
                      {screen.actions.map((action) => (
                        <label
                          key={action.permissionCode}
                          className={`inline-flex items-center gap-1.5 text-sm ${isLocked || !assignableCodes.has(action.permissionCode) ? "opacity-60" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={selectedCodes.has(action.permissionCode)}
                            disabled={isLocked || !assignableCodes.has(action.permissionCode)}
                            onChange={() => onChange(toggleCode(selectedCodes, action.permissionCode, assignableCodes))}
                          />
                          {action.displayName}
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {administratorIsAvailable && !isReadOnly && (
          <TriStateCheckbox
            className="font-semibold"
            label={translateMessage("securityManagement.permissionTree.administrator")}
            selectionState={administratorIsTicked ? "all" : "none"}
            onToggle={toggleAdministrator}
          />
        )}
        {!isReadOnly && (
          <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <legend className="sr-only">{translateMessage("securityManagement.permissionTree.quickRightsLegend")}</legend>
            <span className="text-sm text-muted-foreground">{translateMessage("securityManagement.permissionTree.quickRightsLegend")}</span>
            {quickRightDefinitions.map((definition) => (
              <TriStateCheckbox
                key={definition.quickRightKey}
                label={translateMessage(quickRightMessageKeyByKey[definition.quickRightKey])}
                selectionState={getQuickRightState(catalog, definition, selectedCodes, assignableCodes)}
                isDisabled={isLocked}
                onToggle={() => onChange(toggleQuickRight(catalog, definition, selectedCodes, assignableCodes))}
              />
            ))}
          </fieldset>
        )}
      </div>
      {administratorIsTicked && !isReadOnly && (
        <p className="text-sm text-muted-foreground">{translateMessage("securityManagement.permissionTree.administratorLocksTree")}</p>
      )}

      <Input
        type="search"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={translateMessage("securityManagement.permissionTree.searchPlaceholder")}
        aria-label={translateMessage("securityManagement.permissionTree.searchPlaceholder")}
        className="max-w-sm"
      />
      <ul className="space-y-2">{visibleCatalog.modules.map(renderModule)}</ul>
      <p className="text-xs text-muted-foreground">
        {translateMessage("securityManagement.permissionTree.selectedCount", {
          selectedCount: String(everyCode.filter((code) => selectedCodes.has(code)).length),
          totalCount: String(everyCode.length),
        })}
      </p>
    </div>
  );
}
