import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type {
  CommissionDetailReportResponse,
  CommissionEntryResponse,
  CommissionEntryTotalsResponse,
  CommissionPlanResponse,
  CommissionSummaryReportResponse,
} from "../types/commissionTypes";
import { CommissionAccrualAndPaymentReportPage } from "./CommissionAccrualAndPaymentReportPage";
import { CommissionEntriesPage } from "./CommissionEntriesPage";
import { CommissionPlansPage } from "./CommissionPlansPage";
import { CommissionReportPage } from "./CommissionReportPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/commissions/plans" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const SALESMAN_ID = "0197c3a0-aaaa-7000-8000-00000000000a";
const staffLookup = [{ id: SALESMAN_ID, code: "10300002", name: "Zaman Salesman", phone: null, storeId: TEST_STORE_ID }];

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

function plan(overrides: Partial<CommissionPlanResponse> = {}): CommissionPlanResponse {
  return {
    id: "plan-1",
    name: "Zaman 3 percent",
    appliesToCode: "SALESMAN",
    basisCode: "NET_SALE",
    calculationTypeCode: "PERCENT",
    defaultRate: 3,
    defaultFixedAmountPerPiece: null,
    minimumStoreSales: 0,
    storeId: null,
    storeName: null,
    validFrom: "2026-01-01",
    validTo: null,
    isActive: true,
    memberCount: 1,
    ruleCount: 0,
    members: [{ staffId: SALESMAN_ID, staffCode: "10300002", staffName: "Zaman Salesman" }],
    rules: [],
    rowVersion: 1,
    ...overrides,
  };
}

function entry(overrides: Partial<CommissionEntryResponse> = {}): CommissionEntryResponse {
  return {
    id: "entry-1",
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    staffId: SALESMAN_ID,
    staffCode: "10300002",
    staffName: "Zaman Salesman",
    planId: "plan-1",
    planName: "Zaman 3 percent",
    saleDate: "2026-11-10",
    invoiceId: "invoice-1",
    invoiceNumber: 17,
    entryTypeCode: "EARN",
    calculationTypeCode: "PERCENT",
    rate: 3,
    fixedAmountPerPiece: null,
    quantity: 2,
    baseAmount: 2_000,
    commissionAmount: 60,
    statusCode: "PENDING",
    approvedAt: null,
    salaryMonth: null,
    ...overrides,
  };
}

describe("Commission Plans", () => {
  const viewAndEdit = [
    PermissionCodes.COMMISSIONS.COMMISSION_PLANS.VIEW,
    PermissionCodes.COMMISSIONS.COMMISSION_PLANS.ADD,
    PermissionCodes.COMMISSIONS.COMMISSION_PLANS.EDIT,
    PermissionCodes.COMMISSIONS.COMMISSION_PLANS.DELETE,
  ];

  function server(plans: CommissionPlanResponse[]) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (path.startsWith("/staff-members/lookup")) return { body: staffLookup };
      if (path.startsWith("/commissions/plans/plan-1")) return { body: plans[0] };
      if (path.startsWith("/commissions/plans")) return { body: plans };
      return { status: 404, body: {} };
    };
  }

  it("lists the plans with who they pay, the rate and how many people they cover", async () => {
    await openScreen(sessionWith(...viewAndEdit), server([plan(), plan({ id: "plan-2", name: "Everybody", memberCount: 0, defaultRate: 1 })]), <CommissionPlansPage />);

    const table = await screen.findByRole("table", { name: "All plans" });
    expect(within(table).getByText("Zaman 3 percent")).toBeInTheDocument();
    expect(within(table).getByText("3% of the base")).toBeInTheDocument();
    expect(within(table).getByText("1 chosen")).toBeInTheDocument();
    expect(within(table).getByText("Everybody of this role")).toBeInTheDocument();
  });

  it("sorts the plans by a column in the browser", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...viewAndEdit), server([plan({ name: "Zeta" }), plan({ id: "plan-2", name: "Alpha" })]), <CommissionPlansPage />);

    await screen.findByText("Zeta");
    await user.click(screen.getByRole("button", { name: /Sort by Plan/ }));
    const firstDataRow = screen.getAllByRole("row")[1];
    expect(within(firstDataRow).getByText("Alpha")).toBeInTheDocument();
  });

  it("shows the empty state when there are no plans", async () => {
    await openScreen(sessionWith(...viewAndEdit), server([]), <CommissionPlansPage />);
    expect(await screen.findByText("No commission plans yet")).toBeInTheDocument();
  });

  it("hides New plan, Edit and Delete from a person who may only view", async () => {
    await openScreen(sessionWith(PermissionCodes.COMMISSIONS.COMMISSION_PLANS.VIEW), server([plan()]), <CommissionPlansPage />);

    await screen.findByText("Zaman 3 percent");
    expect(screen.queryByRole("button", { name: /New plan/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rules" })).toBeInTheDocument();
  });

  it("checks the plan before sending it and shows the messages next to the fields", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...viewAndEdit), server([]), <CommissionPlansPage />);

    await user.click(await screen.findByRole("button", { name: /New plan/ }));
    await user.click(screen.getByRole("button", { name: "Create plan" }));

    expect(await screen.findByText("Enter the name of the plan.")).toBeInTheDocument();
    expect(screen.getByText("Enter a percentage from 0 to 100.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("creates a plan for one salesman at three percent", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(...viewAndEdit),
      (request) => (request.method === "POST" ? { status: 201, body: plan() } : server([])(request)),
      <CommissionPlansPage />,
    );

    await user.click(await screen.findByRole("button", { name: /New plan/ }));
    await user.type(screen.getByLabelText(/Plan name/), "Zaman 3 percent");
    await user.type(screen.getByLabelText(/Commission rate/), "3");
    await user.click(screen.getByPlaceholderText("Search staff by name or code"));
    await user.click(await screen.findByText("Zaman Salesman"));
    await user.click(screen.getByRole("button", { name: "Create plan" }));

    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.endsWith("/commissions/plans"))).toBe(true));
    const post = requests.find((request) => request.method === "POST" && request.url.endsWith("/commissions/plans"));
    expect(post?.body).toMatchObject({
      name: "Zaman 3 percent",
      appliesToCode: "SALESMAN",
      calculationTypeCode: "PERCENT",
      defaultRate: 3,
      defaultFixedAmountPerPiece: null,
      memberStaffIds: [SALESMAN_ID],
      rowVersion: null,
    });
  });
});

describe("Commission Entries", () => {
  const totals: CommissionEntryTotalsResponse = { pendingAmount: 60, approvedAmount: 30, paidAmount: 10, totalAmount: 100, entryCount: 3 };

  function server() {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (path.startsWith("/staff-members/lookup")) return { body: staffLookup };
      if (path.startsWith("/commissions/entries/totals")) return { body: totals };
      if (path.startsWith("/commissions/entries/approve")) return { body: { approvedEntryCount: 2 } };
      if (path.startsWith("/commissions/entries")) {
        return { body: { items: [entry(), entry({ id: "entry-2", entryTypeCode: "REVERSAL", commissionAmount: -60, baseAmount: -2_000, statusCode: "PENDING" })], page: 1, pageSize: 25, totalCount: 2, totalPageCount: 1 } };
      }
      return { status: 404, body: {} };
    };
  }

  it("shows the totals of every matching entry and the entries with their status", async () => {
    await openScreen(sessionWith(PermissionCodes.COMMISSIONS.COMMISSION_ENTRIES.VIEW), server(), <CommissionEntriesPage />);

    expect(await screen.findByText("Waiting for approval")).toBeInTheDocument();
    expect(await screen.findByText("Taken back")).toBeInTheDocument();
    expect(screen.getAllByText("Zaman Salesman (10300002)").length).toBe(2);
    expect(screen.getByText("3 entries")).toBeInTheDocument();
  });

  it("offers Approve commission only to a person who may approve", async () => {
    await openScreen(sessionWith(PermissionCodes.COMMISSIONS.COMMISSION_ENTRIES.VIEW), server(), <CommissionEntriesPage />);
    await screen.findByText("Waiting for approval");
    expect(screen.queryByRole("button", { name: "Approve commission" })).not.toBeInTheDocument();
  });

  it("asks for a store before approving, then approves the chosen store and period", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.COMMISSIONS.COMMISSION_ENTRIES.VIEW, PermissionCodes.COMMISSIONS.COMMISSION_ENTRIES.APPROVE),
      server(),
      <CommissionEntriesPage />,
    );

    await user.click(await screen.findByRole("button", { name: "Approve commission" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Choose the store.")).toBeInTheDocument();
    expect(requests.some((request) => request.url.includes("/entries/approve"))).toBe(false);

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/^Store/));
    await user.click(await screen.findByRole("option", { name: "Main Store" }));
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(requests.some((request) => request.method === "POST" && request.url.includes("/entries/approve"))).toBe(true));
    const post = requests.find((request) => request.method === "POST" && request.url.includes("/entries/approve"));
    expect(post?.body).toMatchObject({ storeId: TEST_STORE_ID });
  });
});

describe("Commission reports", () => {
  const summary: CommissionSummaryReportResponse = {
    rows: [
      { staffId: SALESMAN_ID, staffCode: "10300002", staffName: "Zaman Salesman", baseAmount: 3_000, earnedAmount: 90, reversedAmount: -30, netAmount: 60, pendingAmount: 20, approvedAmount: 30, paidAmount: 10 },
    ],
    totalBaseAmount: 3_000,
    totalEarnedAmount: 90,
    totalReversedAmount: -30,
    totalNetAmount: 60,
    totalPendingAmount: 20,
    totalApprovedAmount: 30,
    totalPaidAmount: 10,
    staffCount: 1,
    isRowLimitReached: false,
  };
  const detail: CommissionDetailReportResponse = { rows: [entry()], totalBaseAmount: 2_000, totalCommissionAmount: 60, entryCount: 1, isRowLimitReached: false };

  function server(summaryBody: CommissionSummaryReportResponse = summary) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (path.startsWith("/staff-members/lookup")) return { body: staffLookup };
      if (path.startsWith("/commissions/reports/commission/detail")) return { body: detail };
      if (path.startsWith("/commissions/reports/commission/summary")) return { body: summaryBody };
      if (path.startsWith("/commissions/reports/accrual-and-payment")) return { body: summaryBody };
      return { status: 404, body: {} };
    };
  }

  it("shows the summary with totals over every person and offers Print only with the permission", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.REPORTS.COMMISSION_REPORT.VIEW, PermissionCodes.REPORTS.COMMISSION_REPORT.PRINT),
      server(),
      <CommissionReportPage />,
    );

    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText("Zaman Salesman")).toBeInTheDocument();
    expect(screen.getByTestId("commission-report-total-net")).toHaveTextContent("60");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(requests.find((request) => request.url.includes("/commissions/reports/commission/summary"))?.url).toMatch(/fromDate=\d{4}-\d{2}-\d{2}/);
  });

  it("does not offer Print without the Print permission", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.REPORTS.COMMISSION_REPORT.VIEW), server(), <CommissionReportPage />);
    await user.click(screen.getByRole("button", { name: "Show report" }));
    await screen.findByText("Zaman Salesman");
    expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
  });

  it("says when nothing was earned in the period", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.REPORTS.COMMISSION_REPORT.VIEW), server({ ...summary, rows: [], staffCount: 0, totalNetAmount: 0 }), <CommissionReportPage />);
    await user.click(screen.getByRole("button", { name: "Show report" }));
    expect(await screen.findByText("No commission in this period")).toBeInTheDocument();
  });

  it("warns when the report was cut at the row limit", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.REPORTS.COMMISSION_REPORT.VIEW), server({ ...summary, isRowLimitReached: true }), <CommissionReportPage />);
    await user.click(screen.getByRole("button", { name: "Show report" }));
    expect(await screen.findByText(/Only the first rows are shown/)).toBeInTheDocument();
  });

  it("shows the accrual and payment report for the period", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.REPORTS.COMMISSION_ACCRUAL_AND_PAYMENT_REPORT.VIEW), server(), <CommissionAccrualAndPaymentReportPage />);
    await user.click(screen.getByRole("button", { name: "Show report" }));
    expect(await screen.findByText("Zaman Salesman")).toBeInTheDocument();
    expect(screen.getByTestId("commission-accrual-report-total-paid")).toHaveTextContent("10");
  });
});
