import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { CurrentSessionResponse } from "@/lib/types/session";
import type { AccountingPeriodResponse, TrialBalanceResponse } from "../types/accountReportTypes";
import { AccountingPeriodsPage } from "./AccountingPeriodsPage";
import { TrialBalancePage } from "./TrialBalancePage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/reports/trial-balance" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };

function sessionWith(...permissionCodes: string[]): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: permissionCodes });
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

function trialBalance(overrides: Partial<TrialBalanceResponse> = {}): TrialBalanceResponse {
  return {
    asOfDate: "2026-11-30",
    storeId: null,
    isDetailed: true,
    rows: [
      { rowKindCode: "GROUP", groupCode: "101", groupTitle: "Cash", accountId: null, accountCode: null, accountTitle: null, mainTypeCode: "ASSET", totalDebitAmount: 25_000, totalCreditAmount: 60_000, balanceDebitAmount: 0, balanceCreditAmount: 35_000 },
      { rowKindCode: "ACCOUNT", groupCode: "101", groupTitle: "Cash", accountId: "a1", accountCode: "CASH-S1", accountTitle: "Cash in hand", mainTypeCode: "ASSET", totalDebitAmount: 25_000, totalCreditAmount: 60_000, balanceDebitAmount: 0, balanceCreditAmount: 35_000 },
      { rowKindCode: "GROUP", groupCode: "103", groupTitle: "Party control", accountId: null, accountCode: null, accountTitle: null, mainTypeCode: "ASSET", totalDebitAmount: 60_000, totalCreditAmount: 25_000, balanceDebitAmount: 35_000, balanceCreditAmount: 0 },
    ],
    totalDebitAmount: 85_000,
    totalCreditAmount: 85_000,
    totalBalanceDebitAmount: 35_000,
    totalBalanceCreditAmount: 35_000,
    isBalanced: true,
    ...overrides,
  };
}

describe("trial balance screen", () => {
  function serverReturning(report: TrialBalanceResponse) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (path.startsWith("/account-reports/detail-trial-balance")) return { body: report };
      return { status: 404, body: {} };
    };
  }
  const permissions = [PermissionCodes.REPORTS.DETAIL_TRIAL_BALANCE.VIEW, PermissionCodes.REPORTS.DETAIL_TRIAL_BALANCE.PRINT];

  it("shows the heads with their accounts, the totals of the heads only, and that the books balance", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...permissions), serverReturning(trialBalance()), <TrialBalancePage isDetailed />);

    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText("The books balance: total debit equals total credit.")).toBeInTheDocument();
    expect(screen.getByText("Cash in hand")).toBeInTheDocument();
    expect(screen.getByTestId("trial-total-debit")).toHaveTextContent("Rs 85,000");
    expect(screen.getByTestId("trial-total-credit")).toHaveTextContent("Rs 85,000");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });

  it("says so loudly when total debit and total credit differ", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...permissions), serverReturning(trialBalance({ totalCreditAmount: 80_000, isBalanced: false })), <TrialBalancePage isDetailed />);

    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText(/Total debit and total credit differ/)).toBeInTheDocument();
  });

  it("does not offer printing without the Print permission", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.REPORTS.DETAIL_TRIAL_BALANCE.VIEW), serverReturning(trialBalance()), <TrialBalancePage isDetailed />);

    await user.click(screen.getByRole("button", { name: "Show report" }));
    await screen.findByText("Cash in hand");

    expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
  });
});

describe("accounting periods screen", () => {
  const periods: AccountingPeriodResponse[] = [
    { periodStart: "2026-11-01", statusCode: "OPEN", closedAt: null, closedByName: null },
    { periodStart: "2026-10-01", statusCode: "CLOSED", closedAt: "2026-11-02T09:00:00Z", closedByName: "Owner One" },
  ];
  function server(request: RecordedRequest) {
    const path = request.url.replace("/api/v1", "");
    if (path === "/accounting-periods" && request.method === "GET") return { body: periods };
    if (path === "/accounting-periods/close") return { body: { ...periods[0], statusCode: "CLOSED", closedByName: "Owner One" } };
    return { status: 404, body: {} };
  }

  it("lists the months and offers close and reopen only to people who may approve", async () => {
    await openScreen(sessionWith(PermissionCodes.VOUCHER.ACCOUNTING_PERIODS.VIEW), server, <AccountingPeriodsPage />);
    expect(await screen.findByText("November 2026")).toBeInTheDocument();
    expect(screen.getByText("Owner One")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen month" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before closing a month and then sends the first day of that month", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.VOUCHER.ACCOUNTING_PERIODS.VIEW, PermissionCodes.VOUCHER.ACCOUNTING_PERIODS.APPROVE),
      server,
      <AccountingPeriodsPage />,
    );
    await screen.findByText("November 2026");
    expect(screen.getByRole("button", { name: "Reopen month" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close month" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Close this month?")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Close month" }));

    const post = requests.find((request) => request.method === "POST");
    expect(post?.url).toContain("/accounting-periods/close");
    expect(post?.body).toEqual({ periodStart: "2026-11-01" });
  });
});
