import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { installFetchMock } from "@/tests/support/fetchMock";
import { buildCompanyUserSession, resetBrowserStateForTests, seedStoredSession } from "@/tests/support/sessionFixtures";
import { QuickActionToolbar } from "./QuickActionToolbar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

beforeEach(async () => {
  await resetBrowserStateForTests();
  await seedStoredSession(buildCompanyUserSession());
});
afterEach(() => vi.unstubAllGlobals());

describe("quick-action toolbar", () => {
  it("shows a button only when its screen exists and the person may open it", async () => {
    // DASHBOARD has a screen without a permission; NEW_SALE has no screen yet; BACKUP's screen needs a permission this person lacks.
    installFetchMock(() => ({ body: { actionCodes: ["DASHBOARD", "NEW_SALE", "BACKUP"] } }));
    render(<QuickActionToolbar />);

    const dashboard = await screen.findByRole("link", { name: "Dashboard" });
    expect(dashboard).toHaveAttribute("href", ApplicationRoutes.companyDashboard);
    expect(screen.queryByRole("link", { name: "New sale" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Backup" })).toBeNull();
  });

  it("shows nothing when no button applies", async () => {
    installFetchMock(() => ({ body: { actionCodes: [] } }));
    const { container } = render(<QuickActionToolbar />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores a code this build does not know", async () => {
    installFetchMock(() => ({ body: { actionCodes: ["MAKE_COFFEE", "DASHBOARD"] } }));
    render(<QuickActionToolbar />);
    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
