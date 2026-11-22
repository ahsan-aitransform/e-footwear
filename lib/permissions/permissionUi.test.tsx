import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock } from "@/tests/support/fetchMock";
import { buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import { requireAllPermissions, requireAnyPermission } from "./permissionChecks";
import { usePermissions } from "./usePermissions";
import { useSessionState } from "@/lib/session/useSessionState";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function signInWith(permissionCodes: string[]) {
  const session = buildCompanyUserSession({ grantedPermissionCodes: permissionCodes });
  await seedVerifiedSession(session, () => installFetchMock(() => ({ body: session })));
}

describe("usePermissions", () => {
  it("answers has / any / all from the signed-in person's granted permissions", async () => {
    await signInWith([PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW, PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW)).toBe(true);
    expect(result.current.hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.DELETE)).toBe(false);
    expect(result.current.hasAnyPermission([PermissionCodes.PRODUCTS.NEW_PRODUCT.DELETE, PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD])).toBe(true);
    expect(result.current.hasAllPermissions([PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW, PermissionCodes.PRODUCTS.NEW_PRODUCT.DELETE])).toBe(false);
  });

  it("grants nothing to somebody who is not signed in", async () => {
    const { result } = renderHook(() => ({ permissions: usePermissions(), session: useSessionState() }));
    expect(result.current.permissions.hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW)).toBe(false);
    expect(result.current.permissions.grantedPermissionCodes.size).toBe(0);
  });

  it("follows a permission the server takes away (the next verification replaces the stored list)", async () => {
    await signInWith([PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW)).toBe(true);

    installFetchMock(() => ({ body: buildCompanyUserSession({ grantedPermissionCodes: [] }) }));
    const { verifySessionWithServer } = await import("@/lib/session/sessionStore");
    await verifySessionWithServer();
    await waitFor(() => expect(result.current.hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW)).toBe(false));
  });
});

describe("PermissionGate", () => {
  it("shows its children only with the permission, otherwise the fallback", async () => {
    await signInWith([PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD]);
    render(
      <>
        <PermissionGate requirement={requireAnyPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD)}>
          <button>New product</button>
        </PermissionGate>
        <PermissionGate requirement={requireAnyPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.DELETE)} fallback={<span>no delete</span>}>
          <button>Delete product</button>
        </PermissionGate>
      </>,
    );
    expect(screen.getByRole("button", { name: "New product" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete product" })).not.toBeInTheDocument();
    expect(screen.getByText("no delete")).toBeInTheDocument();
  });
});

describe("PermissionGuard", () => {
  it("shows the Access denied screen with the missing permission when the permission is absent", async () => {
    await signInWith([PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW]);
    render(
      <PermissionGuard requirement={requireAllPermissions(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW, PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD)}>
        <p>tab content</p>
      </PermissionGuard>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.getByText(/PRODUCTS\.NEW_PRODUCT\.ADD/)).toBeInTheDocument();
    expect(screen.queryByText("tab content")).not.toBeInTheDocument();
  });

  it("shows the content when the permissions are there", async () => {
    await signInWith([PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW]);
    render(
      <PermissionGuard requirement={requireAnyPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.VIEW)}>
        <p>tab content</p>
      </PermissionGuard>,
    );
    expect(screen.getByText("tab content")).toBeInTheDocument();
  });
});
