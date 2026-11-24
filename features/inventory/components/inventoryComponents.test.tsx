import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { CurrentSessionResponse } from "@/lib/types/session";
import type { StockAdjustmentResponse, StockAuditResponse } from "../types/inventoryTypes";
import { StockAdjustmentDetailCard } from "./StockAdjustmentDetailCard";
import { StockAuditComparisonTable } from "./StockAuditComparisonTable";
import { StockAdjustmentPage } from "../pages/StockAdjustmentPage";
import { StockAuditReportPage } from "../pages/StockAuditReportPage";
import { StockReconciliationPage } from "../pages/StockReconciliationPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/inventory/stock-adjustment" }));

const line = (expected: number, counted: number, price = 400) => ({
  variantId: `v${expected}-${counted}`, barcode: `B${expected}${counted}`, productName: "Gents Sandal", categoryName: null, brandName: null, genderName: null, seasonName: null,
  sizeCode: "42", expectedQuantity: expected, countedQuantity: counted, differenceQuantity: counted - expected, purchasePriceAmount: price, salePriceAmount: 800,
  differenceAmount: (counted - expected) * price, wasScanned: true,
});

const audit: StockAuditResponse = {
  id: "a1", storeId: TEST_STORE_ID, storeName: "Main Store", documentNumber: 5, auditDate: "2026-11-10", statusCode: "POSTED", note: null, includesUnscannedItems: false, postedAt: null,
  summary: { countedItemCount: 2, moreItemCount: 1, lessItemCount: 1, matchedItemCount: 0, differenceAmount: -400 },
  lines: [line(10, 7), line(2, 3)],
};

function sessionWith(...permissionCodes: string[]): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: permissionCodes });
}
async function open(session: CurrentSessionResponse, handler: (request: RecordedRequest) => { status?: number; body?: unknown }, element: React.ReactElement) {
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : { body: null })));
  installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request)));
  render(element);
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("audit comparison", () => {
  it("shows the difference of each size, the value of the difference and the summary counts", () => {
    render(<StockAuditComparisonTable audit={audit} />);

    expect(screen.getAllByText("-3").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rs\s?-?400/).length).toBeGreaterThan(0);
    expect(screen.getByText("Counted Items").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("More").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Less").nextSibling).toHaveTextContent("1");
  });

  it("explains an audit with nothing counted yet", () => {
    render(<StockAuditComparisonTable audit={{ ...audit, lines: [], summary: { ...audit.summary, countedItemCount: 0 } }} />);

    expect(screen.getByText("Nothing counted yet")).toBeInTheDocument();
  });
});

describe("adjustment detail", () => {
  it("splits a signed quantity into added and removed and totals the value in whole rupees", () => {
    const adjustment: StockAdjustmentResponse = {
      id: "x", storeId: TEST_STORE_ID, storeName: "Main Store", documentNumber: 9, adjustmentDate: "2026-11-10", statusCode: "CANCELLED", kindCode: "MANUAL", description: "Recount",
      reversesDocumentId: null, createdByName: "Owner", postedAt: null, addedQuantity: 5, removedQuantity: 2, netValueAmount: 1_200,
      lines: [
        { lineNumber: 1, variantId: "a", barcode: "A1", productName: "Sandal", unitName: null, sizeCode: "42", expectedQuantity: null, countedQuantity: null, quantity: 5, unitCostAmount: 400, reasonText: null },
        { lineNumber: 2, variantId: "b", barcode: "B1", productName: "Shoe", unitName: null, sizeCode: "40", expectedQuantity: null, countedQuantity: null, quantity: -2, unitCostAmount: 400, reasonText: null },
      ],
    };
    render(<StockAdjustmentDetailCard adjustment={adjustment} />);

    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getByText("Recount")).toBeInTheDocument();
    expect(screen.getAllByText(/1,200/).length).toBeGreaterThan(0);
  });
});

describe("screen states", () => {
  const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };

  it("asks for a store when none is chosen and the person works in several", async () => {
    const session = buildCompanyUserSession({ grantedPermissionCodes: [PermissionCodes.INVOICE.STOCK_ADJUSTMENT.VIEW], accessibleStoreIds: ["s1", "s2"] });
    await open(session, () => ({ body: [store] }), <StockAdjustmentPage />);

    expect(await screen.findByText("Choose the store you are working in from the top bar first.")).toBeInTheDocument();
  });

  it("shows the server's message when the reconciliation cannot be loaded", async () => {
    const handler = (request: RecordedRequest) => (request.url.includes("/stores") ? { body: [store] } : { status: 500, body: { title: "Server error", status: 500 } });
    await open(sessionWith(PermissionCodes.INVENTORY.STOCK_RECONCILIATION.VIEW), handler, <StockReconciliationPage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("does not offer printing or export of the audit report without those permissions", async () => {
    const handler = (request: RecordedRequest) => (request.url.includes("/stores") ? { body: [store] } : { body: { items: [], page: 1, pageSize: 25, totalCount: 0 } });
    await open(sessionWith(PermissionCodes.REPORTS.STOCK_AUDIT_REPORT.VIEW), handler, <StockAuditReportPage />);

    expect(await screen.findByRole("button", { name: "Show" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
  });
});
