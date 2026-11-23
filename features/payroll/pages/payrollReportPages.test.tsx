import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { SalaryOutstandingReportResponse, SalaryPaymentResponse, StaffSalaryReportResponse } from "../types/payrollTypes";
import { SalaryOutstandingReportPage } from "./SalaryOutstandingReportPage";
import { SalaryPaymentsPage } from "./SalaryPaymentsPage";
import { StaffSalaryReportPage } from "./StaffSalaryReportPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/reports/staff-salary" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };

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

function salaryReport(overrides: Partial<StaffSalaryReportResponse> = {}): StaffSalaryReportResponse {
  return {
    rows: [
      { periodMonth: "2026-10-01", storeId: TEST_STORE_ID, storeName: "Main Store", employeePartyId: "p1", employeeCode: "10300001", employeeName: "Imran", designation: "Manager", baseSalary: 20_000, commissionAmount: 0, incentiveAmount: 4_000, deductionAmount: 0, netPay: 24_000, paidAmount: 10_000, outstandingAmount: 14_000, statusCode: "APPROVED" },
      { periodMonth: "2026-10-01", storeId: TEST_STORE_ID, storeName: "Main Store", employeePartyId: "p2", employeeCode: "10300002", employeeName: "Zaman", designation: "Salesman", baseSalary: 30_000, commissionAmount: 0, incentiveAmount: 0, deductionAmount: 0, netPay: 30_000, paidAmount: 0, outstandingAmount: 30_000, statusCode: "DRAFT" },
    ],
    totalBaseSalary: 50_000,
    totalCommission: 0,
    totalIncentive: 4_000,
    totalDeduction: 0,
    totalNetPay: 54_000,
    totalPaid: 10_000,
    totalOutstanding: 44_000,
    lineCount: 2,
    isTruncated: false,
    ...overrides,
  };
}

describe("Staff Salary Report", () => {
  function server(report: StaffSalaryReportResponse) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (path.startsWith("/payroll/reports/staff-salary")) return { body: report };
      return { status: 404, body: {} };
    };
  }
  const permissions = [PermissionCodes.REPORTS.STAFF_SALARY_REPORT.VIEW, PermissionCodes.REPORTS.STAFF_SALARY_REPORT.PRINT];

  it("asks for the report with the first day of each month and shows totals of every line", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...permissions), server(salaryReport()), <StaffSalaryReportPage />);

    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText("Imran")).toBeInTheDocument();
    const request = requests.find((recorded) => recorded.url.includes("/payroll/reports/staff-salary"));
    expect(request?.url).toMatch(/fromMonth=\d{4}-\d{2}-01/);
    expect(request?.url).toMatch(/toMonth=\d{4}-\d{2}-01/);
    expect(screen.getByTestId("staff-salary-total-net-pay")).toHaveTextContent("54,000");
    expect(screen.getByTestId("staff-salary-total-outstanding")).toHaveTextContent("44,000");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });

  it("says when the report was cut at the row limit and does not offer Print without the permission", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.REPORTS.STAFF_SALARY_REPORT.VIEW), server(salaryReport({ isTruncated: true })), <StaffSalaryReportPage />);

    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText(/The report is cut at the row limit/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
  });

  it("shows an empty state when no salary lines match", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...permissions), server(salaryReport({ rows: [], lineCount: 0, totalNetPay: 0, totalOutstanding: 0 })), <StaffSalaryReportPage />);

    await user.click(screen.getByRole("button", { name: "Show report" }));

    expect(await screen.findByText("No salary lines found")).toBeInTheDocument();
  });
});

describe("Salary Outstanding Report", () => {
  const report: SalaryOutstandingReportResponse = {
    rows: [{ periodMonth: "2026-10-01", storeId: TEST_STORE_ID, storeName: "Main Store", employeePartyId: "p1", employeeName: "Part Paid", netPay: 20_000, paidAmount: 5_000, outstandingAmount: 15_000 }],
    totalNetPay: 20_000,
    totalPaid: 5_000,
    totalOutstanding: 15_000,
    lineCount: 1,
    isTruncated: false,
  };

  function server(answer: SalaryOutstandingReportResponse) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: [store] };
      if (path.startsWith("/payroll/reports/salary-outstanding")) return { body: answer };
      return { status: 404, body: {} };
    };
  }

  it("loads on its own and shows what is still owed with its total", async () => {
    await openScreen(sessionWith(PermissionCodes.REPORTS.SALARY_OUTSTANDING_REPORT.VIEW), server(report), <SalaryOutstandingReportPage />);

    expect(await screen.findByText("Part Paid")).toBeInTheDocument();
    expect(screen.getByTestId("salary-outstanding-total")).toHaveTextContent("15,000");
    expect(screen.getByText("October 2026")).toBeInTheDocument();
  });

  it("says that nothing is outstanding when everything approved has been paid", async () => {
    await openScreen(
      sessionWith(PermissionCodes.REPORTS.SALARY_OUTSTANDING_REPORT.VIEW),
      server({ rows: [], totalNetPay: 0, totalPaid: 0, totalOutstanding: 0, lineCount: 0, isTruncated: false }),
      <SalaryOutstandingReportPage />,
    );

    expect(await screen.findByText("No salary is outstanding")).toBeInTheDocument();
  });
});

describe("Salary Payments", () => {
  const payment: SalaryPaymentResponse = {
    id: "payment-1",
    payrollLineId: "line-1",
    employeePartyId: "p1",
    employeeName: "Imran",
    storeId: TEST_STORE_ID,
    storeName: "Main Store",
    periodMonth: "2026-10-01",
    paidOn: "2026-11-05",
    amount: 8_000,
    methodCode: "CASH",
    reference: "Slip 12",
    paidByUserId: null,
    paidByName: "Owner One",
    createdAt: "2026-11-05T10:00:00Z",
  };

  it("lists the payments with their month, method and total", async () => {
    await openScreen(
      sessionWith(PermissionCodes.HUMAN_RESOURCES.SALARY_PAYMENTS.VIEW),
      (request) => {
        const path = request.url.replace("/api/v1", "");
        if (path.startsWith("/stores")) return { body: [store] };
        if (path.startsWith("/payroll/payments")) return { body: { items: [payment], page: 1, pageSize: 25, totalCount: 1 } };
        return { status: 404, body: {} };
      },
      <SalaryPaymentsPage />,
    );

    expect(await screen.findByText("Imran")).toBeInTheDocument();
    expect(screen.getByText("2026-11-05")).toBeInTheDocument();
    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getAllByText("8,000").length).toBeGreaterThanOrEqual(1);
  });
});
