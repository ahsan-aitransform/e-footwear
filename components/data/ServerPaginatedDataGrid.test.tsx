import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import { ServerPaginatedDataGrid } from "./ServerPaginatedDataGrid";

type Row = { id: string; name: string };

const page = { items: [{ id: "1", name: "Sandal" }], page: 1, pageSize: 25, totalCount: 1 };

function grid(statusCode: string, onSearch?: () => void) {
  return (
    <ServerPaginatedDataGrid<Row>
      path="/things"
      columns={[{ key: "name", header: "Name", render: (row) => row.name }]}
      getRowKey={(row) => row.id}
      caption="Things"
      emptyTitle="Nothing"
      filters={{ statusCode }}
      onSearch={onSearch}
    />
  );
}

async function openGrid(statusCode: string, onSearch?: () => void) {
  const session = buildCompanyUserSession();
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : { body: page })));
  const requests: RecordedRequest[] = installFetchMock(() => ({ body: page }));
  const view = render(grid(statusCode, onSearch));
  await screen.findByText("Sandal");
  const listUrls = () => requests.filter((request) => request.url.includes("/things")).map((request) => request.url);
  return { view, listUrls };
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ServerPaginatedDataGrid searching", () => {
  it("asks the server for a typed text and a changed filter only when Search is pressed", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const { view, listUrls } = await openGrid("ACTIVE", onSearch);
    expect(listUrls()).toHaveLength(1);

    await user.type(screen.getByRole("searchbox"), "San");
    view.rerender(grid("INACTIVE", onSearch));
    // longer than the old pause after which typing used to search by itself
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(listUrls()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(listUrls()).toHaveLength(2));
    expect(listUrls()[1]).toContain("statusCode=INACTIVE");
    expect(listUrls()[1]).toContain("San");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("searches on Enter, and asks again when nothing changed", async () => {
    const user = userEvent.setup();
    const { listUrls } = await openGrid("ACTIVE");

    await user.type(screen.getByRole("searchbox"), "{Enter}");
    await waitFor(() => expect(listUrls()).toHaveLength(2));
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(listUrls()).toHaveLength(3));
  });
});
