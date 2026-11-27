import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import snapshot from "@/lib/contracts/permissionCatalog.snapshot.json";
import { resetSidebarPreferenceStoreForTests } from "@/lib/layout/sidebarPreferenceStore";
import { installFetchMock } from "@/tests/support/fetchMock";
import { buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import { ApplicationNavigation } from "./ApplicationNavigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/products/view-products" }));

const everyPermissionCode = snapshot.modules.flatMap((module) =>
  module.screens.flatMap((screen) => screen.actions.map((action) => action.permissionCode)),
);

async function renderMenu(props: Parameters<typeof ApplicationNavigation>[0] = {}) {
  const session = buildCompanyUserSession({ grantedPermissionCodes: everyPermissionCode });
  await seedVerifiedSession(session, () => installFetchMock(() => ({ body: session })));
  return render(<ApplicationNavigation {...props} />);
}

beforeEach(async () => {
  await resetBrowserStateForTests();
  resetSidebarPreferenceStoreForTests();
});

describe("menu search", () => {
  it("filters the screens by name and hides the groups without a match", async () => {
    await renderMenu();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search the menu" }), "check pri");

    expect(screen.getByRole("link", { name: "Check Price" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Payment Voucher" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voucher" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Products" })).toBeInTheDocument();
  });

  it("shows every screen of a group whose name matches", async () => {
    await renderMenu();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search the menu" }), "voucher");

    expect(screen.getByRole("link", { name: "Payment Voucher" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Receipt Voucher" })).toBeInTheDocument();
  });

  it("opens a closed group while searching, even one that was closed by hand", async () => {
    await renderMenu();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search the menu" }), "payment voucher");
    expect(await screen.findByRole("link", { name: "Payment Voucher" })).toBeInTheDocument();
  });

  it("says when nothing matches, and clears with the button or Escape", async () => {
    await renderMenu();
    const searchBox = screen.getByRole("searchbox", { name: "Search the menu" });

    await userEvent.type(searchBox, "zzzzzz");
    expect(screen.getByRole("status")).toHaveTextContent("No menu item matches your search.");

    await userEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    expect(searchBox).toHaveValue("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await userEvent.type(searchBox, "price{Escape}");
    expect(searchBox).toHaveValue("");
  });
});

describe("menu groups", () => {
  it("opens the group of the page being shown and closes the others until the person opens them", async () => {
    await renderMenu();

    expect(screen.getByRole("button", { name: "Products" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "View Products" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voucher" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Payment Voucher" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Voucher" }));
    expect(await screen.findByRole("link", { name: "Payment Voucher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voucher" })).toHaveAttribute("aria-expanded", "true");
  });

  it("closes an open group and remembers the choice", async () => {
    const { unmount } = await renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Products" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "View Products" })).not.toBeInTheDocument());
    unmount();

    // the choice survives a new render of the menu (a page change or a reload)
    render(<ApplicationNavigation />);
    expect(screen.getByRole("button", { name: "Products" })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the current page and calls onNavigate when a link is used", async () => {
    const onNavigate = vi.fn();
    await renderMenu({ onNavigate });
    expect(screen.getByRole("link", { name: "View Products" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("link", { name: "New Product" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe("collapsed to icons", () => {
  it("shows only icon links with their names as labels and no search box", async () => {
    await renderMenu({ isCollapsed: true });

    const link = screen.getByRole("link", { name: "Payment Voucher" });
    expect(link).toHaveAttribute("title", "Payment Voucher");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voucher" })).not.toBeInTheDocument();
  });

  it("asks to expand the sidebar when the search icon is used", async () => {
    const onRequestExpand = vi.fn();
    await renderMenu({ isCollapsed: true, onRequestExpand });
    await userEvent.click(screen.getByRole("button", { name: "Search the menu" }));
    expect(onRequestExpand).toHaveBeenCalledTimes(1);
  });
});
