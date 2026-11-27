import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { RoleCodes } from "@/lib/constants/roleCodes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type {
  BarcodeReplacementPreviewResponse,
  PriceBandResponse,
  PriceChangeRowResponse,
  ProductVariantListItemResponse,
  VariantPriceLookupResponse,
} from "../types/catalogueTypes";
import { GenerateBarcodesPage } from "./GenerateBarcodesPage";
import { ChangePricesPage } from "./ChangePricesPage";
import { PriceBandsPage } from "./PriceBandsPage";
import { PriceCheckPage } from "./PriceCheckPage";
import { ProductFormPage } from "./ProductFormPage";
import { ProductVariantListPage } from "./ProductVariantListPage";
import { ReplaceBarcodesPage } from "./ReplaceBarcodesPage";

const routerPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush, replace: vi.fn() }), usePathname: () => "/products" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const emptyPage = { items: [], pageNumber: 1, pageSize: 25, totalItemCount: 0 };
const Products = PermissionCodes.PRODUCTS;

function sessionWith(...permissionCodes: string[]): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: permissionCodes });
}

type Answer = { status?: number; body?: unknown };

// The answers every screen of the module needs for its dropdowns; the test adds its own on top.
function server(specific: (path: string, request: RecordedRequest) => Answer | undefined) {
  return (request: RecordedRequest): Answer => {
    const path = request.url.replace("/api/v1", "");
    const own = specific(path, request);
    if (own) return own;
    if (path.startsWith("/stores")) return { body: [store] };
    if (path.includes("/options")) return { body: [] };
    if (path.startsWith("/barcodes/history")) return { body: emptyPage };
    if (path.startsWith("/products/next-code")) return { body: { code: "P-0001" } };
    return { status: 404, body: {} };
  };
}

async function openScreen(session: CurrentSessionResponse, handler: (request: RecordedRequest) => Answer, screen_: ReactElement) {
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  const requests = installFetchMock(handler);
  render(screen_);
  return requests;
}

beforeEach(async () => {
  routerPush.mockClear();
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function lookup(overrides: Partial<VariantPriceLookupResponse> = {}): VariantPriceLookupResponse {
  return {
    variantId: "v1", productId: "p1", productCode: "P-0001", barcode: "B1", productName: "Alpha Sandal", productNameUrdu: null, sizeCode: "27", colorName: "Black",
    brandName: "Bata", stockQuantity: 7, listPrice: 1000, storePrice: 1000, effectiveSalePrice: 900, discountAmount: 100, discountPercent: 10, isPriceInConflict: false, storeId: null, ...overrides,
  };
}

function variantRow(overrides: Partial<ProductVariantListItemResponse> = {}): ProductVariantListItemResponse {
  return {
    productId: "p1", variantId: "v1", productCode: "P-0001", barcode: "B1", productName: "Alpha Sandal", productNameUrdu: null, unitName: "Pair", sizeCode: "27", colorName: null,
    stockQuantity: 7, purchasePrice: 600, salePrice: 1000, discountPercent: null, discountAmount: 0, netPrice: 1000, marginPercent: 40, markupPercent: 66.67,
    departmentName: "Shoes", categoryName: "Sandals", brandName: "Bata", genderName: null, seasonName: null, status: "ACTIVE", ...overrides,
  };
}

describe("check price", () => {
  it("shows the price the till charges for a scanned barcode", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(Products.PRICE_CHECK.VIEW), server((path) => (path.startsWith("/products/price-check") ? { body: lookup() } : undefined)), <PriceCheckPage />);

    await user.type(screen.getByLabelText("Barcode"), "B1");
    await user.click(screen.getByRole("button", { name: "Check price" }));

    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    expect(screen.getByText("Rs 900")).toBeInTheDocument();
    expect(screen.getByText("Rs 1,000")).toBeInTheDocument();
    expect(requests.some((request) => request.url.includes("/products/price-check?barcode=B1"))).toBe(true);
  });

  it("warns when two discounts overlap, and shows the server's message for an unknown barcode", async () => {
    const user = userEvent.setup();
    await openScreen(
      sessionWith(Products.PRICE_CHECK.VIEW),
      server((path) => {
        if (!path.startsWith("/products/price-check")) return undefined;
        return path.includes("barcode=NOPE") ? { status: 404, body: { title: "No product has the barcode NOPE." } } : { body: lookup({ isPriceInConflict: true }) };
      }),
      <PriceCheckPage />,
    );

    await user.type(screen.getByLabelText("Barcode"), "B1");
    await user.click(screen.getByRole("button", { name: "Check price" }));
    expect(await screen.findByText(/Two discounts overlap on this size/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Barcode"));
    await user.type(screen.getByLabelText("Barcode"), "NOPE");
    await user.click(screen.getByRole("button", { name: "Check price" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Sandal")).not.toBeInTheDocument();
  });
});

describe("price bands", () => {
  const band: PriceBandResponse = { id: "b1", name: "Up to 1,000", minimumPrice: 0, maximumPrice: 1000, sortOrder: 10, rowVersion: 3 };

  it("lists the bands and hides Add without the Add permission", async () => {
    await openScreen(sessionWith(Products.PRICE_BANDS.VIEW), server((path) => (path === "/price-bands" ? { body: [band] } : undefined)), <PriceBandsPage />);

    expect(await screen.findByText("Up to 1,000")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a price band" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("creates a band with whole-rupee prices and shows a server refusal next to the dialog", async () => {
    const user = userEvent.setup();
    let refuse = true;
    const requests = await openScreen(
      sessionWith(Products.PRICE_BANDS.VIEW, Products.PRICE_BANDS.ADD),
      server((path, request) => {
        if (path === "/price-bands" && request.method === "GET") return { body: [] };
        if (path === "/price-bands" && request.method === "POST") {
          if (refuse) {
            refuse = false;
            return { status: 409, body: { title: "A price band with this name already exists." } };
          }
          return { status: 201, body: { id: "new" } };
        }
        return undefined;
      }),
      <PriceBandsPage />,
    );

    await user.click(await screen.findByRole("button", { name: "Add a price band" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Name/), "Cheap");
    await user.type(within(dialog).getByLabelText(/From price/), "1,250");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("A price band with this name already exists.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const posts = requests.filter((request) => request.method === "POST");
    expect(posts[0].body).toEqual({ name: "Cheap", minimumPrice: 1250, maximumPrice: null, sortOrder: 10, rowVersion: null });
  });

  it("checks the form before sending anything", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(Products.PRICE_BANDS.VIEW, Products.PRICE_BANDS.ADD), server((path) => (path === "/price-bands" ? { body: [] } : undefined)), <PriceBandsPage />);

    await user.click(await screen.findByRole("button", { name: "Add a price band" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Enter the name of the price band.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter the lowest price.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });
});

describe("change prices old to new", () => {
  const row: PriceChangeRowResponse = {
    productId: "p1", variantId: "v1", productCode: "P-0001", productName: "Alpha Sandal", sizeCode: "27", barcode: "B1", categoryName: "Sandals", brandName: "Bata",
    genderName: null, seasonName: null, stockQuantity: 7, purchasePrice: 400, currentSalePrice: 500, currentPrice: 500, newPrice: 600,
  };
  const answers = (path: string) => {
    if (path.startsWith("/product-prices/old-to-new/preview")) return { body: { items: [row], pageNumber: 1, pageSize: 25, totalItemCount: 1 } };
    if (path === "/product-prices/old-to-new") return { body: { batchId: "b", changedVariantCount: 1, conflictingVariantCount: 2, wasAlreadyApplied: false } };
    return undefined;
  };

  it("previews the sizes that change, then applies the change after a confirmation and reports conflicts", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(Products.CHANGE_PRICES_OLD_TO_NEW.VIEW, Products.CHANGE_PRICES_OLD_TO_NEW.EDIT), server(answers), <ChangePricesPage mode="oldToNew" />);

    expect(screen.getByText("Fill in the fields above to see which sizes will change.")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Old price/), "500");
    await user.type(screen.getByLabelText(/New price/), "600");
    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    expect(requests.some((request) => request.url.includes("/old-to-new/preview") && request.method === "POST")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Apply" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));

    expect(await screen.findByText(/1 sizes changed price\./)).toBeInTheDocument();
    expect(screen.getByText(/2 sizes now overlap a discount/)).toBeInTheDocument();
    const apply = requests.find((request) => request.url.endsWith("/product-prices/old-to-new"));
    expect(apply?.body).toMatchObject({ priceType: "SALE", oldPrice: 500, newPrice: 600, storeId: null });
    expect((apply?.body as { clientTransactionId: string }).clientTransactionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(apply?.headers["idempotency-key"]).toBe((apply?.body as { clientTransactionId: string }).clientTransactionId);
  });

  it("lists the matching sizes in Change Prices In % before a percentage is typed, with Apply still disabled", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(Products.CHANGE_PRICES_BY_PERCENTAGE.VIEW, Products.CHANGE_PRICES_BY_PERCENTAGE.EDIT),
      server((path) => {
        if (path === ApiEndpoints.masterData.optionsOfList(ApiEndpoints.masterData.brands)) return { body: [{ id: "brand-1", name: "Bata", code: null }] };
        if (path.startsWith("/product-prices/percentage/preview")) return { body: { items: [row], pageNumber: 1, pageSize: 25, totalItemCount: 1 } };
        return undefined;
      }),
      <ChangePricesPage mode="percentage" />,
    );

    await user.click(screen.getByRole("combobox", { name: /Brand/ }));
    await user.click(await screen.findByRole("option", { name: "Bata" }));

    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    const preview = requests.find((request) => request.url.includes("/percentage/preview"));
    expect(preview?.body).toMatchObject({ brandIds: ["brand-1"], increasePercent: null, decreasePercent: null });
    // the open list hides the rest of the page from assistive tools until it is closed
    await user.keyboard("{Escape}");
    expect(await screen.findByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("does not offer Apply without the Edit permission and asks for different prices", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(Products.CHANGE_PRICES_OLD_TO_NEW.VIEW), server(answers), <ChangePricesPage mode="oldToNew" />);

    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Old price/), "500");
    await user.type(screen.getByLabelText(/New price/), "500");
    expect(await screen.findByText("The old and the new price are the same.")).toBeInTheDocument();
  });
});

describe("replace barcodes", () => {
  const preview = (isValid: boolean): BarcodeReplacementPreviewResponse => ({
    rows: [{ rowNumber: 1, oldBarcode: "A1", newBarcode: "Z1", productName: "Alpha Sandal", sizeCode: "27", isValid, problem: isValid ? null : "The barcode Z1 is already used." }],
    validRowCount: isValid ? 1 : 0,
    invalidRowCount: isValid ? 0 : 1,
  });

  it("keeps Replace disabled while a row has a problem and enables it when every row is good", async () => {
    const user = userEvent.setup();
    let valid = false;
    await openScreen(
      sessionWith(Products.REPLACE_BARCODES.VIEW, Products.REPLACE_BARCODES.EDIT),
      server((path) => (path === "/barcodes/replacement-preview" ? { body: preview(valid) } : undefined)),
      <ReplaceBarcodesPage />,
    );

    await user.type(screen.getAllByLabelText("Old barcode")[0], "A1");
    await user.type(screen.getAllByLabelText("New barcode")[0], "Z1");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("The barcode Z1 is already used.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace barcodes" })).toBeDisabled();

    valid = true;
    await user.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Replace barcodes" })).toBeEnabled());
  });

  it("shows only the history to a person who cannot edit", async () => {
    await openScreen(sessionWith(Products.REPLACE_BARCODES.VIEW), server(() => undefined), <ReplaceBarcodesPage />);

    expect(await screen.findByText("Barcode history")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
  });
});

describe("new product form", () => {
  it("asks for the missing fields and sends nothing", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(Products.NEW_PRODUCT.ADD), server(() => undefined), <ProductFormPage />);

    await user.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter the product name.")).toBeInTheDocument();
    expect(screen.getByText("Choose a department.")).toBeInTheDocument();
    expect(screen.getByText("Add at least one size.", { selector: "p" })).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("shows the code the system will give and hides Save without the Add permission", async () => {
    await openScreen(sessionWith(Products.NEW_PRODUCT.VIEW), server(() => undefined), <ProductFormPage />);

    expect(await screen.findByDisplayValue("P-0001")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});

describe("view products", () => {
  const answers = (path: string) => (path.startsWith("/products/variants") ? { body: { items: [variantRow()], pageNumber: 1, pageSize: 25, totalItemCount: 1 } } : undefined);

  it("shows the money columns in whole rupees and, to the owner, the margin of each size", async () => {
    const owner = buildCompanyUserSession({ roleCode: RoleCodes.companyOwner, grantedPermissionCodes: [Products.VIEW_PRODUCTS.VIEW] });
    await openScreen(owner, server(answers), <ProductVariantListPage mode="view" />);

    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    expect(screen.getAllByText("1,000").length).toBeGreaterThan(0);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("hides margin and markup from a store manager", async () => {
    const manager = buildCompanyUserSession({ roleCode: RoleCodes.storeManager, grantedPermissionCodes: [Products.VIEW_PRODUCTS.VIEW] });
    await openScreen(manager, server(answers), <ProductVariantListPage mode="view" />);

    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    expect(screen.queryByText("40%")).not.toBeInTheDocument();
    expect(screen.queryByText(/Margin|Markup/)).not.toBeInTheDocument();
  });

  it("offers row actions only to people who may edit or delete", async () => {
    await openScreen(sessionWith(Products.VIEW_PRODUCTS.VIEW), server(answers), <ProductVariantListPage mode="view" />);
    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("offers them to a person with the Delete permission", async () => {
    await openScreen(sessionWith(Products.VIEW_PRODUCTS.VIEW, Products.VIEW_PRODUCTS.DELETE), server(answers), <ProductVariantListPage mode="view" />);
    expect(await screen.findByRole("button", { name: "Actions" })).toBeInTheDocument();
  });
});

describe("remove discounts and reverse price", () => {
  const removalAnswers = (path: string) => (path.startsWith("/products/variants/for-discount-removal") ? { body: { items: [variantRow()], pageNumber: 1, pageSize: 25, totalItemCount: 1 } } : undefined);

  it("lists the products of the working store and offers removal only with the Edit permission", async () => {
    const requests = await openScreen(sessionWith(Products.REMOVE_DISCOUNTS_AND_REVERSE_PRICE.VIEW), server(removalAnswers), <ProductVariantListPage mode="discountRemoval" />);

    expect(await screen.findByText("Alpha Sandal")).toBeInTheDocument();
    expect(requests.some((request) => request.url.includes("/for-discount-removal") && request.url.includes(`storeId=${TEST_STORE_ID}`))).toBe(true);
    expect(screen.queryByRole("button", { name: "Remove discounts" })).not.toBeInTheDocument();
  });

  it("removes the discount of the ticked products after a confirmation, asking to restore the price", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(Products.REMOVE_DISCOUNTS_AND_REVERSE_PRICE.VIEW, Products.REMOVE_DISCOUNTS_AND_REVERSE_PRICE.EDIT),
      server((path) => removalAnswers(path) ?? (path === "/product-discounts/remove" ? { body: { batchId: "b", affectedProductCount: 1, affectedStoreCount: 1, conflictingVariantCount: 0, restoredPriceVariantCount: 1, skippedRestoreVariantCount: 0, wasAlreadyApplied: false } } : undefined)),
      <ProductVariantListPage mode="discountRemoval" />,
    );

    await screen.findByText("Alpha Sandal");
    await user.click(screen.getAllByRole("checkbox").at(-1)!);
    await user.click(screen.getByRole("checkbox", { name: "Also put the previous sale price back" }));
    await user.click(screen.getByRole("button", { name: "Remove discounts" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Apply" }));

    expect(await screen.findByText(/Discount removed from 1 products\./)).toBeInTheDocument();
    const call = requests.find((request) => request.url.endsWith("/product-discounts/remove"));
    expect(call?.body).toMatchObject({ storeId: TEST_STORE_ID, productIds: ["p1"], alsoRestorePreviousSalePrice: true });
  });
});

describe("generate bar codes", () => {
  it("offers printing only with the Print permission", async () => {
    await openScreen(sessionWith(Products.GENERATE_BARCODES.VIEW), server((path) => (path.startsWith("/products/lookup/for-labels") ? { body: emptyPage } : undefined)), <GenerateBarcodesPage />);
    expect(await screen.findByText("No size chosen yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Print/ })).not.toBeInTheDocument();
  });

  it("explains that a size must be chosen before labels can be shown", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(Products.GENERATE_BARCODES.VIEW, Products.GENERATE_BARCODES.PRINT), server((path) => (path.startsWith("/products/lookup/for-labels") ? { body: emptyPage } : undefined)), <GenerateBarcodesPage />);

    expect(screen.getByRole("button", { name: "Print 0 labels" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Show labels" }));
    expect(await screen.findByText("Add at least one size.")).toBeInTheDocument();
  });
});
