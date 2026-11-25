import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { StaffDetailResponse } from "../types/staffTypes";
import { StaffDetailPage } from "./StaffDetailPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/staff/1" }));

const STAFF_ID = "0197c3a0-cccc-7000-8000-000000000001";
const SECOND_STORE_ID = "0197c3a0-3333-7000-8000-000000000004";
const stores = [
  { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true },
  { id: SECOND_STORE_ID, code: "SECOND", name: "Second Store", isHeadOffice: false, isActive: true },
];

function detail(overrides: Partial<StaffDetailResponse> = {}): StaffDetailResponse {
  return {
    profile: {
      staffId: STAFF_ID,
      code: "10300003",
      name: "Imran Manager",
      designation: "Manager",
      isManager: true,
      currentStoreId: TEST_STORE_ID,
      currentStoreName: "Main Store",
      baseSalary: 20_000,
      payFrequencyCode: "MONTHLY",
      joinedOn: "2026-01-01",
      leftOn: null,
      statusCode: "ACTIVE",
    },
    rowVersion: 7,
    salaryTerms: [
      { id: "term-2", effectiveFrom: "2026-09-01", baseSalary: 20_000, payFrequencyCode: "MONTHLY", changedByUserId: null, changedByName: "Owner One", changedAt: "2026-09-01T08:00:00Z" },
      { id: "term-1", effectiveFrom: "2026-01-01", baseSalary: 15_000, payFrequencyCode: "WEEKLY", changedByUserId: null, changedByName: null, changedAt: "2026-01-01T08:00:00Z" },
    ],
    transferHistory: [
      { id: "move-2", fromStoreId: SECOND_STORE_ID, fromStoreName: "Second Store", toStoreId: TEST_STORE_ID, toStoreName: "Main Store", effectiveOn: "2026-06-01", changedByUserId: null, changedByName: "Owner One", changedAt: "2026-06-01T09:30:00Z" },
      { id: "move-1", fromStoreId: null, fromStoreName: null, toStoreId: SECOND_STORE_ID, toStoreName: "Second Store", effectiveOn: "2026-01-01", changedByUserId: null, changedByName: null, changedAt: "2026-01-01T09:30:00Z" },
    ],
    ...overrides,
  };
}

function sessionWith(...permissionCodes: string[]): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: permissionCodes, accessibleStoreIds: [TEST_STORE_ID, SECOND_STORE_ID], hasAccessToAllStores: true });
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

describe("staff page", () => {
  function server(state: { detail: StaffDetailResponse; saveStatus?: number }) {
    return (request: RecordedRequest) => {
      const path = request.url.replace("/api/v1", "");
      if (path.startsWith("/stores")) return { body: stores };
      if (request.method === "GET" && path === `/staff/${STAFF_ID}`) return { body: state.detail };
      if (request.method === "PUT" && path === `/staff/${STAFF_ID}/salary-terms`) {
        if (state.saveStatus === 409) return { status: 409, body: { title: "Conflict", detail: "changed", errorCode: "CONCURRENT_UPDATE" } };
        state.detail = detail({ rowVersion: 8, profile: { ...state.detail.profile, baseSalary: 25_000 } });
        return { status: 204 };
      }
      if (request.method === "POST" && path === `/staff-members/${STAFF_ID}/transfers`) return { status: 204 };
      return { status: 404, body: {} };
    };
  }

  const editor = [PermissionCodes.HUMAN_RESOURCES.STAFF_PROFILES.VIEW, PermissionCodes.HUMAN_RESOURCES.SALARY_TERMS.EDIT];

  it("shows the profile and pay terms, and the salary history and store history on their own tabs", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...editor), server({ detail: detail() }), <StaffDetailPage staffId={STAFF_ID} />);

    expect(await screen.findByText("Imran Manager (10300003)")).toBeInTheDocument();
    expect(screen.getByText("Manager", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Basic pay \(Rs\)/)).toHaveValue("20,000");

    await user.click(screen.getByRole("tab", { name: "Salary history" }));
    expect(await screen.findByText("Owner One")).toBeInTheDocument();
    expect(screen.getByText("15,000")).toBeInTheDocument();
    expect(screen.getByText("Weekly")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Store history" }));
    expect(await screen.findByText("First assignment")).toBeInTheDocument();
    expect(screen.getAllByText("Second Store").length).toBeGreaterThanOrEqual(2);
  });

  it("saves new pay terms with the row version it was shown", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...editor), server({ detail: detail() }), <StaffDetailPage staffId={STAFF_ID} />);
    const basicPay = await screen.findByLabelText(/Basic pay \(Rs\)/);

    await user.clear(basicPay);
    await user.type(basicPay, "25000");
    await user.click(screen.getByRole("button", { name: "Save pay terms" }));

    const put = requests.find((request) => request.method === "PUT");
    expect(put?.body).toEqual({ baseSalary: 25_000, payFrequencyCode: "MONTHLY", rowVersion: 7 });
  });

  it("refuses a negative or empty basic pay before sending anything", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sessionWith(...editor), server({ detail: detail() }), <StaffDetailPage staffId={STAFF_ID} />);
    const basicPay = await screen.findByLabelText(/Basic pay \(Rs\)/);

    await user.clear(basicPay);
    await user.click(screen.getByRole("button", { name: "Save pay terms" }));

    expect(await screen.findByText("Enter the basic pay as a whole number of rupees, zero or more.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "PUT")).toBe(false);
  });

  it("says so when somebody else changed the person in the meantime", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(...editor), server({ detail: detail(), saveStatus: 409 }), <StaffDetailPage staffId={STAFF_ID} />);
    const basicPay = await screen.findByLabelText(/Basic pay \(Rs\)/);

    await user.clear(basicPay);
    await user.type(basicPay, "30000");
    await user.click(screen.getByRole("button", { name: "Save pay terms" }));

    expect(await screen.findByText(/Someone else changed this person/)).toBeInTheDocument();
  });

  it("shows the pay terms read-only to a person who may not edit them", async () => {
    await openScreen(sessionWith(PermissionCodes.HUMAN_RESOURCES.STAFF_PROFILES.VIEW), server({ detail: detail() }), <StaffDetailPage staffId={STAFF_ID} />);

    expect(await screen.findByLabelText(/Basic pay \(Rs\)/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save pay terms" })).not.toBeInTheDocument();
  });

  it("offers a transfer only with the Add permission, checks the form, and sends the store and the date", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(
      sessionWith(PermissionCodes.HUMAN_RESOURCES.STAFF_PROFILES.VIEW, PermissionCodes.HUMAN_RESOURCES.STAFF_TRANSFERS.ADD),
      server({ detail: detail() }),
      <StaffDetailPage staffId={STAFF_ID} />,
    );
    await screen.findByText("Imran Manager (10300003)");
    await user.click(screen.getByRole("tab", { name: "Store history" }));

    await user.click(await screen.findByRole("button", { name: "Transfer to another store" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Transfer" }));
    expect(await within(dialog).findByText("Choose the new store.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);

    await user.click(within(dialog).getByLabelText(/New store/));
    await user.click(await screen.findByRole("option", { name: "Second Store" }));
    await user.click(within(dialog).getByRole("button", { name: "Transfer" }));

    const post = requests.find((request) => request.method === "POST");
    expect(post?.url).toContain(`/staff-members/${STAFF_ID}/transfers`);
    expect(post?.body).toMatchObject({ toStoreId: SECOND_STORE_ID });
    expect((post?.body as { effectiveOn: string }).effectiveOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not offer a transfer without the Add permission", async () => {
    const user = userEvent.setup();
    await openScreen(sessionWith(PermissionCodes.HUMAN_RESOURCES.STAFF_PROFILES.VIEW), server({ detail: detail() }), <StaffDetailPage staffId={STAFF_ID} />);
    await screen.findByText("Imran Manager (10300003)");

    await user.click(screen.getByRole("tab", { name: "Store history" }));

    expect(screen.queryByRole("button", { name: "Transfer to another store" })).not.toBeInTheDocument();
  });

  it("shows a not-found notice and sends no request for an id that is not a UUID", async () => {
    const requests = await openScreen(sessionWith(...editor), server({ detail: detail() }), <StaffDetailPage staffId="not-a-uuid" />);

    expect(await screen.findByText(/This staff member was not found/)).toBeInTheDocument();
    expect(requests.some((request) => request.url.includes("/staff/"))).toBe(false);
  });
});
