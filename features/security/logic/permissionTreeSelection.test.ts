import { describe, expect, it } from "vitest";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import {
  buildAssignableCodes,
  canGrantEveryPermission,
  collectCatalogPermissionCodes,
  collectModulePermissionCodes,
  collectQuickRightCodes,
  filterCatalogByText,
  getGroupSelectionState,
  getQuickRightState,
  getSelectionState,
  groupScreensBySubGroup,
  quickRightDefinitions,
  QuickRightKeys,
  selectEveryAssignablePermission,
  toggleCode,
  toggleGroup,
  toggleQuickRight,
} from "./permissionTreeSelection";

const action = (screenCode: string, actionCode: string) => ({
  permissionCode: `SALES.${screenCode}.${actionCode}`,
  actionCode,
  displayName: actionCode,
});

const catalog: PermissionCatalogResponse = {
  modules: [
    {
      moduleCode: "SALES",
      displayName: "Sales",
      screens: [
        {
          screenCode: "NEW_SALE",
          displayName: "New Sale",
          subGroupCode: null,
          actions: [action("NEW_SALE", "VIEW"), action("NEW_SALE", "ADD"), action("NEW_SALE", "EDIT"), action("NEW_SALE", "CHANGE_SELLING_PRICE")],
        },
        {
          screenCode: "SALE_REPORT",
          displayName: "Sale Report",
          subGroupCode: "ACCOUNT_REPORTS",
          actions: [action("SALE_REPORT", "VIEW"), action("SALE_REPORT", "PRINT")],
        },
      ],
    },
    {
      moduleCode: "RESTRICTED_OPERATIONS",
      displayName: "Restricted operations",
      screens: [
        {
          screenCode: "SALES",
          displayName: "Sales operations",
          subGroupCode: null,
          actions: [
            { permissionCode: "PRICE_CHANGE", actionCode: "PRICE_CHANGE", displayName: "Price change" },
            { permissionCode: "DISCOUNT_MANUAL", actionCode: "DISCOUNT_MANUAL", displayName: "Manual discount" },
          ],
        },
      ],
    },
  ],
};

const everyCode = new Set(collectCatalogPermissionCodes(catalog));
const salesCodes = collectModulePermissionCodes(catalog.modules[0]);

describe("selection state of a group", () => {
  it("is none, partial or all depending on how many codes are selected", () => {
    expect(getSelectionState(salesCodes, new Set())).toBe("none");
    expect(getSelectionState(salesCodes, new Set([salesCodes[0]]))).toBe("partial");
    expect(getSelectionState(salesCodes, new Set(salesCodes))).toBe("all");
  });

  it("is none for an empty group", () => {
    expect(getSelectionState([], new Set(salesCodes))).toBe("none");
  });

  it("counts only the codes the person can change, plus the ones already selected", () => {
    const assignable = new Set([salesCodes[0], salesCodes[1]]);
    expect(getGroupSelectionState(salesCodes, new Set([salesCodes[0], salesCodes[1]]), assignable)).toBe("all");
    expect(getGroupSelectionState(salesCodes, new Set([salesCodes[0]]), assignable)).toBe("partial");
    // a code that is selected but cannot be changed still counts, so the group is not shown as empty
    expect(getGroupSelectionState(salesCodes, new Set([salesCodes[4]]), assignable)).toBe("partial");
  });
});

describe("selecting a module or a screen", () => {
  it("ticks everything in a group that is not fully ticked, and clears a fully ticked one", () => {
    const ticked = toggleGroup(new Set(), salesCodes, everyCode);
    expect(getSelectionState(salesCodes, ticked)).toBe("all");
    const partial = toggleGroup(new Set([salesCodes[0]]), salesCodes, everyCode);
    expect(getSelectionState(salesCodes, partial)).toBe("all");
    const cleared = toggleGroup(ticked, salesCodes, everyCode);
    expect(getSelectionState(salesCodes, cleared)).toBe("none");
  });

  it("never changes a code the person cannot assign", () => {
    const assignable = new Set([salesCodes[0]]);
    const afterTick = toggleGroup(new Set(), salesCodes, assignable);
    expect([...afterTick]).toEqual([salesCodes[0]]);
    const withUnassignable = toggleGroup(new Set([salesCodes[1], salesCodes[0]]), salesCodes, assignable);
    expect([...withUnassignable]).toEqual([salesCodes[1]]);
  });

  it("toggles a single code only when it is assignable", () => {
    expect(toggleCode(new Set(), salesCodes[0], everyCode).has(salesCodes[0])).toBe(true);
    expect(toggleCode(new Set([salesCodes[0]]), salesCodes[0], everyCode).has(salesCodes[0])).toBe(false);
    expect(toggleCode(new Set(), salesCodes[0], new Set()).size).toBe(0);
  });

  it("does not modify the set it was given", () => {
    const original = new Set<string>();
    toggleGroup(original, salesCodes, everyCode);
    expect(original.size).toBe(0);
  });
});

describe("what a person can hand out", () => {
  it("is what they hold plus what the user already has", () => {
    const assignable = buildAssignableCodes(catalog, new Set([salesCodes[0]]), new Set(["PRICE_CHANGE", "NOT.IN.CATALOG"]));
    expect([...assignable].sort()).toEqual([salesCodes[0], "PRICE_CHANGE"].sort());
  });

  it("allows the administrator shortcut only for someone who can assign every permission", () => {
    expect(canGrantEveryPermission(catalog, everyCode)).toBe(true);
    expect(canGrantEveryPermission(catalog, new Set(salesCodes))).toBe(false);
    expect(canGrantEveryPermission({ modules: [] }, new Set())).toBe(false);
  });

  it("selects every assignable permission for the administrator shortcut", () => {
    expect(selectEveryAssignablePermission(new Set(), catalog, everyCode).size).toBe(everyCode.size);
    expect(selectEveryAssignablePermission(new Set(), catalog, new Set(salesCodes)).size).toBe(salesCodes.length);
  });
});

describe("the five global rights of the original screen", () => {
  const definitionOf = (key: string) => quickRightDefinitions.find((definition) => definition.quickRightKey === key)!;

  it("lists the five rights", () => {
    expect(quickRightDefinitions.map((definition) => definition.quickRightKey)).toEqual(Object.values(QuickRightKeys));
  });

  it("collects one kind of action across screens", () => {
    expect(collectQuickRightCodes(catalog, definitionOf("canEdit"))).toEqual(["SALES.NEW_SALE.EDIT"]);
    expect(collectQuickRightCodes(catalog, definitionOf("canPrint"))).toEqual(["SALES.SALE_REPORT.PRINT"]);
  });

  it("adds the legacy code the database functions check", () => {
    expect(collectQuickRightCodes(catalog, definitionOf("canChangePrice")).sort()).toEqual(["PRICE_CHANGE", "SALES.NEW_SALE.CHANGE_SELLING_PRICE"].sort());
    expect(collectQuickRightCodes(catalog, definitionOf("canGiveDiscount"))).toEqual(["DISCOUNT_MANUAL"]);
  });

  it("ticks and clears a right and reports its state", () => {
    const definition = definitionOf("canChangePrice");
    const ticked = toggleQuickRight(catalog, definition, new Set(), everyCode);
    expect(getQuickRightState(catalog, definition, ticked, everyCode)).toBe("all");
    expect(getQuickRightState(catalog, definition, new Set(["PRICE_CHANGE"]), everyCode)).toBe("partial");
    expect(getQuickRightState(catalog, definition, toggleQuickRight(catalog, definition, ticked, everyCode), everyCode)).toBe("none");
  });
});

describe("showing the catalog", () => {
  it("groups the screens of a module by sub-group, screens without one first", () => {
    const groups = groupScreensBySubGroup(catalog.modules[0]);
    expect(groups.map((group) => group.subGroupCode)).toEqual([null, "ACCOUNT_REPORTS"]);
    expect(groups[1].screens.map((screen) => screen.screenCode)).toEqual(["SALE_REPORT"]);
  });

  it("filters modules and screens by name, keeping a module whose own name matches whole", () => {
    expect(filterCatalogByText(catalog, "report").modules.map((module) => module.moduleCode)).toEqual(["SALES"]);
    expect(filterCatalogByText(catalog, "report").modules[0].screens.map((screen) => screen.screenCode)).toEqual(["SALE_REPORT"]);
    expect(filterCatalogByText(catalog, "SALES").modules[0].screens).toHaveLength(2);
    expect(filterCatalogByText(catalog, "nothing like this").modules).toEqual([]);
    expect(filterCatalogByText(catalog, "  ")).toBe(catalog);
  });
});
