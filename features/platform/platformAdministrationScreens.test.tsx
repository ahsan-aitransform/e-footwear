import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type MockedApiResponse, type RecordedRequest } from "@/tests/support/fetchMock";
import { buildPlatformAdministratorSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import { CompanySubscriptionPanel } from "./components/CompanySubscriptionPanel";
import { PlanForm } from "./components/PlanForm";

const COMPANY_ID = "0197c3a0-9999-7000-8000-000000000009";
const route = (request: RecordedRequest) => `${request.method} ${request.url.replace("/api/v1", "")}`;

async function renderAsPlatformAdministrator(handler: (request: RecordedRequest) => MockedApiResponse, element: React.ReactElement) {
  const session: CurrentSessionResponse = buildPlatformAdministratorSession();
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  const requests = installFetchMock(handler);
  render(element);
  return requests;
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("plan form", () => {
  it("refuses limits that are not whole numbers of 1 or more and sends nothing", async () => {
    const requests = await renderAsPlatformAdministrator(() => ({ status: 201 }), <PlanForm onSaved={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^Code/), "gold");
    await userEvent.type(screen.getByLabelText(/^Name/), "Gold plan");
    await userEvent.type(screen.getByLabelText(/^Maximum stores/), "0");
    await userEvent.type(screen.getByLabelText(/^Maximum users/), "50");
    await userEvent.click(screen.getByRole("button", { name: "Create plan" }));

    expect(await screen.findByText("The limits must be whole numbers of 1 or more.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("creates a plan with the code in capital letters", async () => {
    const onSaved = vi.fn();
    const requests = await renderAsPlatformAdministrator(() => ({ status: 201 }), <PlanForm onSaved={onSaved} />);

    await userEvent.type(screen.getByLabelText(/^Code/), "gold");
    await userEvent.type(screen.getByLabelText(/^Name/), "Gold plan");
    await userEvent.type(screen.getByLabelText(/^Maximum stores/), "10");
    await userEvent.type(screen.getByLabelText(/^Maximum users/), "100");
    await userEvent.click(screen.getByRole("button", { name: "Create plan" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(requests.find((request) => route(request) === "POST /platform/plans")!.body).toEqual({
      code: "GOLD",
      name: "Gold plan",
      maximumStores: 10,
      maximumUsers: 100,
    });
  });
});

describe("company subscription panel", () => {
  const detail = {
    profile: { id: COMPANY_ID, name: "Bata", legalName: null, ntn: null, strn: null, timezone: "Asia/Karachi", currencyCode: "PKR", roundingMode: "FLOOR", priceBandBasis: "LIST", invoiceText: null, planCode: "STANDARD", status: "ACTIVE", rowVersion: 1 },
    usage: { planCode: "STANDARD", planName: "Standard", maximumStores: 3, maximumUsers: 30, activeStores: 5, users: 2 },
  };
  const plans = [
    { code: "STANDARD", name: "Standard", maximumStores: 3, maximumUsers: 30, isActive: true, companyCount: 1 },
    { code: "RETIRED", name: "Old plan", maximumStores: 1, maximumUsers: 1, isActive: false, companyCount: 0 },
  ];
  const server = (request: RecordedRequest): MockedApiResponse => {
    const path = route(request);
    if (path === `GET /platform/companies/${COMPANY_ID}`) return { body: detail };
    if (path === "GET /platform/plans") return { body: plans };
    if (path === `POST /platform/companies/${COMPANY_ID}/status`) return { status: 204 };
    return { status: 404, body: {} };
  };

  it("shows the usage against the limits, warns when a company is over its plan and offers only assignable plans", async () => {
    await renderAsPlatformAdministrator(server, <CompanySubscriptionPanel companyId={COMPANY_ID} />);

    expect(await screen.findByText("Stores: 5 of 3")).toBeInTheDocument();
    expect(screen.getByText("Users: 2 of 30")).toBeInTheDocument();
    expect(screen.getByText(/uses more than its plan allows/)).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Old plan/ })).not.toBeInTheDocument();
  });

  it("asks for confirmation before suspending a company and sends the reason", async () => {
    const requests = await renderAsPlatformAdministrator(server, <CompanySubscriptionPanel companyId={COMPANY_ID} />);

    await userEvent.selectOptions(await screen.findByLabelText("Status"), "SUSPENDED");
    await userEvent.type(screen.getByLabelText("Reason"), "Unpaid invoice");
    await userEvent.click(screen.getByRole("button", { name: "Change status" }));

    expect(requests.some((request) => route(request).endsWith("/status"))).toBe(false);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Suspend or close this company?")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Change status" }));

    await waitFor(() => expect(requests.some((request) => route(request) === `POST /platform/companies/${COMPANY_ID}/status`)).toBe(true));
    expect(requests.find((request) => route(request).endsWith("/status"))!.body).toEqual({ status: "SUSPENDED", reason: "Unpaid invoice" });
  });
});
