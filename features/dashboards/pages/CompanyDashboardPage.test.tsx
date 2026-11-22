import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import {
  TEST_STORE_ID,
  buildCompanyUserSession,
  resetBrowserStateForTests,
  seedVerifiedSession,
} from "@/tests/support/sessionFixtures";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { CompanyDashboardPage } from "./CompanyDashboardPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/dashboard" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const user = {
  id: "u1",
  email: "owner@example.test",
  fullName: "Owner One",
  roleCode: "COMPANY_OWNER",
  allStores: true,
  status: "ACTIVE",
  mustChangePassword: false,
  storeIds: [],
  storeCodes: [],
};

function answerLikeTheServer(request: RecordedRequest) {
  const path = request.url.replace("/api/v1", "");
  if (path.startsWith("/stores")) return { body: [store] };
  if (path.startsWith("/users/creation-options")) return { body: { roles: ["STORE_MANAGER"], stores: [store], needsStore: true } };
  if (path.startsWith("/users")) return { body: [user] };
  return { status: 404, body: {} };
}

async function openDashboardAs(session: CurrentSessionResponse, handler = answerLikeTheServer) {
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  const requests = installFetchMock(handler);
  render(<CompanyDashboardPage />);
  return requests;
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("company dashboard", () => {
  it("shows the stores to every company user and never calls the user endpoints without the permission", async () => {
    const requests = await openDashboardAs(buildCompanyUserSession({ grantedPermissionCodes: [] }));
    expect(await screen.findByText("Main Store")).toBeInTheDocument();
    expect(screen.queryByText("Owner One")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create user" })).not.toBeInTheDocument();
    expect(requests.some((request) => request.url.includes("/users"))).toBe(false);
  });

  it("shows the people to someone who may view users, but not the add-user form", async () => {
    await openDashboardAs(buildCompanyUserSession({ grantedPermissionCodes: [PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW] }));
    expect(await screen.findByText("Owner One")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create user" })).not.toBeInTheDocument();
  });

  it("shows the add-user form to someone who may create users", async () => {
    await openDashboardAs(
      buildCompanyUserSession({
        grantedPermissionCodes: [PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW, PermissionCodes.USER_ACCOUNT.CREATE_USER.ADD],
      }),
    );
    expect(await screen.findByRole("button", { name: "Create user" })).toBeInTheDocument();
    expect(screen.getByText("Add a user")).toBeInTheDocument();
  });

  it("shows the saved copy with an offline banner when the server cannot be reached", async () => {
    const session = buildCompanyUserSession({ grantedPermissionCodes: [PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW] });
    await openDashboardAs(session);
    expect(await screen.findByText("Owner One")).toBeInTheDocument();
    document.body.innerHTML = "";

    const offline = installFetchMock(() => "network-failure");
    render(<CompanyDashboardPage />);
    expect(await screen.findByText(/You are working offline/)).toBeInTheDocument();
    expect(screen.getByText("Main Store")).toBeInTheDocument();
    expect(screen.getByText("Owner One")).toBeInTheDocument();
    expect(offline.length).toBeGreaterThan(0);
  });
});
