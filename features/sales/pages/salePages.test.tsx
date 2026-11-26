import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock, type MockedApiResponse, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { CurrentSessionResponse } from "@/lib/types/session";
import type {
  ReturnableInvoiceResponse,
  SaleEntryContextResponse,
  SaleInvoiceListItemResponse,
  SaleInvoiceResponse,
  SaleItemResponse,
} from "../types/saleTypes";
import { ExchangeInvoicePage } from "./ExchangeInvoicePage";
import { NewSalePage } from "./NewSalePage";
import { SaleReturnPage } from "./SaleReturnPage";
import { ViewDeletedInvoicesPage } from "./ViewDeletedInvoicesPage";
import { ViewInvoicesPage } from "./ViewInvoicesPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/sales/new-sale" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const cashAccountId = "0197c3a0-bbbb-7000-8000-000000000002";

const entryContext: SaleEntryContextResponse = {
  storeId: TEST_STORE_ID,
  storeName: "Main Store",
  businessDate: "2026-11-20",
  nextInvoiceNumber: 5,
  nextDailyBillNumber: 1,
  nextReturnInvoiceNumber: 3,
  todaySaleAmount: 0,
  roundingModeCode: "FLOOR",
  maximumManualDiscountPercentage: null,
  paymentMethods: [{ code: "CASH", displayNameEnglish: "Cash", displayNameUrdu: null }],
  businessHeader: { businessName: "Demo Footwear", businessNameUrdu: null, storeName: "Main Store", phoneNumber: null, mobileNumber: null, email: null, addressEnglish: null, addressUrdu: null, invoiceText: null, hasLogo: false },
  printDefaults: { printFormatCode: "THERMAL", printLanguageCode: "en", printRightToLeft: false, printLogoOnDocuments: true, receiptCopies: 1 },
};

const sandal: SaleItemResponse = {
  variantId: "variant-1",
  productId: "product-1",
  productCode: "P-1",
  productName: "Gents Sandal",
  productNameUrdu: null,
  unitName: "Pair",
  sizeCode: "42",
  colorName: null,
  barcode: "8901",
  stockQuantity: 10,
  listPrice: 1000,
  suggestedUnitPrice: 1000,
  promotionDiscountPerUnit: 0,
  hasPromotionConflict: false,
  taxRatePercentage: 0,
  hasPicture: false,
};

const postedInvoice: SaleInvoiceResponse = {
  id: "invoice-1",
  storeId: TEST_STORE_ID,
  storeName: "Main Store",
  documentTypeCode: "SALE",
  invoiceNumber: 5,
  dailyBillNumber: 1,
  saleDate: "2026-11-20",
  occurredAt: "2026-11-20T10:00:00Z",
  customerId: null,
  customerName: "Cash Sale",
  walkInCustomerName: null,
  walkInCustomerMobile: null,
  salesmanStaffId: null,
  salesmanName: null,
  posTerminalLabel: null,
  description: null,
  grossAmount: 2000,
  discountAmount: 0,
  taxAmount: 0,
  netAmount: 2000,
  paidAmount: 2500,
  cashReturnedAmount: 500,
  outstandingAmount: 0,
  statusCode: "POSTED",
  voidReason: null,
  voidedAt: null,
  voidedByName: null,
  createdByName: "Test Cashier",
  originalInvoiceId: null,
  originalInvoiceNumber: null,
  relatedInvoiceId: null,
  relatedInvoiceNumber: null,
  replacesInvoiceId: null,
  replacesInvoiceNumber: null,
  rowVersion: 1,
  lines: [
    {
      lineId: "line-1",
      lineNumber: 1,
      variantId: "variant-1",
      productId: "product-1",
      productCode: "P-1",
      productName: "Gents Sandal",
      productNameUrdu: null,
      unitName: "Pair",
      sizeCode: "42",
      barcode: "8901",
      quantity: 2,
      listPrice: 1000,
      unitPrice: 1000,
      discountPerUnit: 0,
      discountPercent: 0,
      discountAmount: 0,
      netAmount: 2000,
      discountSourceCode: "NONE",
      originalLineId: null,
      originalInvoiceNumber: null,
      returnReason: null,
      itemConditionCode: null,
    },
  ],
  payments: [{ id: "payment-1", paymentMethodCode: "CASH", paymentAccountId: cashAccountId, paymentAccountTitle: "Cash in hand", amount: 2000, referenceNumber: null }],
};

const returnableInvoice: ReturnableInvoiceResponse = {
  invoiceId: "invoice-1",
  invoiceNumber: 5,
  storeId: TEST_STORE_ID,
  saleDate: "2026-11-20",
  customerId: null,
  customerName: null,
  walkInCustomerName: null,
  lines: [
    {
      lineId: "line-1",
      lineNumber: 1,
      invoiceId: "invoice-1",
      invoiceNumber: 5,
      variantId: "variant-1",
      productCode: "P-1",
      productName: "Gents Sandal",
      productNameUrdu: null,
      unitName: "Pair",
      sizeCode: "42",
      barcode: "8901",
      soldQuantity: 3,
      alreadyReturnedQuantity: 1,
      returnableQuantity: 2,
      listPrice: 1000,
      unitPrice: 1000,
      discountPerUnit: 0,
      discountPercent: 0,
    },
  ],
};

const listItem: SaleInvoiceListItemResponse = {
  id: "invoice-1",
  storeId: TEST_STORE_ID,
  storeName: "Main Store",
  documentTypeCode: "SALE",
  invoiceNumber: 5,
  dailyBillNumber: 1,
  saleDate: "2026-11-20",
  customerName: null,
  walkInCustomerName: "Walk-in Ali",
  salesmanName: null,
  netAmount: 2000,
  paidAmount: 2000,
  outstandingAmount: 0,
  statusCode: "POSTED",
  isPartOfExchange: false,
  voidReason: null,
  voidedAt: null,
  voidedByName: null,
};

type Handler = (request: RecordedRequest) => MockedApiResponse | "network-failure";

function pathOf(request: RecordedRequest): string {
  return request.url.replace("/api/v1", "").split("?")[0];
}

function baseServer(extra: Handler = () => ({ status: 404, body: {} })): Handler {
  return (request) => {
    const path = pathOf(request);
    if (path === "/stores" || path.startsWith("/stores/")) return { body: [store] };
    if (path.endsWith("/entry-context")) return { body: entryContext };
    if (path.endsWith("/payment-accounts")) return { body: [{ accountId: cashAccountId, code: "CASH-S1", title: "Cash in hand", kindCode: "CASH", storeId: TEST_STORE_ID }] };
    if (path.endsWith("/salesmen") || path.endsWith("/pos-terminals") || path.endsWith("/customers")) return { body: [] };
    return extra(request);
  };
}

async function openScreen(permissionCodes: string[], handler: Handler, screenElement: React.ReactElement) {
  const session: CurrentSessionResponse = buildCompanyUserSession({ grantedPermissionCodes: permissionCodes });
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  const requests = installFetchMock(handler);
  render(screenElement);
  return requests;
}

const P = PermissionCodes;
const sellerPermissions = [
  P.INVOICE.NEW_SALE.VIEW,
  P.INVOICE.NEW_SALE.ADD,
  P.INVOICE.NEW_SALE.PRINT,
  P.RESTRICTED_OPERATIONS.SALES.SALE_CREATE,
];

async function scanItem(user: ReturnType<typeof userEvent.setup>, barcode = "8901") {
  await user.type(screen.getByLabelText(/Bar Code/), `${barcode}{Enter}`);
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("New Sale screen", () => {
  const server = baseServer((request) => {
    const path = pathOf(request);
    if (path === "/sales/new-sale/items/by-barcode") return { body: sandal };
    if (path === "/sales/new-sale" && request.method === "POST") return { status: 201, body: postedInvoice };
    return { status: 404, body: {} };
  });

  it("shows the numbers of the day and an empty grid", async () => {
    await openScreen(sellerPermissions, server, <NewSalePage />);
    expect(await screen.findByDisplayValue("5")).toBeInTheDocument();
    expect(screen.getByText(/Scan or search an item/)).toBeInTheDocument();
    expect(screen.getByTestId("sale-net-bill")).toHaveTextContent("Rs 0");
  });

  it("adds a scanned item, increases the quantity on a second scan and updates the totals", async () => {
    const user = userEvent.setup();
    await openScreen(sellerPermissions, server, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await scanItem(user);
    expect(await screen.findByText("Gents Sandal")).toBeInTheDocument();
    expect(screen.getByTestId("sale-net-bill")).toHaveTextContent("Rs 1,000");

    await scanItem(user);
    await waitFor(() => expect(screen.getByTestId("sale-net-bill")).toHaveTextContent("Rs 2,000"));
    expect(within(screen.getByTestId("sale-lines-table")).getAllByRole("row")).toHaveLength(2); // header + one line
  });

  it("tells the cashier when a barcode is not found and keeps the grid", async () => {
    const user = userEvent.setup();
    const notFoundServer = baseServer((request) => (pathOf(request).endsWith("/by-barcode") ? { status: 404, body: { detail: "No active item has this barcode." } } : { status: 404, body: {} }));
    await openScreen(sellerPermissions, notFoundServer, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await scanItem(user, "0000");
    expect(await screen.findByText("No active item has this barcode.")).toBeInTheDocument();
  });

  it("F2 puts the cursor in the barcode box", async () => {
    const user = userEvent.setup();
    await openScreen(sellerPermissions, server, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await user.click(screen.getByLabelText(/Dis %|Description/, { selector: "input" }));
    await user.keyboard("{F2}");
    expect(screen.getByLabelText(/Bar Code/)).toHaveFocus();
  });

  it("saves with the kept payment, the change and the client transaction id, and shows the confirmation", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sellerPermissions, server, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await scanItem(user);
    await scanItem(user);
    await screen.findByText("Gents Sandal");
    await user.click(screen.getByRole("button", { name: "Add payment" }));
    await user.type(screen.getByLabelText(/Cash Received/), "2500");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/Invoice 5 saved/)).toBeInTheDocument();
    const post = requests.find((request) => request.method === "POST" && pathOf(request) === "/sales/new-sale");
    expect(post).toBeDefined();
    const body = post?.body as Record<string, unknown>;
    expect(body.cashReturnedAmount).toBe(500);
    expect(body.payments).toEqual([{ paymentMethodCode: "CASH", paymentAccountId: cashAccountId, amount: 2000, referenceNumber: null }]);
    expect(body.lines).toEqual([{ variantId: "variant-1", quantity: 2, unitPrice: 1000, discountTypeCode: null, discountValue: null }]);
    expect(typeof body.clientTransactionId).toBe("string");
    expect(post?.headers["idempotency-key"]).toBe(body.clientTransactionId);
    // the entry is cleared for the next customer
    expect(screen.getByTestId("sale-net-bill")).toHaveTextContent("Rs 0");
  });

  it("adds a customer in a dialog, chooses them and shows their purchase history", async () => {
    const user = userEvent.setup();
    const otherRequests = baseServer((request) => {
      const path = pathOf(request);
      if (path === "/sales/new-sale/customers/customer-1/purchases") {
        const invoice = {
          invoiceId: "invoice-1", storeName: "Main Store", documentTypeCode: "SALE", invoiceNumber: 4, saleDate: "2026-11-19",
          netAmount: 1000, paidAmount: 1000, outstandingAmount: 0,
          lines: [{ lineId: "line-1", productName: "Gents Sandal", sizeCode: "42", colorName: null, quantity: 1, unitPrice: 1000, netAmount: 1000 }],
        };
        return { body: { items: [invoice], page: 1, pageSize: 10, totalCount: 1 } };
      }
      if (path === "/cities/options") return { body: [] };
      return { status: 404, body: {} };
    });
    // Answered first: the base server treats every path that ends with "/customers" as the customer search.
    const customerServer: Handler = (request) =>
      pathOf(request) === "/customers" && request.method === "POST" ? { status: 201, body: { id: "customer-1" } } : otherRequests(request);
    const requests = await openScreen([...sellerPermissions, P.CUSTOMERS.NEW_CUSTOMER.ADD], customerServer, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await user.click(screen.getByRole("button", { name: "Add a new customer" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Customer type/)).toHaveValue("REGULAR");
    expect(within(dialog).queryByLabelText(/Status|Opening balance/)).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByText("Type a name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Type a mobile number.")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^Name/), "Ali Khan");
    await user.type(within(dialog).getByLabelText(/^Mobile/), "0300 1234567");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByTestId("sale-selected-customer")).toHaveTextContent("Ali Khan");
    const post = requests.find((request) => request.method === "POST" && pathOf(request) === "/customers");
    expect(post?.body).toMatchObject({ name: "Ali Khan", phone: "0300 1234567", customerTypeCode: "REGULAR", statusCode: "ACTIVE", cnic: null, openingBalance: null });

    await user.click(screen.getByRole("button", { name: "Purchase history" }));
    const history = await screen.findByRole("dialog", { name: "Purchase history of Ali Khan" });
    expect(await within(history).findByText("Invoice 4")).toBeInTheDocument();
    expect(within(history).getByText("Gents Sandal")).toBeInTheDocument();
  });

  it("refuses to save an unpaid bill without a customer and says why", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(sellerPermissions, server, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await scanItem(user);
    await screen.findByText("Gents Sandal");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Choose a customer to put it on credit/)).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("says plainly that the sale is NOT saved when the connection is lost, keeps the entry and retries with the same client transaction id", async () => {
    const user = userEvent.setup();
    let failNext = true;
    const flakyServer = baseServer((request) => {
      const path = pathOf(request);
      if (path === "/sales/new-sale/items/by-barcode") return { body: sandal };
      if (path === "/sales/new-sale" && request.method === "POST") {
        if (failNext) {
          failNext = false;
          return "network-failure";
        }
        return { status: 201, body: postedInvoice };
      }
      return { status: 404, body: {} };
    });
    const requests = await openScreen(sellerPermissions, flakyServer, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await scanItem(user);
    await screen.findByText("Gents Sandal");
    await user.click(screen.getByRole("button", { name: "Add payment" }));
    await user.type(screen.getByLabelText(/Cash Received/), "1000");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/NOT SAVED/)).toBeInTheDocument();
    expect(screen.getByText("Gents Sandal")).toBeInTheDocument();
    expect(screen.getByTestId("sale-net-bill")).toHaveTextContent("Rs 1,000");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Invoice 5 saved/)).toBeInTheDocument();
    const posts = requests.filter((request) => request.method === "POST" && pathOf(request) === "/sales/new-sale");
    expect(posts).toHaveLength(2);
    expect((posts[0].body as { clientTransactionId: string }).clientTransactionId).toBe((posts[1].body as { clientTransactionId: string }).clientTransactionId);
    expect(posts[0].headers["idempotency-key"]).toBe(posts[1].headers["idempotency-key"]);
  });

  it("without the price and discount permissions the cashier cannot edit the price or the discount", async () => {
    const user = userEvent.setup();
    await openScreen(sellerPermissions, server, <NewSalePage />);
    await screen.findByDisplayValue("5");
    await scanItem(user);
    await screen.findByText("Gents Sandal");
    const grid = screen.getByTestId("sale-lines-table");
    expect(within(grid).getByLabelText("Price")).toBeDisabled();
    expect(within(grid).getByLabelText("Dis %")).toBeDisabled();
    expect(within(grid).getByLabelText("Disc/Unit")).toBeDisabled();
    expect(within(grid).getByLabelText("Qty")).toBeEnabled();
  });

  it("with the permissions the price and discount cells can be edited", async () => {
    const user = userEvent.setup();
    await openScreen(
      [...sellerPermissions, P.INVOICE.NEW_SALE.CHANGE_SELLING_PRICE, P.INVOICE.NEW_SALE.GIVE_DISCOUNT, P.RESTRICTED_OPERATIONS.SALES.PRICE_CHANGE, P.RESTRICTED_OPERATIONS.SALES.DISCOUNT_MANUAL],
      server,
      <NewSalePage />,
    );
    await screen.findByDisplayValue("5");
    await scanItem(user);
    await screen.findByText("Gents Sandal");
    const grid = screen.getByTestId("sale-lines-table");
    await user.type(within(grid).getByLabelText("Dis %"), "10");
    await waitFor(() => expect(screen.getByTestId("sale-net-bill")).toHaveTextContent("Rs 900"));
  });

  it("a person who may view but not add sees the screen with Save disabled", async () => {
    await openScreen([P.INVOICE.NEW_SALE.VIEW], server, <NewSalePage />);
    expect(await screen.findByText(/not allowed to save a sale/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save & Print" })).not.toBeInTheDocument();
  });

  it("offers Save & Print and the gate pass only to people who may print", async () => {
    await openScreen(sellerPermissions, server, <NewSalePage />);
    expect(await screen.findByRole("button", { name: "Save & Print" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Print Gate Pass" })).toBeInTheDocument();
  });
});

describe("Sale Return screen", () => {
  const returnPermissions = [P.INVOICE.SALE_RETURN.VIEW, P.INVOICE.SALE_RETURN.ADD, P.RESTRICTED_OPERATIONS.SALES.SALE_RETURN];
  const server = baseServer((request) => {
    const path = pathOf(request);
    if (path === "/sales/sale-returns/invoice-by-number") return { body: returnableInvoice };
    if (path === "/sales/sale-returns" && request.method === "POST") return { status: 201, body: { ...postedInvoice, documentTypeCode: "RETURN", netAmount: -1000, invoiceNumber: 3 } };
    return { status: 404, body: {} };
  });

  async function findInvoiceFive(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByDisplayValue("3");
    await user.type(screen.getByLabelText(/Original invoice #/), "5{Enter}");
    await screen.findByText("Gents Sandal");
  }

  it("lists what is still returnable and marks a quantity above the limit", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(returnPermissions, server, <SaleReturnPage />);
    await findInvoiceFive(user);
    expect(screen.getByTestId("returned-items-section")).toHaveTextContent("Can return");

    await user.type(screen.getByLabelText("Return quantity of Gents Sandal"), "3");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/more than what can still be returned/)).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("asks for a quantity when nothing is chosen", async () => {
    const user = userEvent.setup();
    await openScreen(returnPermissions, server, <SaleReturnPage />);
    await findInvoiceFive(user);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Enter the quantity of at least one item/)).toBeInTheDocument();
  });

  it("posts a valid return against the original line with the reason and condition", async () => {
    const user = userEvent.setup();
    const requests = await openScreen(returnPermissions, server, <SaleReturnPage />);
    await findInvoiceFive(user);
    await user.type(screen.getByLabelText("Return quantity of Gents Sandal"), "1");
    await user.type(screen.getByLabelText("Reason for Gents Sandal"), "Too tight");
    expect(screen.getByTestId("return-total")).toHaveTextContent("Rs 1,000");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/Return invoice 3 saved/)).toBeInTheDocument();
    const post = requests.find((request) => request.method === "POST");
    expect((post?.body as { lines: unknown[] }).lines).toEqual([{ originalLineId: "line-1", quantity: 1, reasonText: "Too tight", itemConditionCode: "SELLABLE" }]);
    expect(post?.headers["idempotency-key"]).toBe((post?.body as { clientTransactionId: string }).clientTransactionId);
  });

  it("shows the message of the server when the invoice is not found", async () => {
    const user = userEvent.setup();
    const notFound = baseServer(() => ({ status: 404, body: { detail: "No posted sale invoice has this number in this store." } }));
    await openScreen(returnPermissions, notFound, <SaleReturnPage />);
    await screen.findByDisplayValue("3");
    await user.type(screen.getByLabelText(/Original invoice #/), "99{Enter}");
    expect(await screen.findByText(/No posted sale invoice has this number/)).toBeInTheDocument();
  });

  it("is read-only for a person without the add permission", async () => {
    await openScreen([P.INVOICE.SALE_RETURN.VIEW], server, <SaleReturnPage />);
    expect(await screen.findByText(/not allowed to save a return/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});

describe("Exchange Invoice screen", () => {
  const exchangePermissions = [
    P.INVOICE.EXCHANGE_INVOICE.VIEW,
    P.INVOICE.EXCHANGE_INVOICE.ADD,
    P.RESTRICTED_OPERATIONS.SALES.SALE_RETURN,
    P.RESTRICTED_OPERATIONS.SALES.SALE_CREATE,
  ];
  const newItem: SaleItemResponse = { ...sandal, variantId: "variant-2", productId: "product-2", productCode: "P-2", productName: "Gents Loafer", barcode: "8902", listPrice: 1500, suggestedUnitPrice: 1500 };
  const server = baseServer((request) => {
    const path = pathOf(request);
    if (path === "/sales/exchanges/invoice-by-number") return { body: returnableInvoice };
    if (path === "/sales/exchanges/items/by-barcode") return { body: newItem };
    return { status: 404, body: {} };
  });

  it("shows Return Amount, New Sale Amount and the Difference", async () => {
    const user = userEvent.setup();
    await openScreen(exchangePermissions, server, <ExchangeInvoicePage />);
    await screen.findByDisplayValue("5");
    await user.type(screen.getByLabelText(/Original invoice #/), "5{Enter}");
    await screen.findByText("Gents Sandal");
    await user.type(screen.getByLabelText("Return quantity of Gents Sandal"), "1");
    expect(screen.getByTestId("exchange-return-amount")).toHaveTextContent("Rs 1,000");

    await user.type(screen.getByLabelText(/Bar Code/), "8902{Enter}");
    await screen.findByText("Gents Loafer");
    await waitFor(() => expect(screen.getByTestId("exchange-new-sale-amount")).toHaveTextContent("Rs 1,500"));
    expect(screen.getByTestId("exchange-difference")).toHaveTextContent("Rs 500");
  });

  it("says that the customer is owed money when the new items cost less", async () => {
    const user = userEvent.setup();
    const cheaper = baseServer((request) => {
      const path = pathOf(request);
      if (path === "/sales/exchanges/invoice-by-number") return { body: returnableInvoice };
      if (path === "/sales/exchanges/items/by-barcode") return { body: { ...newItem, listPrice: 400, suggestedUnitPrice: 400 } };
      return { status: 404, body: {} };
    });
    await openScreen(exchangePermissions, cheaper, <ExchangeInvoicePage />);
    await screen.findByDisplayValue("5");
    await user.type(screen.getByLabelText(/Original invoice #/), "5{Enter}");
    await screen.findByText("Gents Sandal");
    await user.type(screen.getByLabelText("Return quantity of Gents Sandal"), "1");
    await user.type(screen.getByLabelText(/Bar Code/), "8902{Enter}");
    expect(await screen.findByText(/is owed to the customer/)).toBeInTheDocument();
    expect(screen.getByTestId("exchange-difference")).toHaveTextContent("-Rs 600");
  });
});

describe("View Invoices and View Deleted Invoices", () => {
  const viewPermissions = [P.INVOICE.VIEW_INVOICES.VIEW];
  const listAnswer = { items: [listItem], page: 1, pageSize: 25, totalCount: 1 };
  const server = baseServer((request) => {
    const path = pathOf(request);
    if (path === "/sales/invoices") return { body: listAnswer };
    if (path === "/sales/deleted-invoices") return { body: { items: [{ ...listItem, statusCode: "VOID", voidReason: "Wrong customer", voidedByName: "Test Owner" }], page: 1, pageSize: 25, totalCount: 1 } };
    if (path === "/sales/invoices/invoice-1") return { body: postedInvoice };
    return { status: 404, body: {} };
  });

  it("lists invoices and opens the detail", async () => {
    const user = userEvent.setup();
    await openScreen(viewPermissions, server, <ViewInvoicesPage />);
    expect(await screen.findByText("Walk-in Ali")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByTestId("sale-invoice-detail")).toHaveTextContent("Gents Sandal");
  });

  it("hides print, void and edit from a person who may only view", async () => {
    const user = userEvent.setup();
    await openScreen(viewPermissions, server, <ViewInvoicesPage />);
    await screen.findByText("Walk-in Ali");
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByTestId("sale-invoice-detail");
    expect(screen.queryByRole("button", { name: "Print" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Void invoice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /void and re-enter/ })).not.toBeInTheDocument();
  });

  it("shows void and print to a person with the delete and print permissions, and voiding asks for a reason", async () => {
    const user = userEvent.setup();
    const requests = await openScreen([...viewPermissions, P.INVOICE.VIEW_INVOICES.DELETE, P.INVOICE.VIEW_INVOICES.PRINT], server, <ViewInvoicesPage />);
    await screen.findByText("Walk-in Ali");
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByTestId("sale-invoice-detail");
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Void invoice" }));
    await user.click(await screen.findByRole("button", { name: "Void the invoice" }));
    expect(await screen.findByText("Enter the reason for voiding the invoice.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("shows an empty state when nothing matches", async () => {
    const emptyServer = baseServer((request) => (pathOf(request) === "/sales/invoices" ? { body: { items: [], page: 1, pageSize: 25, totalCount: 0 } } : { status: 404, body: {} }));
    await openScreen(viewPermissions, emptyServer, <ViewInvoicesPage />);
    expect(await screen.findByText("No invoices match")).toBeInTheDocument();
  });

  it("shows the reason, the person and the status of a deleted invoice", async () => {
    await openScreen([P.INVOICE.VIEW_DELETED_INVOICES.VIEW], server, <ViewDeletedInvoicesPage />);
    expect(await screen.findByText("Wrong customer")).toBeInTheDocument();
    expect(screen.getByText("Test Owner")).toBeInTheDocument();
  });
});
