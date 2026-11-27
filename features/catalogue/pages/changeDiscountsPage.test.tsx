import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ChangeDiscountsPage } from "./ChangeDiscountsPage";

const grantedCodes = new Set<string>();
vi.mock("@/lib/permissions/usePermissions", () => ({ usePermissions: () => ({ hasPermission: (code: string) => grantedCodes.has(code) }) }));
vi.mock("../components/ProductDiscountPanel", () => ({ ProductDiscountPanel: () => <p>discount panel</p> }));
vi.mock("./ChangePricesPage", () => ({ ChangePricesPage: () => <p>price change panel</p> }));
vi.mock("./ProductVariantListPage", () => ({ ProductVariantListPage: () => <p>new price panel</p> }));

describe("ChangeDiscountsPage", () => {
  it("shows only the tabs the person may view and opens the first of them", () => {
    grantedCodes.add(PermissionCodes.PRODUCTS.CHANGE_PRICES_BY_PERCENTAGE.VIEW);
    grantedCodes.add(PermissionCodes.PRODUCTS.PRODUCT_DISCOUNTS.VIEW);
    render(<ChangeDiscountsPage />);

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Price change in %", "New price for chosen products"]);
    expect(screen.getByText("price change panel")).toBeInTheDocument();
    expect(screen.queryByText("discount panel")).not.toBeInTheDocument();
  });
});
