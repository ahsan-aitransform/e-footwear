import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { setSelectedStoreId } from "@/lib/session/selectedStoreStore";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import { PayrollStatusCodes, type PayrollSheetLineResponse, type PayrollSheetResponse, type SalaryPaymentResponse } from "../types/payrollTypes";
import { NewSalarySheetPage } from "./NewSalarySheetPage";
import { ViewSalarySheetPage } from "./ViewSalarySheetPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/payroll/new-salary-sheet" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const RUN_ID = "0197c3a0-aaaa-7000-8000-000000000001";

const permissions = {
  view: PermissionCodes.HUMAN_RESOURCES.NEW_SALARY_SHEET.VIEW,
  add: PermissionCodes.HUMAN_RESOURCES.NEW_SALARY_SHEET.ADD,
  edit: PermissionCodes.HUMAN_RESOURCES.NEW_SALARY_SHEET.EDIT,
  viewSheet: PermissionCodes.HUMAN_RESOURCES.VIEW_SALARY_SHEET.VIEW,
  prepare: PermissionCodes.RESTRICTED_OPERATIONS.EXPENSES_AND_PAYROLL.PAYROLL_PREPARE,
  approve: PermissionCodes.HUMAN_RESOURCES.PAYROLL_RUNS.APPROVE,
  approveLegacy: PermissionCodes.RESTRICTED_OPERATIONS.EXPENSES_AND_PAYROLL.PAYROLL_APPROVE,
  payAdd: PermissionCodes.HUMAN_RESOURCES.SALARY_PAYMENTS.ADD,
  payView: PermissionCodes.HUMAN_RESOURCES.SALARY_PAYMENTS.VIEW,
};

function sessionWith(grantedPermissionCodes: string[], hasAccessToAllStores = true): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes, hasAccessToAllStores, accessibleStoreIds: [TEST_STORE_ID] });
}

function line(overrides: Partial<PayrollSheetLineResponse> = {}): PayrollSheetLineResponse {
  return {
    lineId: "0197c3a0-bbbb-7000-8000-000000000001",
    staffId: "0197c3a0-cccc-7000-8000-000000000001",
    employeeCode: "10300001",
    employeeName: "Imran",
    designation: "Manager",
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    baseSalary: 20_000,
    totalSales: 0,
    commissionAmount: 0,
    incentiveAmount: 5_000,
    deductionAmount: 2_000,
    netPay: 23_000,
    paidAmount: 0,
    outstandingAmount: 23_000,
    statusCode: PayrollStatusCodes.draft,
    ...overrides,
  };
}

function sheetOf(lines: PayrollSheetLineResponse[], overrides: Partial<PayrollSheetResponse> = {}): PayrollSheetResponse {
  const sum = (read: (line: PayrollSheetLineResponse) => number) => lines.reduce((total, current) => total + read(current), 0);
  return {
    runId: RUN_ID,
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    periodMonth: "2026-11-01",
    statusCode: PayrollStatusCodes.draft,
    approvedByUserId: null,
    approvedByName: null,
    approvedAt: null,
    rowVersion: 1,
    lines,
    totalBaseSalary: sum((current) => current.baseSalary),
    totalCommission: sum((current) => current.commissionAmount),
    totalIncentive: sum((current) => current.incentiveAmount),
    totalDeduction: sum((current) => current.deductionAmount),
    totalNetPay: sum((current) => current.netPay),
    totalPaid: sum((current) => current.paidAmount),
    totalOutstanding: sum((current) => current.outstandingAmount),
    ...overrides,
  };
}

const draftSheet = () =>
  sheetOf([line(), line({ lineId: "0197c3a0-bbbb-7000-8000-000000000002", staffId: "0197c3a0-cccc-7000-8000-000000000002", employeeCode: "10300002", employeeName: "Zaman", designation: "Salesman", baseSalary: 30_000, incentiveAmount: 0, deductionAmount: 0, netPay: 30_000, outstandingAmount: 30_000 })]);

async function openScreen(session: CurrentSessionResponse, handler: (request: RecordedRequest) => { status?: number; body?: unknown }, screen_: React.ReactElement) {
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  setSelectedStoreId(TEST_STORE_ID);
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

describe("New Salary Sheet", () => {
  function server(state: { sheet: PayrollSheetResponse | null }) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (request.method === "GET" && path.startsWith("/payroll/sheets")) return state.sheet ? { body: state.sheet } : { status: 204 };
      if (request.method === "GET" && path.startsWith("/payroll/adjustments")) return { body: [] };
      if (path === "/payroll/sheets/prepare") {
        state.sheet = draftSheet();
        return { body: state.sheet };
      }
      if (path === `/payroll/sheets/${RUN_ID}/approve`) {
        state.sheet = { ...draftSheet(), statusCode: PayrollStatusCodes.approved };
        return { body: state.sheet };
      }
      if (path === "/payroll/adjustments" && request.method === "POST") return { status: 201, body: { id: "adjustment-1" } };
      return { status: 404, body: {} };
    };
  }

  it("offers to prepare a sheet when none exists and sends the store and the first day of the month", async () => {
    const user = userEvent.setup();
    const state = { sheet: null as PayrollSheetResponse | null };
    const requests = await openScreen(sessionWith([permissions.view, permissions.add, permissions.prepare]), server(state), <NewSalarySheetPage />);

    expect(await screen.findByText("No salary sheet for this month yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Prepare sheet" }));

    const post = requests.find((request) => request.method === "POST" && request.url.endsWith("/payroll/sheets/prepare"));
    expect(post?.body).toMatchObject({ storeId: TEST_STORE_ID });
    expect((post?.body as { month: string }).month).toMatch(/^\d{4}-\d{2}-01$/);
    expect(await screen.findByText("Imran")).toBeInTheDocument();
    expect(screen.getByText("Zaman")).toBeInTheDocument();
  });

  it("shows each line and totals the columns in whole rupees", async () => {
    await openScreen(sessionWith([permissions.view]), server({ sheet: draftSheet() }), <NewSalarySheetPage />);

    expect(await screen.findByText("Imran")).toBeInTheDocument();
    expect(screen.getByText("23,000")).toBeInTheDocument();   // Imran: 20,000 + 5,000 - 2,000
    expect(screen.getByText("53,000")).toBeInTheDocument();   // total net pay
    expect(screen.getByText("50,000")).toBeInTheDocument();   // total basic pay
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("hides Prepare and Adjustment from a person who may only look", async () => {
    await openScreen(sessionWith([permissions.view]), server({ sheet: draftSheet() }), <NewSalarySheetPage />);

    await screen.findByText("Imran");
    expect(screen.queryByRole("button", { name: "Prepare again" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adjustment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve sheet" })).not.toBeInTheDocument();
  });

  it("asks for confirmation naming the amount before approving, then approves once", async () => {
    const user = userEvent.setup();
    const state = { sheet: draftSheet() as PayrollSheetResponse | null };
    const requests = await openScreen(
      sessionWith([permissions.view, permissions.add, permissions.prepare, permissions.approve, permissions.approveLegacy]),
      server(state),
      <NewSalarySheetPage />,
    );
    await screen.findByText("Imran");

    await user.click(screen.getByRole("button", { name: "Approve sheet" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Approve this salary sheet?")).toBeInTheDocument();
    expect(within(dialog).getByText(/Rs 53,000/)).toBeInTheDocument();
    expect(requests.some((request) => request.url.endsWith("/approve"))).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Approve" }));

    expect(requests.filter((request) => request.method === "POST" && request.url.endsWith(`/payroll/sheets/${RUN_ID}/approve`))).toHaveLength(1);
    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve sheet" })).not.toBeInTheDocument();
  });

  it("explains that approving needs head-office rights instead of offering a button that would fail", async () => {
    await openScreen(
      sessionWith([permissions.view, permissions.add, permissions.prepare, permissions.approve, permissions.approveLegacy], false),
      server({ sheet: draftSheet() }),
      <NewSalarySheetPage />,
    );

    await screen.findByText("Imran");
    expect(screen.getByText(/posted to the head office/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve sheet" })).not.toBeInTheDocument();
  });

  it("checks an adjustment before sending it, then sends the person, the month, the kind and the whole-rupee amount", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith([permissions.view, permissions.add, permissions.edit, permissions.prepare]), server({ sheet: draftSheet() }), <NewSalarySheetPage />);
    await screen.findByText("Imran");

    await user.click(screen.getAllByRole("button", { name: "Adjustment" })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Adjustment for Imran")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Save adjustment" }));
    expect(await within(dialog).findByText("Enter an amount of more than zero, in whole rupees.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST" && request.url.endsWith("/payroll/adjustments"))).toBe(false);

    await user.type(within(dialog).getByLabelText(/Amount \(Rs\)/), "1500");
    await user.click(within(dialog).getByRole("button", { name: "Save adjustment" }));

    const post = requests.find((request) => request.method === "POST" && request.url.endsWith("/payroll/adjustments"));
    expect(post?.body).toMatchObject({ staffId: "0197c3a0-cccc-7000-8000-000000000001", adjustmentTypeCode: "INCENTIVE", amount: 1500, reason: null });
    expect((post?.body as { month: string }).month).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe("View Salary Sheet", () => {
  const payableLine = line({
    lineId: "0197c3a0-bbbb-7000-8000-000000000010",
    employeeName: "Imran",
    netPay: 20_000,
    incentiveAmount: 0,
    deductionAmount: 0,
    paidAmount: 8_000,
    outstandingAmount: 12_000,
    statusCode: PayrollStatusCodes.approved,
  });
  const paidLine = line({
    lineId: "0197c3a0-bbbb-7000-8000-000000000011",
    staffId: "0197c3a0-cccc-7000-8000-000000000011",
    employeeName: "Zaman",
    baseSalary: 15_000,
    netPay: 15_000,
    incentiveAmount: 0,
    deductionAmount: 0,
    paidAmount: 15_000,
    outstandingAmount: 0,
    statusCode: PayrollStatusCodes.paid,
  });
  const approvedSheet = () => sheetOf([payableLine, paidLine], { statusCode: PayrollStatusCodes.approved, approvedByName: "Owner One", approvedAt: "2026-11-02T09:00:00Z" });
  const payment: SalaryPaymentResponse = {
    id: "payment-1",
    payrollLineId: paidLine.lineId,
    staffId: paidLine.staffId,
    employeeName: "Zaman",
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    periodMonth: "2026-11-01",
    paidOn: "2026-11-05",
    amount: 15_000,
    methodCode: "BANK",
    reference: "TRX-9",
    paidByUserId: null,
    paidByName: "Owner One",
    createdAt: "2026-11-05T10:00:00Z",
  };

  function server(request: RecordedRequest) {
    const path = request.url.replace("/api/v1", "");
    if (path.startsWith("/stores")) return { body: [store] };
    if (request.method === "GET" && path.startsWith("/payroll/sheets")) return { body: approvedSheet() };
    if (request.method === "GET" && path === `/payroll/lines/${paidLine.lineId}/payments`) return { body: [payment] };
    if (request.method === "POST" && path === `/payroll/lines/${payableLine.lineId}/payments`) return { status: 201, body: { ...payment, id: "payment-2", amount: 12_000 } };
    return { status: 404, body: {} };
  }

  const payerPermissions = [permissions.viewSheet, permissions.payAdd, permissions.payView, permissions.approveLegacy];

  it("shows what is paid and outstanding, offers Pay only on a line that still owes, and says an approved sheet is final", async () => {
    await openScreen(sessionWith(payerPermissions), server, <ViewSalarySheetPage />);

    expect(await screen.findByText("Imran")).toBeInTheDocument();
    expect(screen.getAllByText("12,000")).toHaveLength(2);   // the line's outstanding amount and the total of the column
    expect(screen.getAllByRole("button", { name: "Pay" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Payments" })).toHaveLength(2);
    expect(screen.getByText(/An approved sheet is final/)).toBeInTheDocument();
    // "Paid" is the column header and the status of the fully paid line.
    expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(2);
  });

  it("refuses to pay more than is outstanding, then records a payment with one client transaction id", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(payerPermissions), server, <ViewSalarySheetPage />);
    await screen.findByText("Imran");

    await user.click(screen.getByRole("button", { name: "Pay" }));
    const dialog = await screen.findByRole("dialog");
    const amount = within(dialog).getByLabelText(/Amount \(Rs\)/);
    expect(amount).toHaveValue("12,000");

    await user.clear(amount);
    await user.type(amount, "12001");
    await user.click(within(dialog).getByRole("button", { name: "Record payment" }));
    expect(await within(dialog).findByText("The payment cannot be more than the outstanding Rs 12,000.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);

    await user.clear(amount);
    await user.type(amount, "12000");
    await user.click(within(dialog).getByRole("button", { name: "Record payment" }));

    const post = requests.find((request) => request.method === "POST");
    expect(post?.url).toContain(`/payroll/lines/${payableLine.lineId}/payments`);
    expect(post?.body).toMatchObject({ amount: 12_000, methodCode: "CASH", reference: null });
    const clientTransactionId = (post?.body as { clientTransactionId: string }).clientTransactionId;
    expect(clientTransactionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(post?.headers["idempotency-key"]).toBe(clientTransactionId);
  });

  it("does not offer Pay to a person without the payment permissions", async () => {
    await openScreen(sessionWith([permissions.viewSheet]), server, <ViewSalarySheetPage />);

    await screen.findByText("Imran");
    expect(screen.queryByRole("button", { name: "Pay" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Payments" })).not.toBeInTheDocument();
  });

  it("does not offer Pay to a store-limited person even with the permissions, and says why", async () => {
    await openScreen(sessionWith(payerPermissions, false), server, <ViewSalarySheetPage />);

    await screen.findByText("Imran");
    expect(screen.queryByRole("button", { name: "Pay" })).not.toBeInTheDocument();
    expect(screen.getByText(/posted to the head office/)).toBeInTheDocument();
  });

  it("lists the payments of a line with their date, amount, method and who recorded them", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(payerPermissions), server, <ViewSalarySheetPage />);
    await screen.findByText("Imran");

    await user.click(screen.getAllByRole("button", { name: "Payments" })[1]);

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("2026-11-05")).toBeInTheDocument();
    expect(within(dialog).getByText("Bank")).toBeInTheDocument();
    expect(within(dialog).getByText("TRX-9")).toBeInTheDocument();
    expect(within(dialog).getByText("Owner One")).toBeInTheDocument();
  });
});
