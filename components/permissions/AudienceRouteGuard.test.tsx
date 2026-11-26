import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { SessionStorageKeys } from "@/lib/constants/browserStorageKeys";
import { getSessionSnapshot, initializeSession } from "@/lib/session/sessionStore";
import { installFetchMock } from "@/tests/support/fetchMock";
import {
  buildCompanyUserSession,
  buildPlatformAdministratorSession,
  resetBrowserStateForTests,
  seedStoredSession,
} from "@/tests/support/sessionFixtures";
import { AudienceRouteGuard } from "./AudienceRouteGuard";

const navigation = vi.hoisted(() => ({ pathname: "/", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
}));

const protectedContent = "SECRET-PAGE-CONTENT";

beforeEach(async () => {
  await resetBrowserStateForTests();
  navigation.replace.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderGuard(audience: "public" | "platformAdministrator" | "companyUser", pathname: string) {
  navigation.pathname = pathname;
  return render(
    <AudienceRouteGuard audience={audience}>
      <p>{protectedContent}</p>
    </AudienceRouteGuard>,
  );
}

describe("the route guard on /platform (the super-admin area)", () => {
  it("shows a loading state and NO page content while the session is being read and verified", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    // the server answers late: the content must not appear before it answers
    let answer: (value: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (answer = resolve))));

    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);

    expect(await screen.findByRole("status")).toHaveTextContent("Checking your session");
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();

    answer(new Response(JSON.stringify(buildPlatformAdministratorSession()), { status: 200 }));
    expect(await screen.findByText(protectedContent)).toBeInTheDocument();
  });

  it("lets a platform administrator in once the server confirmed them", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    installFetchMock(() => ({ body: buildPlatformAdministratorSession() }));
    renderGuard("platformAdministrator", ApplicationRoutes.platformDirectory);
    expect(await screen.findByText(protectedContent)).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("sends a company user back to their home page, never shows the page, and leaves a 'not authorised' notice", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ body: buildCompanyUserSession() }));
    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.home));
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(SessionStorageKeys.pendingAccessNotice)).toBe("accessNotice.notAuthorisedForPage");
  });

  it("TAMPERING: a company user who edits the stored session to say 'platform administrator' is still refused", async () => {
    // what is stored on the device (edited by the person) claims to be a platform administrator ...
    await seedStoredSession(buildPlatformAdministratorSession());
    // ... but the server knows the token belongs to a company user
    installFetchMock(() => ({ body: buildCompanyUserSession() }));

    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.home));
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
  });

  it("sends somebody who is not signed in to the platform sign-in page", async () => {
    await initializeSession();
    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.platformSignIn));
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
  });

  it("signs out and redirects when the server refuses the token", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    installFetchMock(() => ({ status: 401, body: { title: "Unauthorized" } }));
    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.platformSignIn));
    expect(getSessionSnapshot().phase).toBe("anonymous");
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
  });

  it("OFFLINE: keeps working from the stored session when the server cannot be reached", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    installFetchMock(() => "network-failure");
    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);
    expect(await screen.findByText(protectedContent)).toBeInTheDocument();
  });

  it("OFFLINE does not let a company user in either (the stored session says what they are)", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => "network-failure");
    renderGuard("platformAdministrator", ApplicationRoutes.platformCompanies);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.home));
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
  });
});

describe("the route guard on company routes", () => {
  it("sends a platform administrator to /platform", async () => {
    await seedStoredSession(buildPlatformAdministratorSession());
    installFetchMock(() => ({ body: buildPlatformAdministratorSession() }));
    renderGuard("companyUser", ApplicationRoutes.usersList);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.platformCompanies));
  });

  it("forces a company user with a temporary password to the password change", async () => {
    const session = buildCompanyUserSession({ mustChangePassword: true });
    await seedStoredSession(session);
    installFetchMock(() => ({ body: session }));
    renderGuard("companyUser", ApplicationRoutes.usersList);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.changePassword));
  });

  it("shows the page to a company user who may open it", async () => {
    const session = buildCompanyUserSession({ grantedPermissionCodes: [PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW] });
    await seedStoredSession(session);
    installFetchMock(() => ({ body: session }));
    renderGuard("companyUser", ApplicationRoutes.usersList);
    expect(await screen.findByText(protectedContent)).toBeInTheDocument();
  });

  it("shows the Access denied screen (not a blank page) for a path that is not registered", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ body: buildCompanyUserSession() }));
    renderGuard("companyUser", "/some-page-nobody-registered");
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
  });
});

describe("the route guard on public pages", () => {
  it("shows the sign-in page to somebody who is not signed in", async () => {
    await initializeSession();
    renderGuard("public", ApplicationRoutes.companySignIn);
    expect(await screen.findByText(protectedContent)).toBeInTheDocument();
  });

  it("sends a signed-in company user away from the platform sign-in page", async () => {
    await seedStoredSession(buildCompanyUserSession());
    installFetchMock(() => ({ body: buildCompanyUserSession() }));
    renderGuard("public", ApplicationRoutes.platformSignIn);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.home));
    expect(screen.queryByText(protectedContent)).not.toBeInTheDocument();
  });
});
