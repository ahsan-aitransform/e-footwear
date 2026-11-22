import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { getSessionSnapshot } from "@/lib/session/sessionStore";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import {
  TEST_STORE_ID,
  buildCompanyUserSession,
  buildPlatformAdministratorSession,
  resetBrowserStateForTests,
  seedStoredSession,
} from "@/tests/support/sessionFixtures";
import type { UserCreationOptionsResponse } from "@/lib/types/user";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { CompanySignInForm } from "./components/CompanySignInForm";
import { CreateUserForm } from "./components/CreateUserForm";
import { PlatformAdministratorSignInForm } from "./components/PlatformAdministratorSignInForm";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), search: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  useSearchParams: () => navigation.search,
  usePathname: () => "/login",
}));

beforeEach(async () => {
  await resetBrowserStateForTests();
  navigation.replace.mockClear();
  navigation.push.mockClear();
  navigation.search = new URLSearchParams();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const route = (request: RecordedRequest) => `${request.method} ${request.url.replace("/api/v1", "")}`;

describe("company sign-in", () => {
  it("signs in, stores the session and goes to the dashboard, and does not leave the button spinning", async () => {
    const session = buildCompanyUserSession();
    const requests = installFetchMock((request) =>
      route(request) === "POST /auth/login" ? { body: { accessToken: "tok-1", mustChangePassword: false } } : { body: session },
    );
    render(<CompanySignInForm />);

    await userEvent.type(screen.getByLabelText(/Email/), "cashier@example.test");
    await userEvent.type(screen.getByLabelText(/Password/), "Secret#123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.companyDashboard));
    expect(requests.map(route)).toEqual(["POST /auth/login", "GET /auth/me"]);
    expect(requests[0].headers.authorization).toBeUndefined();
    expect(requests[0].body).toEqual({ email: "cashier@example.test", password: "Secret#123" });
    expect(requests[1].headers.authorization).toBe("Bearer tok-1");
    expect(getSessionSnapshot()).toMatchObject({ phase: "authenticated", verification: "verified" });
    // the regression fixed earlier: after a successful sign-in the button is idle again
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("sends a company user with a temporary password to the forced password change", async () => {
    const session = buildCompanyUserSession({ mustChangePassword: true });
    installFetchMock((request) =>
      route(request) === "POST /auth/login" ? { body: { accessToken: "tok", mustChangePassword: true } } : { body: session },
    );
    render(<CompanySignInForm />);
    await userEvent.type(screen.getByLabelText(/Email/), "new@example.test");
    await userEvent.type(screen.getByLabelText(/Password/), "temp-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.changePassword));
  });

  it("asks for both fields before calling the server", async () => {
    const requests = installFetchMock(() => ({ body: {} }));
    render(<CompanySignInForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email and password.");
    expect(requests).toHaveLength(0);
  });

  it("shows the server's message for a wrong password and stays on the page", async () => {
    installFetchMock(() => ({ status: 401, body: { detail: "Wrong email or password." } }));
    render(<CompanySignInForm />);
    await userEvent.type(screen.getByLabelText(/Email/), "a@b.test");
    await userEvent.type(screen.getByLabelText(/Password/), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password.");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("says that sign-in needs the server when the device is offline", async () => {
    installFetchMock(() => "network-failure");
    render(<CompanySignInForm />);
    await userEvent.type(screen.getByLabelText(/Email/), "a@b.test");
    await userEvent.type(screen.getByLabelText(/Password/), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No connection. Sign-in needs the server.");
  });

  it("shows the 'password changed' notice after a forced password change", () => {
    navigation.search = new URLSearchParams("changed=1");
    render(<CompanySignInForm />);
    expect(screen.getByRole("status")).toHaveTextContent("Password changed. Sign in with your new password.");
  });
});

describe("platform administrator sign-in", () => {
  it("signs in at the platform endpoint and goes to /platform", async () => {
    const session = buildPlatformAdministratorSession();
    const requests = installFetchMock((request) =>
      route(request) === "POST /platform/auth/login" ? { body: { accessToken: "admin.tok" } } : { body: session },
    );
    render(<PlatformAdministratorSignInForm />);
    await userEvent.type(screen.getByLabelText(/Username/), "superadmin");
    await userEvent.type(screen.getByLabelText(/Password/), "Example-Password-1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.platformCompanies));
    expect(requests[0].url).toBe("/api/v1/platform/auth/login");
  });

  it("refuses to submit without a username and password", async () => {
    const requests = installFetchMock(() => ({ body: {} }));
    render(<PlatformAdministratorSignInForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your username and password.");
    expect(requests).toHaveLength(0);
  });
});

describe("change password", () => {
  async function fill(current: string, next: string, repeat: string) {
    await userEvent.type(screen.getByLabelText(/^Current \(temporary\) password/), current);
    await userEvent.type(screen.getByLabelText(/^New password/), next);
    await userEvent.type(screen.getByLabelText(/^Repeat new password/), repeat);
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
  }

  it("checks length and confirmation before calling the server", async () => {
    const requests = installFetchMock(() => ({ status: 204 }));
    render(<ChangePasswordForm />);
    await fill("temp", "short", "short");
    expect(screen.getByRole("alert")).toHaveTextContent("at least 8 characters");
    expect(requests).toHaveLength(0);
  });

  it("rejects a confirmation that does not match", async () => {
    installFetchMock(() => ({ status: 204 }));
    render(<ChangePasswordForm />);
    await fill("temp", "longenough1", "longenough2");
    expect(screen.getByRole("alert")).toHaveTextContent("do not match");
  });

  it("changes the password, clears the session and sends the person to sign in again", async () => {
    await seedStoredSession(buildCompanyUserSession({ mustChangePassword: true }));
    const requests = installFetchMock(() => ({ status: 204 }));
    render(<ChangePasswordForm />);
    await fill("temp-pw", "brand-new-pw1", "brand-new-pw1");

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith(ApplicationRoutes.companySignInAfterPasswordChange));
    expect(requests[0]).toMatchObject({ method: "POST", url: "/api/v1/auth/change-password", body: { currentPassword: "temp-pw", newPassword: "brand-new-pw1" } });
    expect(requests[0].headers.authorization).toBe("Bearer test-access-token");
    expect(getSessionSnapshot().phase).toBe("anonymous");
  });
});

describe("create user", () => {
  const options: UserCreationOptionsResponse = {
    roles: ["STORE_MANAGER", "CASHIER_SALESMAN"],
    stores: [{ id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true }],
    needsStore: true,
  };

  it("offers only the roles and stores the server allows", () => {
    render(<CreateUserForm options={options} isOnline onCreated={vi.fn()} />);
    const roleOptions = screen.getAllByRole("option").map((option) => option.textContent);
    expect(roleOptions).toEqual(["Store manager", "Cashier / salesman"]);
    expect(screen.getByRole("checkbox", { name: /MAIN · Main Store/ })).toBeInTheDocument();
  });

  it("says so when the role cannot create users", () => {
    render(<CreateUserForm options={{ roles: [], stores: [], needsStore: false }} isOnline onCreated={vi.fn()} />);
    expect(screen.getByText("Your role cannot create users.")).toBeInTheDocument();
  });

  it("posts the user (with the company a platform administrator names) and reports success", async () => {
    const onCreated = vi.fn();
    const requests = installFetchMock(() => ({ status: 201, body: { id: "u1" } }));
    render(<CreateUserForm companyId="0197c3a0-5555-7000-8000-000000000005" options={options} isOnline onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/^Email/), "new.manager@example.test");
    await userEvent.type(screen.getByLabelText(/Full name/), "New Manager");
    await userEvent.type(screen.getByLabelText(/Temporary password/), "Temp#12345");
    await userEvent.click(screen.getByRole("checkbox", { name: /MAIN/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByRole("status")).toHaveTextContent("User created.");
    expect(requests[0].body).toEqual({
      companyId: "0197c3a0-5555-7000-8000-000000000005",
      email: "new.manager@example.test",
      fullName: "New Manager",
      roleCode: "STORE_MANAGER",
      storeIds: [TEST_STORE_ID],
      password: "Temp#12345",
    });
    expect(requests[0].headers["idempotency-key"]).toBeTruthy();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("shows the server's field errors next to the fields", async () => {
    installFetchMock(() => ({ status: 400, body: { detail: "Check the form.", errors: { Email: ["The email is already in use."] } } }));
    render(<CreateUserForm options={options} isOnline onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^Email/), "dup@example.test");
    await userEvent.type(screen.getByLabelText(/Full name/), "Dup");
    await userEvent.type(screen.getByLabelText(/Temporary password/), "Temp#12345");
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription(/already in use/));
  });

  it("is disabled offline, with an explanation", () => {
    render(<CreateUserForm options={options} isOnline={false} onCreated={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create user" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("You are offline.");
  });
});
