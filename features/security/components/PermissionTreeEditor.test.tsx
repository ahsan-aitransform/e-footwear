import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetBrowserStateForTests } from "@/tests/support/sessionFixtures";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import { collectCatalogPermissionCodes } from "../logic/permissionTreeSelection";
import { PermissionTreeEditor } from "./PermissionTreeEditor";

const catalog: PermissionCatalogResponse = {
  modules: [
    {
      moduleCode: "PRODUCTS",
      displayName: "Products",
      screens: [
        {
          screenCode: "NEW_PRODUCT",
          displayName: "New Product",
          subGroupCode: null,
          actions: [
            { permissionCode: "PRODUCTS.NEW_PRODUCT.VIEW", actionCode: "VIEW", displayName: "View" },
            { permissionCode: "PRODUCTS.NEW_PRODUCT.EDIT", actionCode: "EDIT", displayName: "Edit" },
          ],
        },
        {
          screenCode: "PRICE_CHECK",
          displayName: "Price Check",
          subGroupCode: null,
          actions: [{ permissionCode: "PRODUCTS.PRICE_CHECK.VIEW", actionCode: "VIEW", displayName: "View" }],
        },
      ],
    },
  ],
};
const everyCode = new Set(collectCatalogPermissionCodes(catalog));

beforeEach(async () => {
  await resetBrowserStateForTests();
});

// The editor is controlled, so a tiny host keeps the selection like the real form does.
function Host({ initial = [], assignable = everyCode }: { initial?: string[]; assignable?: ReadonlySet<string> }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(initial));
  return (
    <>
      <PermissionTreeEditor catalog={catalog} selectedCodes={selected} assignableCodes={assignable} onChange={setSelected} />
      <output data-testid="selected">{[...selected].sort().join(",")}</output>
    </>
  );
}

const expandProducts = () => userEvent.click(screen.getByRole("button", { name: /Show or hide the screens of Products/ }));
const selected = () => screen.getByTestId("selected").textContent;

describe("permission tree", () => {
  it("shows a module as indeterminate when only some of its permissions are selected", () => {
    render(<Host initial={["PRODUCTS.NEW_PRODUCT.VIEW"]} />);
    const moduleBox = screen.getByRole("checkbox", { name: "Products" }) as HTMLInputElement;
    expect(moduleBox.indeterminate).toBe(true);
    expect(moduleBox.checked).toBe(false);
    expect(moduleBox).toHaveAttribute("aria-checked", "mixed");
  });

  it("selecting a module selects every screen and action of it, and again clears them", async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Products" }));
    expect(selected()).toBe([...everyCode].sort().join(","));
    expect((screen.getByRole("checkbox", { name: "Products" }) as HTMLInputElement).checked).toBe(true);
    await userEvent.click(screen.getByRole("checkbox", { name: "Products" }));
    expect(selected()).toBe("");
  });

  it("selecting a screen selects its actions only and makes the module indeterminate", async () => {
    render(<Host />);
    await expandProducts();
    await userEvent.click(screen.getByRole("checkbox", { name: "New Product" }));
    expect(selected()).toBe("PRODUCTS.NEW_PRODUCT.EDIT,PRODUCTS.NEW_PRODUCT.VIEW");
    expect((screen.getByRole("checkbox", { name: "Products" }) as HTMLInputElement).indeterminate).toBe(true);
  });

  it("selects one action at a time", async () => {
    render(<Host />);
    await expandProducts();
    const row = screen.getByRole("checkbox", { name: "New Product" }).closest("div")!;
    await userEvent.click(within(row.parentElement!).getAllByRole("checkbox", { name: "Edit" })[0]);
    expect(selected()).toBe("PRODUCTS.NEW_PRODUCT.EDIT");
  });

  it("the Administrator box selects everything and locks the tree until it is cleared", async () => {
    render(<Host />);
    const administrator = screen.getByRole("checkbox", { name: /Administrator/ });
    await userEvent.click(administrator);
    expect(selected()).toBe([...everyCode].sort().join(","));
    expect(screen.getByRole("checkbox", { name: "Products" })).toBeDisabled();
    expect(screen.getByText(/the list below is locked/)).toBeInTheDocument();
    await userEvent.click(administrator);
    expect(selected()).toBe("");
    expect(screen.getByRole("checkbox", { name: "Products" })).toBeEnabled();
  });

  it("offers the Administrator box only to a person who can assign every permission", () => {
    render(<Host assignable={new Set(["PRODUCTS.NEW_PRODUCT.VIEW"])} />);
    expect(screen.queryByRole("checkbox", { name: /Administrator/ })).toBeNull();
  });

  it("disables permissions the person does not hold and never changes them", async () => {
    render(<Host assignable={new Set(["PRODUCTS.NEW_PRODUCT.VIEW"])} />);
    await expandProducts();
    const edits = screen.getAllByRole("checkbox", { name: "Edit" });
    expect(edits[0]).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Products" }));
    expect(selected()).toBe("PRODUCTS.NEW_PRODUCT.VIEW");
  });

  it("a quick right selects one kind of action on every screen", async () => {
    render(<Host />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Can edit" }));
    expect(selected()).toBe("PRODUCTS.NEW_PRODUCT.EDIT");
    expect((screen.getByRole("checkbox", { name: "Can edit" }) as HTMLInputElement).checked).toBe(true);
  });

  it("finds modules and screens by name", async () => {
    render(<Host />);
    await userEvent.type(screen.getByPlaceholderText("Find a module or screen"), "price");
    expect(screen.getByRole("checkbox", { name: "Price Check" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "New Product" })).toBeNull();
  });

  it("a read-only tree shows the selection and cannot be changed", () => {
    render(<PermissionTreeEditor catalog={catalog} selectedCodes={everyCode} assignableCodes={everyCode} onChange={() => undefined} isReadOnly />);
    expect(screen.getByRole("checkbox", { name: "Products" })).toBeDisabled();
    expect(screen.queryByRole("checkbox", { name: /Administrator/ })).toBeNull();
  });
});
