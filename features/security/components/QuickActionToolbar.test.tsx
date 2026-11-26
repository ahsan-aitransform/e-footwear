import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock } from "@/tests/support/fetchMock";
import { buildCompanyUserSession, resetBrowserStateForTests, seedStoredSession } from "@/tests/support/sessionFixtures";
import { QuickActionToolbar } from "./QuickActionToolbar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

beforeEach(async () => {
  await resetBrowserStateForTests();
  await seedStoredSession(buildCompanyUserSession());
});
afterEach(() => vi.unstubAllGlobals());

// The beforeEach signs in a person with no permission; these tests need one who may open the Backup screen.
async function signInWithBackupPermission() {
  await resetBrowserStateForTests();
  await seedStoredSession(buildCompanyUserSession({ grantedPermissionCodes: [PermissionCodes.SETTINGS.BACKUP.VIEW] }));
}

describe("quick-action toolbar", () => {
  it("shows a button only when its screen exists and the person may open it", async () => {
    // DASHBOARD and NEW_SALE have no screen; BACKUP has one, and this person has its permission.
    await signInWithBackupPermission();
    installFetchMock(() => ({ body: { actionCodes: ["DASHBOARD", "NEW_SALE", "BACKUP"] } }));
    render(<QuickActionToolbar />);

    const backup = await screen.findByRole("link", { name: "Backup" });
    expect(backup).toHaveAttribute("href", ApplicationRoutes.backup);
    expect(screen.queryByRole("link", { name: "New sale" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("shows nothing when no button applies", async () => {
    installFetchMock(() => ({ body: { actionCodes: [] } }));
    const { container } = render(<QuickActionToolbar />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores a code this build does not know", async () => {
    await signInWithBackupPermission();
    installFetchMock(() => ({ body: { actionCodes: ["MAKE_COFFEE", "BACKUP"] } }));
    render(<QuickActionToolbar />);
    expect(await screen.findByRole("link", { name: "Backup" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
