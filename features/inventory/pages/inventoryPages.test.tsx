import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { CurrentSessionResponse } from "@/lib/types/session";
import type { InventoryItemResponse, StockAuditResponse, StockTransferResponse, TransferLossCaseResponse } from "../types/inventoryTypes";
import { StockAdjustmentPage } from "./StockAdjustmentPage";
import { StockAuditPage } from "./StockAuditPage";
import { StockTransferReceivingPage } from "./StockTransferReceivingPage";
import { TransferDiscrepanciesPage } from "./TransferDiscrepanciesPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/inventory/stock-adjustment" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const emptyPage = { items: [], page: 1, pageSize: 25, totalCount: 0 };

const sandal: InventoryItemResponse = {
  variantId: "0197c3a0-4444-7000-8000-000000000004",
  productCode: "P1",
  productName: "Gents Sandal",
  productNameUrdu: null,
  unitName: "Pair",
  sizeCode: "42",
  colorName: null,
  barcode: "1S42",
  stockQuantity: 10,
  purchasePriceAmount: 400,
};

function sessionWith(...permissionCodes: string[]): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: permissionCodes });
}

async function openScreen(session: CurrentSessionResponse, handler: (request: RecordedRequest) => { status?: number; body?: unknown } | "network-failure", screen_: React.ReactElement) {
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : { body: null })));
  const requests = installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request)));
  render(screen_);
  return requests;
}

const pathOf = (request: RecordedRequest) => request.url.replace("/api/v1", "").split("?")[0];

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Stock Adjustment screen", () => {
  const permissions = [
    PermissionCodes.INVOICE.STOCK_ADJUSTMENT.VIEW,
    PermissionCodes.INVOICE.STOCK_ADJUSTMENT.ADD,
    PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_ADJUST,
  ];
  const server = (request: RecordedRequest) => {
    const path = pathOf(request);
    if (path === "/stores") return { body: [store] };
    if (path === "/inventory/stock-adjustments/items/by-barcode") return { body: sandal };
    if (path === "/inventory/stock-adjustments" && request.method === "POST") {
      return { status: 201, body: { id: "adj1", storeId: TEST_STORE_ID, storeName: "Main Store", documentNumber: 7, adjustmentDate: "2026-11-10", statusCode: "POSTED", kindCode: "MANUAL", description: null, reversesDocumentId: null, createdByName: null, postedAt: null, addedQuantity: 0, removedQuantity: 2, netValueAmount: -800, lines: [] } };
    }
    if (path.startsWith("/inventory/stock-adjustments")) return { body: emptyPage };
    return { status: 404, body: {} };
  };

  async function scanSandal(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText("Barcode, product code or product name"), "1S42{Enter}");
    await screen.findByText("Gents Sandal");
  }

  it("sends a removal as a negative quantity with one transaction id, and shows the saved number", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...permissions), server, <StockAdjustmentPage />);

    await scanSandal(user);
    const lineDirection = screen.getAllByLabelText("Add or remove").find((element) => element.tagName === "SELECT") as HTMLSelectElement;
    await user.selectOptions(lineDirection, "REMOVE");
    const quantity = screen.getByLabelText("Qty");
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(requests.some((request) => request.method === "POST" && pathOf(request) === "/inventory/stock-adjustments")).toBe(true));
    const post = requests.find((request) => request.method === "POST" && pathOf(request) === "/inventory/stock-adjustments")!;
    const body = post.body as { storeId: string; clientTransactionId: string; lines: { variantId: string; quantity: number; unitCostAmount: number }[] };
    expect(body.storeId).toBe(TEST_STORE_ID);
    expect(body.lines).toEqual([{ variantId: sandal.variantId, quantity: -2, unitCostAmount: 400, reasonText: null }]);
    expect(body.clientTransactionId).toBe(post.headers["idempotency-key"]);
    expect(await screen.findByText(/Adjustment 7 was saved/)).toBeInTheDocument();
  });

  it("refuses to remove more than is in stock without calling the server", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...permissions), server, <StockAdjustmentPage />);

    await scanSandal(user);
    const lineDirection = screen.getAllByLabelText("Add or remove").find((element) => element.tagName === "SELECT") as HTMLSelectElement;
    await user.selectOptions(lineDirection, "REMOVE");
    const quantity = screen.getByLabelText("Qty");
    await user.clear(quantity);
    await user.type(quantity, "11");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Line 1: you cannot remove more pieces than are in stock.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("offers only the history to a person who may not add adjustments", async () => {
    await openScreen(sessionWith(PermissionCodes.INVOICE.STOCK_ADJUSTMENT.VIEW), server, <StockAdjustmentPage />);

    expect(await screen.findByText("You may look at the adjustments but not enter new ones.")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "New adjustment" })).not.toBeInTheDocument();
  });
});

describe("Stock Audit screen", () => {
  const permissions = [PermissionCodes.INVOICE.STOCK_AUDIT.VIEW, PermissionCodes.INVOICE.STOCK_AUDIT.EDIT, PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_AUDIT];
  const audit = (countedQuantity: number): StockAuditResponse => ({
    id: "audit1",
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    documentNumber: 3,
    auditDate: "2026-11-10",
    statusCode: "DRAFT",
    note: null,
    includesUnscannedItems: false,
    postedAt: null,
    summary: { countedItemCount: 1, moreItemCount: 0, lessItemCount: 1, matchedItemCount: 0, differenceAmount: -1_200 },
    lines: [{ variantId: sandal.variantId, barcode: "1S42", productName: "Gents Sandal", categoryName: null, brandName: null, genderName: null, seasonName: null, sizeCode: "42", expectedQuantity: 10, countedQuantity, differenceQuantity: countedQuantity - 10, purchasePriceAmount: 400, salePriceAmount: 800, differenceAmount: (countedQuantity - 10) * 400, wasScanned: true }],
  });

  it("sends the same scan id again when a scan got no answer, so the pieces are never counted twice", async () => {
    const user = userEvent.setup();
    let scanAttempts = 0;
    const handler = (request: RecordedRequest) => {
      const path = pathOf(request);
      if (path === "/stores") return { body: [store] };
      if (path === "/inventory/stock-audits" && request.method === "GET") return { body: { ...emptyPage, items: [{ id: "audit1", storeId: TEST_STORE_ID, storeName: "Main Store", documentNumber: 3, auditDate: "2026-11-10", statusCode: "DRAFT", note: null, scannedPieceCount: 0, scannedItemCount: 0 }], totalCount: 1 } };
      if (path === "/inventory/stock-audits/audit1/scans") {
        scanAttempts += 1;
        if (scanAttempts === 1) return "network-failure" as const;
        return { body: { variantId: sandal.variantId, productName: "Gents Sandal", sizeCode: "42", countedQuantity: 3, wasAlreadyRecorded: false } };
      }
      if (path === "/inventory/stock-audits/audit1") return { body: audit(3) };
      return { status: 404, body: {} };
    };
    const requests = await openScreen(sessionWith(...permissions), handler, <StockAuditPage />);

    await user.click(await screen.findByRole("button", { name: "Continue" }));
    const barcode = await screen.findByLabelText("Scan barcode or type product code");
    await user.type(barcode, "1S42");
    const quantity = screen.getByLabelText("Pieces");
    await user.clear(quantity);
    await user.type(quantity, "3");
    await user.click(screen.getByRole("button", { name: "Count" }));
    await waitFor(() => expect(scanAttempts).toBe(1));
    await user.click(await screen.findByRole("button", { name: "Count" }));

    await waitFor(() => expect(scanAttempts).toBe(2));
    const scans = requests.filter((request) => pathOf(request) === "/inventory/stock-audits/audit1/scans");
    const first = scans[0].body as { deviceScanId: string; quantity: number };
    const second = scans[1].body as { deviceScanId: string; quantity: number };
    expect(first.quantity).toBe(3);
    expect(second.deviceScanId).toBe(first.deviceScanId);
  });
});

describe("Stock Transfer Receiving screen", () => {
  const permissions = [
    PermissionCodes.INVENTORY.STOCK_TRANSFER_RECEIVING.VIEW,
    PermissionCodes.INVENTORY.STOCK_TRANSFER_RECEIVING.EDIT,
    PermissionCodes.INVENTORY.STOCK_TRANSFER_RECEIVING.ADD,
    PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_RECEIVE,
  ];
  const transfer: StockTransferResponse = {
    id: "t1",
    transferNumber: 12,
    fromStoreId: "other",
    fromStoreName: "Second Store",
    toStoreId: TEST_STORE_ID,
    toStoreName: "Main Store",
    statusCode: "SHIPPED",
    note: null,
    createdByName: null,
    createdAt: "2026-11-10T08:00:00Z",
    shippedAt: "2026-11-10T09:00:00Z",
    closedAt: null,
    quantityScanned: 4,
    quantityShipped: 4,
    quantityReceived: 0,
    quantityMissing: 0,
    lines: [{ lineId: "l1", variantId: sandal.variantId, barcode: "1S42", productName: "Gents Sandal", sizeCode: "42", quantityScanned: 4, quantityShipped: 4, quantityReceived: 0, quantityMissing: 0, unitCostAmount: 400 }],
    lossCases: [],
  };
  const listItem = { ...transfer, lines: undefined, lossCases: undefined, note: undefined, createdByName: undefined };

  it("scans what arrives and completes the receiving only after the person confirms", async () => {
    const user = userEvent.setup();
    const handler = (request: RecordedRequest) => {
      const path = pathOf(request);
      if (path === "/stores") return { body: [store] };
      if (path === "/inventory/stock-transfer-receiving") return { body: { ...emptyPage, items: [listItem], totalCount: 1 } };
      if (path === "/inventory/stock-transfer-receiving/t1/scans") return { body: { variantId: sandal.variantId, productName: "Gents Sandal", sizeCode: "42", quantityScanned: 4, quantityReceived: 2, wasAlreadyRecorded: false } };
      if (path === "/inventory/stock-transfer-receiving/t1/complete") return { body: { ...transfer, statusCode: "COMPLETED_WITH_MISSING", quantityReceived: 2, quantityMissing: 2 } };
      if (path === "/inventory/stock-transfer-receiving/t1") return { body: transfer };
      return { status: 404, body: {} };
    };
    const requests = await openScreen(sessionWith(...permissions), handler, <StockTransferReceivingPage />);

    await user.dblClick(await screen.findByText("Second Store"));
    await user.type(await screen.findByLabelText("Scan barcode or type product code"), "1S42");
    const quantity = screen.getByLabelText("Pieces");
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.click(screen.getByRole("button", { name: "Count" }));
    await waitFor(() => expect(requests.some((request) => pathOf(request) === "/inventory/stock-transfer-receiving/t1/scans")).toBe(true));
    const scan = requests.find((request) => pathOf(request) === "/inventory/stock-transfer-receiving/t1/scans")!;
    expect(scan.body).toMatchObject({ barcode: "1S42", quantity: 2 });

    await user.click(screen.getByRole("button", { name: "Complete receiving" }));
    expect(requests.some((request) => pathOf(request).endsWith("/complete"))).toBe(false);
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Complete receiving" }));
    await waitFor(() => expect(requests.some((request) => pathOf(request).endsWith("/complete"))).toBe(true));
  });
});

describe("Transfer Discrepancies screen", () => {
  const permissions = [
    PermissionCodes.INVENTORY.TRANSFER_DISCREPANCIES.VIEW,
    PermissionCodes.INVENTORY.TRANSFER_DISCREPANCIES.APPROVE,
    PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_LOSS_DECIDE,
  ];
  const lossCase: TransferLossCaseResponse = {
    id: "c1",
    transferId: "t1",
    transferNumber: 12,
    fromStoreId: "other",
    fromStoreName: "Second Store",
    toStoreId: TEST_STORE_ID,
    toStoreName: "Main Store",
    variantId: sandal.variantId,
    barcode: "1S42",
    productName: "Gents Sandal",
    sizeCode: "42",
    quantity: 2,
    reason: null,
    bearerCode: null,
    statusCode: "OPEN",
    raisedAt: "2026-11-11T08:00:00Z",
  };

  it("has no default bearer: a charge cannot be saved until someone is chosen", async () => {
    const user = userEvent.setup();
    const handler = (request: RecordedRequest) => {
      const path = pathOf(request);
      if (path === "/stores") return { body: [store] };
      if (path === "/inventory/transfer-discrepancies/c1/decide") return { body: { ...lossCase, statusCode: "ASSIGNED", bearerCode: "COMPANY" } };
      if (path === "/inventory/transfer-discrepancies") return { body: { ...emptyPage, items: [lossCase], totalCount: 1 } };
      return { status: 404, body: {} };
    };
    const requests = await openScreen(sessionWith(...permissions), handler, <TransferDiscrepanciesPage />);

    await user.dblClick(await screen.findByText("Second Store"));
    await user.click(await screen.findByText("Charge the loss"));
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    expect(await screen.findByText("Choose who carries the loss.")).toBeInTheDocument();
    expect(requests.some((request) => pathOf(request).endsWith("/decide"))).toBe(false);
  });

  it("does not let a person without the approve permission decide", async () => {
    const user = userEvent.setup();
    const handler = (request: RecordedRequest) => {
      const path = pathOf(request);
      if (path === "/stores") return { body: [store] };
      if (path === "/inventory/transfer-discrepancies") return { body: { ...emptyPage, items: [lossCase], totalCount: 1 } };
      return { status: 404, body: {} };
    };
    await openScreen(sessionWith(PermissionCodes.INVENTORY.TRANSFER_DISCREPANCIES.VIEW), handler, <TransferDiscrepanciesPage />);

    expect(await screen.findByText("You may look at the missing pieces but not decide them.")).toBeInTheDocument();
    await user.dblClick(await screen.findByText("Second Store"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
