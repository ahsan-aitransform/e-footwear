import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import type { UserCreationOptionsResponse } from "@/lib/types/user";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedStoredSession } from "@/tests/support/sessionFixtures";
import { UserEditorForm } from "./UserEditorForm";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push, replace: vi.fn() }) }));

const VIEW_USERS = PermissionCodes.USER_ACCOUNT.VIEW_USERS.VIEW;
const catalog: PermissionCatalogResponse = {
  modules: [
    {
      moduleCode: "USER_ACCOUNT",
      displayName: "User Account",
      screens: [
        {
          screenCode: "VIEW_USERS",
          displayName: "View Users",
          subGroupCode: null,
          actions: [{ permissionCode: VIEW_USERS, actionCode: "VIEW", displayName: "View" }],
        },
      ],
    },
  ],
};
const options: UserCreationOptionsResponse = {
  roles: ["STORE_MANAGER", "CASHIER_SALESMAN"],
  stores: [{ id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true }],
  needsStore: true,
};

const route = (request: RecordedRequest) => `${request.method} ${request.url.replace("/api/v1", "")}`;

beforeEach(async () => {
  await resetBrowserStateForTests();
  navigation.push.mockClear();
  await seedStoredSession(buildCompanyUserSession({ grantedPermissionCodes: [VIEW_USERS, PermissionCodes.USER_ACCOUNT.ROLES_AND_PERMISSIONS.VIEW] }));
});
afterEach(() => vi.unstubAllGlobals());

async function fillValidForm(password = "Password1") {
  await userEvent.type(screen.getByLabelText(/^Email/), "new.user@example.test");
  await userEvent.type(screen.getByLabelText(/^Full name/), "New User");
  await userEvent.selectOptions(screen.getByLabelText(/^Role/), "CASHIER_SALESMAN");
  await userEvent.type(screen.getByLabelText(/^Temporary password/), password);
  await userEvent.click(screen.getByRole("checkbox", { name: /MAIN · Main Store/ }));
}

describe("Create New User form", () => {
  it("shows the errors next to the fields and sends nothing when the form is empty", async () => {
    const requests = installFetchMock(() => ({ body: [] }));
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline />);

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("Enter the email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter the full name.")).toBeInTheDocument();
    expect(screen.getByText(/The password needs at least 8 characters/)).toBeInTheDocument();
    expect(screen.getByText("Choose at least one store.")).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("refuses a password without letters and digits before any request", async () => {
    const requests = installFetchMock(() => ({ body: [] }));
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline />);
    await fillValidForm("onlyletterspassword");

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("The password needs letters and digits.")).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("a store manager must have exactly one store", async () => {
    render(<UserEditorForm mode="create" creationOptions={{ ...options, stores: [...options.stores, { id: "s2", code: "SECOND", name: "Second", isHeadOffice: false, isActive: true }] }} catalog={catalog} canViewPermissions isOnline />);
    installFetchMock(() => ({ body: [] }));
    await userEvent.type(screen.getByLabelText(/^Email/), "m@example.test");
    await userEvent.type(screen.getByLabelText(/^Full name/), "Manager");
    await userEvent.type(screen.getByLabelText(/^Temporary password/), "Password1");
    await userEvent.click(screen.getByRole("checkbox", { name: /MAIN · Main Store/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /SECOND · Second/ }));

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText("A store manager heads exactly one store.")).toBeInTheDocument();
  });

  it("posts the user without a permission list when the tree was not touched (the server applies the role suggestion)", async () => {
    const requests = installFetchMock((request) => (route(request) === "POST /users" ? { status: 201, body: { id: "new-id" } } : { body: [] }));
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline />);
    await fillValidForm();

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(ApplicationRoutes.userEdit("new-id")));
    const post = requests.find((request) => route(request) === "POST /users")!;
    expect(post.body).toMatchObject({ email: "new.user@example.test", roleCode: "CASHIER_SALESMAN", storeIds: [TEST_STORE_ID], password: "Password1" });
    expect((post.body as Record<string, unknown>).permissionCodes).toBeUndefined();
  });

  it("posts the chosen permissions once the tree was changed", async () => {
    const requests = installFetchMock((request) => (route(request) === "POST /users" ? { status: 201, body: { id: "new-id" } } : { body: [] }));
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("checkbox", { name: "User Account" }));

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const post = requests.find((request) => route(request) === "POST /users")!;
    expect((post.body as { permissionCodes: string[] }).permissionCodes).toEqual([VIEW_USERS]);
  });

  it("shows the server's message when the email is already in use", async () => {
    installFetchMock((request) =>
      route(request) === "POST /users"
        ? { status: 409, body: { title: "Conflict", detail: "The email new.user@example.test is already in use.", errorCode: "CONFLICT" } }
        : { body: [] },
    );
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline />);
    await fillValidForm();

    await userEvent.click(screen.getByRole("button", { name: "Create user" }));

    expect(await screen.findByText(/is already in use/)).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is disabled offline and says so", () => {
    installFetchMock(() => ({ body: [] }));
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline={false} />);
    expect(screen.getByRole("button", { name: "Create user" })).toBeDisabled();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it("only offers the roles the server allows", () => {
    installFetchMock(() => ({ body: [] }));
    render(<UserEditorForm mode="create" creationOptions={options} catalog={catalog} canViewPermissions isOnline />);
    expect(screen.getAllByRole("option").map((option) => option.textContent).slice(0, 2)).toEqual(["Store manager", "Cashier / salesman"]);
  });
});
