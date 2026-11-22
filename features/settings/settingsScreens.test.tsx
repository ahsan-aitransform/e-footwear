import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { installFetchMock, type MockedApiResponse, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import { CompanyLogoPanel } from "./components/CompanyLogoPanel";
import { BusinessInfoAndPreferencesPage } from "./pages/BusinessInfoAndPreferencesPage";
import { DocumentNumberingPage } from "./pages/DocumentNumberingPage";
import { PaymentMethodsPage } from "./pages/PaymentMethodsPage";
import { StoreManagementPage } from "./pages/StoreManagementPage";

const noValues = { businessName: "Shoe Zone", barcodeName: null, businessNameUrdu: null, phoneNumber: null, mobileNumber: null, email: null, addressEnglish: null, addressUrdu: null, invoiceText: null };
const store = { id: TEST_STORE_ID, code: "S1", name: "First Store", isHeadOffice: false, isActive: true };

const route = (request: RecordedRequest) => `${request.method} ${request.url.replace("/api/v1", "")}`;
const sessionWith = (...grantedPermissionCodes: string[]) => buildCompanyUserSession({ grantedPermissionCodes });

async function renderAs(session: CurrentSessionResponse, handler: (request: RecordedRequest) => MockedApiResponse, element: React.ReactElement) {
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

describe("Preference screen (Business Info)", () => {
  function serverForBusinessInfo(request: RecordedRequest): MockedApiResponse {
    const path = route(request);
    if (path === "GET /stores") return { body: [store] };
    if (path === "GET /settings/business-info") return { body: { values: noValues, rowVersion: 0, isStored: false } };
    if (path === "PUT /settings/business-info") return { body: { values: noValues, rowVersion: 1, isStored: true } };
    if (path === `GET /settings/stores/${TEST_STORE_ID}/business-info`) {
      return { body: { overrides: { ...noValues, businessName: null }, effective: noValues, rowVersion: 0, isStored: false } };
    }
    return { status: 404, body: {} };
  }

  it("shows what was never configured and offers no save button to someone who may only view", async () => {
    await renderAs(sessionWith(PermissionCodes.SETTINGS.PREFERENCE.VIEW), serverForBusinessInfo, <BusinessInfoAndPreferencesPage />);

    expect(await screen.findByText("Not configured")).toBeInTheDocument();
    expect(screen.getByText("You can view these settings but not change them.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("saves the changed fields with the version it loaded, sending empty fields as null", async () => {
    const requests = await renderAs(
      sessionWith(PermissionCodes.SETTINGS.PREFERENCE.VIEW, PermissionCodes.SETTINGS.PREFERENCE.EDIT),
      serverForBusinessInfo,
      <BusinessInfoAndPreferencesPage />,
    );

    await userEvent.type(await screen.findByLabelText("Name on barcode labels"), "  SZ  ");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(requests.some((request) => route(request) === "PUT /settings/business-info")).toBe(true));
    const put = requests.find((request) => route(request) === "PUT /settings/business-info")!;
    expect(put.body).toEqual({
      values: { ...noValues, barcodeName: "SZ" },
      expectedRowVersion: 0,
    });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("edits only the overrides of a chosen store: the business name field is not offered there", async () => {
    const requests = await renderAs(
      sessionWith(PermissionCodes.SETTINGS.PREFERENCE.VIEW, PermissionCodes.SETTINGS.PREFERENCE.EDIT),
      serverForBusinessInfo,
      <BusinessInfoAndPreferencesPage />,
    );
    expect(await screen.findByRole("textbox", { name: "Business name" })).toBeInTheDocument();

    await userEvent.selectOptions(await screen.findByLabelText("Applies to"), TEST_STORE_ID);

    await waitFor(() => expect(requests.some((request) => route(request) === `GET /settings/stores/${TEST_STORE_ID}/business-info`)).toBe(true));
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Business name" })).not.toBeInTheDocument());
    expect(screen.getByText(/Values of this store/)).toBeInTheDocument();
  });
});

describe("Payment Methods screen", () => {
  it("switches a method off and saves all five", async () => {
    const methods = ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"].map((code, index) => ({
      code,
      isEnabled: true,
      displayNameEnglish: null,
      displayNameUrdu: null,
      sortOrder: index,
    }));
    const requests = await renderAs(
      sessionWith(PermissionCodes.SETTINGS.PAYMENT_METHODS.VIEW, PermissionCodes.SETTINGS.PAYMENT_METHODS.EDIT),
      (request) =>
        route(request) === "GET /settings/payment-methods"
          ? { body: { values: { methods }, rowVersion: 0, isStored: false } }
          : { body: { values: { methods }, rowVersion: 1, isStored: true } },
      <PaymentMethodsPage />,
    );

    await userEvent.click(await screen.findByRole("checkbox", { name: "Card: Offered" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(requests.some((request) => route(request) === "PUT /settings/payment-methods")).toBe(true));
    const put = requests.find((request) => route(request) === "PUT /settings/payment-methods")!;
    const sent = (put.body as { values: { methods: { code: string; isEnabled: boolean }[] } }).values.methods;
    expect(sent).toHaveLength(5);
    expect(sent.find((method) => method.code === "CARD")?.isEnabled).toBe(false);
    expect(sent.filter((method) => method.isEnabled)).toHaveLength(4);
  });
});

describe("Store Management screen", () => {
  const stores = [
    { id: "00000000-0000-0000-0000-000000000000", code: "HO", name: "Head Office", isHeadOffice: true, isActive: true, address: null, phone: null, rowVersion: 1 },
    { ...store, address: "Mall Road", phone: null, rowVersion: 3 },
  ];
  const usage = { planCode: "STANDARD", planName: "Standard", maximumStores: 3, maximumUsers: 30, activeStores: 1, users: 1 };
  const server = (request: RecordedRequest): MockedApiResponse => {
    const path = route(request);
    if (path === "GET /store-management") return { body: stores };
    if (path === "GET /store-management/plan-usage") return { body: usage };
    if (path === "POST /store-management") return { status: 201, body: { id: "new-store" } };
    if (path.endsWith("/deactivate")) return { status: 204 };
    return { status: 404, body: {} };
  };

  it("shows the plan usage and no create form or edit button to someone who may only view", async () => {
    await renderAs(sessionWith(PermissionCodes.SETTINGS.STORE_MANAGEMENT.VIEW), server, <StoreManagementPage />);

    expect(await screen.findByText("Plan Standard: 1 of 3 stores and 1 of 30 users in use.")).toBeInTheDocument();
    expect(await screen.findByText("First Store", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Add a store")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("creates a store and asks for confirmation before deactivating one", async () => {
    const requests = await renderAs(
      sessionWith(
        PermissionCodes.SETTINGS.STORE_MANAGEMENT.VIEW,
        PermissionCodes.SETTINGS.STORE_MANAGEMENT.ADD,
        PermissionCodes.SETTINGS.STORE_MANAGEMENT.EDIT,
        PermissionCodes.SETTINGS.STORE_MANAGEMENT.DELETE,
      ),
      server,
      <StoreManagementPage />,
    );

    await userEvent.type(await screen.findByLabelText(/^Code/), "NEW1");
    await userEvent.type(screen.getByLabelText(/^Name/), "New Store");
    await userEvent.click(screen.getByRole("button", { name: "Add store" }));
    await waitFor(() => expect(requests.some((request) => route(request) === "POST /store-management")).toBe(true));
    expect(requests.find((request) => route(request) === "POST /store-management")!.body).toEqual({
      code: "NEW1",
      name: "New Store",
      address: null,
      phone: null,
    });

    await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(requests.some((request) => route(request).endsWith("/deactivate"))).toBe(false);
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(requests.some((request) => route(request) === `POST /store-management/${TEST_STORE_ID}/deactivate`)).toBe(true));
  });
});

describe("Document Numbering screen", () => {
  it("moves a series forward with the number typed", async () => {
    const series = [
      { storeId: TEST_STORE_ID, seriesCode: "SALE_INVOICE", periodKey: "1900-01-01", nextValue: 1, isStored: false },
      { storeId: TEST_STORE_ID, seriesCode: "PAYMENT_VOUCHER", periodKey: "1900-01-01", nextValue: 41, isStored: true },
    ];
    const requests = await renderAs(
      sessionWith(PermissionCodes.SETTINGS.DOCUMENT_NUMBERING.VIEW, PermissionCodes.SETTINGS.DOCUMENT_NUMBERING.EDIT),
      (request) => {
        const path = route(request);
        if (path === "GET /stores") return { body: [store] };
        if (path.startsWith("GET /document-numbering")) return { body: series };
        if (path === "PUT /document-numbering") return { status: 204 };
        return { status: 404, body: {} };
      },
      <DocumentNumberingPage />,
    );

    const input = await screen.findByLabelText("Sale invoice: New next number");
    await userEvent.clear(input);
    await userEvent.type(input, "900");
    await userEvent.click(screen.getAllByRole("button", { name: "Set" })[0]);

    await waitFor(() => expect(requests.some((request) => route(request) === "PUT /document-numbering")).toBe(true));
    expect(requests.find((request) => route(request) === "PUT /document-numbering")!.body).toEqual({
      storeId: TEST_STORE_ID,
      seriesCode: "SALE_INVOICE",
      nextValue: 900,
    });
  });

  it("shows the series without any input to someone who may only view", async () => {
    await renderAs(
      sessionWith(PermissionCodes.SETTINGS.DOCUMENT_NUMBERING.VIEW),
      (request) => (route(request) === "GET /stores" ? { body: [store] } : { body: [{ storeId: TEST_STORE_ID, seriesCode: "SALE_INVOICE", periodKey: "1900-01-01", nextValue: 7, isStored: true }] }),
      <DocumentNumberingPage />,
    );
    expect(await screen.findByText("Sale invoice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set" })).not.toBeInTheDocument();
  });
});

describe("Company logo", () => {
  it("refuses a file that is not a picture before anything is sent", async () => {
    const requests = await renderAs(
      sessionWith(PermissionCodes.SETTINGS.COMPANY_PROFILE.EDIT),
      (request) => (route(request).includes("company-logo/information") ? { status: 204 } : { status: 404, body: {} }),
      <CompanyLogoPanel canEdit />,
    );
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(await screen.findByLabelText("Choose a new logo"), new File(["not a picture"], "notes.txt", { type: "text/plain" }));

    expect(await screen.findByText("Only PNG, JPEG or WEBP images are accepted.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "PUT")).toBe(false);
  });

  it("shows no upload control to someone who may not edit the profile", async () => {
    await renderAs(sessionWith(), () => ({ status: 204 }), <CompanyLogoPanel canEdit={false} />);
    expect(await screen.findByText("No logo yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Choose a new logo")).not.toBeInTheDocument();
  });
});
