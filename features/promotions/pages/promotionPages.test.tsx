import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type {
  DealResponse,
  PromotionConflictResponse,
  PromotionRuleResponse,
  SpecialOfferLineResponse,
} from "../types/promotionTypes";
import { DealsPage } from "./DealsPage";
import { PromotionConflictsPage } from "./PromotionConflictsPage";
import { SaleOnCategoriesPage } from "./SaleOnCategoriesPage";
import { SaleOnStoresPage } from "./SaleOnStoresPage";
import { SpecialOfferDetailsPage } from "./SpecialOfferDetailsPage";
import { SpecialOffersPage } from "./SpecialOffersPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/promotions/sale-on-stores" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const CATEGORY_ID = "0197c3a0-bbbb-7000-8000-00000000000b";
const OFFER_ID = "0197c3a0-cccc-7000-8000-00000000000c";

function sessionWith(...permissionCodes: string[]): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: permissionCodes, hasAccessToAllStores: true, accessibleStoreIds: [TEST_STORE_ID] });
}

async function openScreen(session: CurrentSessionResponse, handler: (request: RecordedRequest) => { status?: number; body?: unknown }, screen_: React.ReactElement) {
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  const requests = installFetchMock(handler);
  render(screen_);
  return requests;
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function rule(overrides: Partial<PromotionRuleResponse> = {}): PromotionRuleResponse {
  return {
    id: "rule-1",
    kindCode: "SALE_ON_STORES",
    name: "Eid sale",
    discountPercent: 10,
    startsAt: "2026-11-01T09:00:00.000Z",
    endsAt: "2026-12-01T09:00:00.000Z",
    isActive: true,
    phaseCode: "RUNNING",
    storeCount: 1,
    categoryCount: 0,
    lineCount: 0,
    stores: [{ storeId: TEST_STORE_ID, storeName: "Main Store" }],
    categories: [],
    rowVersion: 1,
    ...overrides,
  };
}

const saleOnStoresPermissions = [PermissionCodes.SETTINGS.SALE_ON_STORES.VIEW, PermissionCodes.SETTINGS.SALE_ON_STORES.ADD, PermissionCodes.SETTINGS.SALE_ON_STORES.EDIT, PermissionCodes.SETTINGS.SALE_ON_STORES.DELETE];

describe("Sale on Stores", () => {
  function server(rules: PromotionRuleResponse[]) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (request.method === "POST" && path.startsWith("/promotions/sales-on-stores")) return { status: 201, body: rule() };
      if (path.startsWith("/promotions/sales-on-stores/rule-1")) return { body: rules[0] };
      if (path.startsWith("/promotions/sales-on-stores")) return { body: rules };
      return { status: 404, body: {} };
    };
  }

  it("lists the sales with their discount, status and stores", async () => {
    await openScreen(sessionWith(...saleOnStoresPermissions), server([rule(), rule({ id: "rule-2", name: "Next week", phaseCode: "SCHEDULED", discountPercent: 25 })]), <SaleOnStoresPage />);

    const table = await screen.findByRole("table", { name: "All sales on stores" });
    expect(within(table).getByText("Eid sale")).toBeInTheDocument();
    expect(within(table).getByText("10%")).toBeInTheDocument();
    expect(within(table).getByText("25%")).toBeInTheDocument();
    expect(within(table).getByText("Running")).toBeInTheDocument();
    expect(within(table).getByText("Scheduled")).toBeInTheDocument();
  });

  it("shows the empty state when there are no sales", async () => {
    await openScreen(sessionWith(...saleOnStoresPermissions), server([]), <SaleOnStoresPage />);
    expect(await screen.findByText("No sales on stores yet")).toBeInTheDocument();
  });

  it("hides New sale, Edit, Delete and Apply schedule now from a person who may only view", async () => {
    await openScreen(sessionWith(PermissionCodes.SETTINGS.SALE_ON_STORES.VIEW), server([rule()]), <SaleOnStoresPage />);

    await screen.findByText("Eid sale");
    expect(screen.queryByRole("button", { name: /New sale/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply schedule now" })).not.toBeInTheDocument();
  });

  it("offers Apply schedule now only with the PROMO_MANAGE code and runs it", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.SETTINGS.SALE_ON_STORES.VIEW, PermissionCodes.RESTRICTED_OPERATIONS.PROMOTIONS.PROMO_MANAGE),
      (request) => (request.method === "POST" && request.url.includes("/refresh-prices") ? { status: 204, body: undefined } : server([rule()])(request)),
      <SaleOnStoresPage />,
    );

    await user.click(await screen.findByRole("button", { name: "Apply schedule now" }));

    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.includes("/promotions/refresh-prices"))).toBe(true));
  });

  it("checks the sale before sending it and shows the messages next to the fields", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...saleOnStoresPermissions), server([]), <SaleOnStoresPage />);

    await user.click(await screen.findByRole("button", { name: /New sale/ }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
    expect(screen.getByText(/Enter a percentage above 0/)).toBeInTheDocument();
    expect(screen.getByText("Choose at least one store.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("creates a sale for a chosen store with a percentage", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...saleOnStoresPermissions), server([]), <SaleOnStoresPage />);

    await user.click(await screen.findByRole("button", { name: /New sale/ }));
    await user.type(screen.getByLabelText(/^Name/), "Eid sale");
    await user.type(screen.getByLabelText(/Discount %/), "10");
    await user.click(await screen.findByRole("checkbox", { name: "Main Store" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.endsWith("/promotions/sales-on-stores"))).toBe(true));
    const post = requests.find((request) => request.method === "POST" && request.url.endsWith("/promotions/sales-on-stores"));
    expect(post?.body).toMatchObject({ name: "Eid sale", discountPercent: 10, storeIds: [TEST_STORE_ID], categoryIds: [], endsAt: null, isActive: true, rowVersion: null });
    expect((post?.body as { startsAt: string }).startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("Special Offers", () => {
  it("has no percentage field because each product of an offer carries its own", async () => {
    const user = userEvent.setup();
    await openScreen(
      sessionWith(PermissionCodes.SETTINGS.SPECIAL_OFFERS.VIEW, PermissionCodes.SETTINGS.SPECIAL_OFFERS.ADD),
      (request) => (request.url.includes("/stores") ? { body: [store] } : { body: [] }),
      <SpecialOffersPage />,
    );

    await user.click(await screen.findByRole("button", { name: /New offer/ }));

    expect(screen.getByText("New special offer")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Discount %/)).not.toBeInTheDocument();
    expect(screen.getByText("Leave all unticked for every store.")).toBeInTheDocument();
  });
});

describe("Sale on Categories", () => {
  it("lists the categories as Department -- Category and asks for at least one", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.SETTINGS.SALE_ON_CATEGORIES.VIEW, PermissionCodes.SETTINGS.SALE_ON_CATEGORIES.ADD),
      (request) => {
        const path = request.url.replace("/api/v1", "");
        if (path.startsWith("/stores")) return { body: [store] };
        if (path.startsWith("/promotions/sales-on-categories/category-options")) return { body: [{ categoryId: CATEGORY_ID, categoryName: "Casual", departmentName: "Shoes" }] };
        return { body: [] };
      },
      <SaleOnCategoriesPage />,
    );

    await user.click(await screen.findByRole("button", { name: /New sale/ }));
    expect(await screen.findByRole("checkbox", { name: "Shoes -- Casual" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Name/), "Casual clearance");
    await user.type(screen.getByLabelText(/Discount %/), "25");
    await user.click(await screen.findByRole("checkbox", { name: "Main Store" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Choose at least one category.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });
});

describe("Special Offer Details", () => {
  const offer = rule({ id: OFFER_ID, kindCode: "SPECIAL_OFFER", name: "Weekend offer", discountPercent: null, storeCount: 0, stores: [], lineCount: 1 });
  const line: SpecialOfferLineResponse = {
    lineId: "line-1",
    variantId: "variant-1",
    barcode: "BAR-27",
    productCode: "101",
    productName: "Gents Sandal",
    sizeCode: "27",
    colorName: "Black",
    categoryName: "Casual",
    genderName: "Men",
    seasonName: "Summer",
    brandName: "Bata",
    discountPercent: 20,
  };

  function server() {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (request.method === "POST" && path.includes("/lines")) return { body: { addedCount: 1, skippedCount: 0 } };
      if (request.method === "PUT" && path.includes("/lines/")) return { status: 204, body: undefined };
      if (path.includes("/lines")) return { body: [line] };
      if (path.startsWith("/promotions/special-offers")) return { body: [offer] };
      if (path.startsWith("/categories/options") || path.startsWith("/brands/options")) return { body: [] };
      return { status: 404, body: {} };
    };
  }

  const permissions = [
    PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.VIEW,
    PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.ADD,
    PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.EDIT,
    PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.DELETE,
  ];

  async function chooseOffer(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByLabelText("Offer"));
    await user.click(await screen.findByRole("option", { name: "Weekend offer" }));
  }

  it("shows the products of the chosen offer with their category, gender, season and company", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...permissions), server(), <SpecialOfferDetailsPage />);

    await chooseOffer(user);

    expect(await screen.findByText("Gents Sandal (101)")).toBeInTheDocument();
    expect(screen.getByText("Bata")).toBeInTheDocument();
    expect(screen.getByText("Summer")).toBeInTheDocument();
  });

  it("adds a scanned barcode at a percentage and refuses a missing percentage before asking the server", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...permissions), server(), <SpecialOfferDetailsPage />);
    await chooseOffer(user);
    await screen.findByText("Gents Sandal (101)");

    await user.type(screen.getByLabelText("Barcode or product code"), "BAR-28");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByText(/Enter a percentage above 0/)).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST" && request.url.includes("/lines"))).toBe(false);

    await user.type(screen.getByLabelText("Discount %", { selector: "#field-offerDetailsPercentage" }), "15");
    await user.click(screen.getByRole("button", { name: "Add product" }));
    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.includes("/lines"))).toBe(true));
    const post = requests.find((request) => request.method === "POST" && request.url.includes("/lines"));
    expect(post?.body).toMatchObject({ barcode: "BAR-28", categoryId: null, brandId: null, discountPercent: 15 });
  });

  it("saves a changed percentage of a line only after it was changed", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...permissions), server(), <SpecialOfferDetailsPage />);
    await chooseOffer(user);
    await screen.findByText("Gents Sandal (101)");
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeDisabled();

    const input = screen.getByLabelText("BAR-27 %");
    await user.clear(input);
    await user.type(input, "35");
    await user.click(saveButton);

    await waitFor(() => expect(requests.some((request) => request.method === "PUT" && request.url.includes("/lines/line-1"))).toBe(true));
    expect(requests.find((request) => request.method === "PUT")?.body).toMatchObject({ discountPercent: 35 });
  });

  it("hides the add form and the Remove button from a person who may only view", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.SETTINGS.SPECIAL_OFFER_DETAILS.VIEW), server(), <SpecialOfferDetailsPage />);
    await chooseOffer(user);
    await screen.findByText("Gents Sandal (101)");
    expect(screen.queryByRole("button", { name: "Add product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});

describe("Deals", () => {
  const deal: DealResponse = {
    id: "deal-1",
    name: "Two pairs deal",
    barcode: "DL000001",
    bundlePrice: 2_500,
    startsAt: "2026-11-01T09:00:00.000Z",
    endsAt: null,
    isActive: true,
    phaseCode: "RUNNING",
    lineCount: 2,
    totalQuantity: 3,
    lines: [],
    rowVersion: 1,
  };
  const dealPermissions = [PermissionCodes.SETTINGS.DEALS.VIEW, PermissionCodes.SETTINGS.DEALS.ADD, PermissionCodes.SETTINGS.DEALS.EDIT, PermissionCodes.SETTINGS.DEALS.DELETE];

  function server(onScan?: (barcode: string) => unknown) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (request.method === "POST" && path.startsWith("/promotions/deals")) return { status: 201, body: deal };
      if (path.startsWith("/promotions/deals/variant-by-barcode")) {
        const barcode = new URL(request.url, "http://localhost").searchParams.get("barcode") ?? "";
        const found = onScan?.(barcode);
        return found ? { body: found } : { status: 404, body: { title: "Not found", status: 404, detail: "No product has that barcode or product code." } };
      }
      if (path.startsWith("/promotions/deals")) return { body: [deal] };
      return { status: 404, body: {} };
    };
  }

  it("lists the deals with their barcode and price and says the till does not read deals yet", async () => {
    await openScreen(sessionWith(...dealPermissions), server(), <DealsPage />);

    const table = await screen.findByRole("table", { name: "All deals" });
    expect(within(table).getByText("Two pairs deal")).toBeInTheDocument();
    expect(within(table).getByText("DL000001")).toBeInTheDocument();
    expect(within(table).getByText("2,500")).toBeInTheDocument();
    expect(screen.getByText(/does not read deals for now|the till does not read deals/)).toBeInTheDocument();
  });

  it("scans products into a deal and keeps the discount, the net price and the totals in step", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(...dealPermissions),
      server((barcode) => (barcode === "BAR-27" ? { variantId: "variant-1", barcode, productCode: "101", productName: "Gents Sandal", sizeCode: "27", salePrice: 1_000 } : null)),
      <DealsPage />,
    );

    await user.click(await screen.findByRole("button", { name: /New deal/ }));
    await user.type(screen.getByLabelText("Scan a barcode or type a product code"), "BAR-27");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Gents Sandal (101)")).toBeInTheDocument();
    expect(screen.getByTestId("deal-total-amount")).toHaveTextContent("1,000");

    const percentInput = screen.getByLabelText("BAR-27 Disc. %");
    await user.clear(percentInput);
    await user.type(percentInput, "20{Enter}");
    expect(screen.getByLabelText("BAR-27 Net price")).toHaveValue("800");
    expect(screen.getByLabelText("BAR-27 Discount")).toHaveValue("200");

    const quantityInput = screen.getByLabelText("BAR-27 Qty");
    await user.clear(quantityInput);
    await user.type(quantityInput, "3{Enter}");
    expect(screen.getByTestId("deal-total-quantity")).toHaveTextContent("3");
    expect(screen.getByTestId("deal-total-amount")).toHaveTextContent("2,400");

    await user.type(screen.getByLabelText(/^Deal name/), "Three pairs");
    await user.click(screen.getByRole("button", { name: "Create deal" }));
    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.endsWith("/promotions/deals"))).toBe(true));
    const post = requests.find((request) => request.method === "POST" && request.url.endsWith("/promotions/deals"));
    expect(post?.body).toMatchObject({ name: "Three pairs", barcode: null, lines: [{ variantId: "variant-1", quantity: 3, netUnitPrice: 800 }], rowVersion: null });
  });

  it("says when a barcode is unknown or already in the deal, and asks for a product before saving", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(...dealPermissions),
      server((barcode) => (barcode === "BAR-27" ? { variantId: "variant-1", barcode, productCode: "101", productName: "Gents Sandal", sizeCode: "27", salePrice: 1_000 } : null)),
      <DealsPage />,
    );

    await user.click(await screen.findByRole("button", { name: /New deal/ }));
    await user.type(screen.getByLabelText(/^Deal name/), "Empty deal");
    await user.click(screen.getByRole("button", { name: "Create deal" }));
    expect(await screen.findByText("A deal needs at least one product.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Scan a barcode or type a product code"), "NOPE{Enter}");
    expect(await screen.findByText("No product has that barcode or product code.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Scan a barcode or type a product code"));
    await user.type(screen.getByLabelText("Scan a barcode or type a product code"), "BAR-27{Enter}");
    await screen.findByText("Gents Sandal (101)");
    await user.type(screen.getByLabelText("Scan a barcode or type a product code"), "BAR-27{Enter}");
    expect(await screen.findByText("That product is already in the deal. Raise its quantity.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("hides New deal, Edit and Delete from a person who may only view", async () => {
    await openScreen(sessionWith(PermissionCodes.SETTINGS.DEALS.VIEW), server(), <DealsPage />);
    await screen.findByText("Two pairs deal");
    expect(screen.queryByRole("button", { name: /New deal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});

describe("Promotion Conflicts", () => {
  const conflict: PromotionConflictResponse = {
    groupId: "group-1",
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    variantId: "variant-1",
    barcode: "BAR-27",
    productName: "Gents Sandal",
    sizeCode: "27",
    listPrice: 1_000,
    candidates: [
      { ruleId: "rule-offer", ruleName: "Weekend offer", kindCode: "SPECIAL_OFFER", salePrice: 800, discountPercent: 20 },
      { ruleId: "rule-sale", ruleName: "Eid sale", kindCode: "SALE_ON_STORES", salePrice: 900, discountPercent: 10 },
    ],
  };

  function server(items: PromotionConflictResponse[]) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (request.method === "POST" && path.includes("/resolve")) return { status: 204, body: undefined };
      if (path.startsWith("/promotions/conflicts")) return { body: { items, page: 1, pageSize: 25, totalCount: items.length, totalPageCount: 1 } };
      return { status: 404, body: {} };
    };
  }

  it("lists each product with the promotions that cover it and what each would charge", async () => {
    await openScreen(sessionWith(PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.VIEW), server([conflict]), <PromotionConflictsPage />);

    expect(await screen.findByText("Gents Sandal (27) BAR-27")).toBeInTheDocument();
    expect(screen.getByText("Weekend offer (Special offer): 800")).toBeInTheDocument();
    expect(screen.getByText("Eid sale (Sale on stores): 900")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
  });

  it("offers the choice only to a person who may approve, and sends the chosen promotion", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.VIEW, PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.APPROVE),
      server([conflict]),
      <PromotionConflictsPage />,
    );

    const buttons = await screen.findAllByRole("button", { name: "Use this one" });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]);

    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.includes("/conflicts/group-1/resolve"))).toBe(true));
    expect(requests.find((request) => request.method === "POST")?.body).toEqual({ chosenRuleId: "rule-offer" });
  });

  it("shows no choice button to a person who may only look", async () => {
    await openScreen(sessionWith(PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.VIEW), server([conflict]), <PromotionConflictsPage />);
    await screen.findByText("Gents Sandal (27) BAR-27");
    expect(screen.queryByRole("button", { name: "Use this one" })).not.toBeInTheDocument();
  });

  it("says when there is nothing to choose", async () => {
    await openScreen(sessionWith(PermissionCodes.PROMOTIONS.PROMOTION_CONFLICT_RESOLUTION.VIEW), server([]), <PromotionConflictsPage />);
    expect(await screen.findByText("No conflicts")).toBeInTheDocument();
  });
});
