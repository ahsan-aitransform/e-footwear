import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { installFetchMock, type RecordedRequest } from "@/tests/support/fetchMock";
import { TEST_STORE_ID, buildCompanyUserSession, resetBrowserStateForTests, seedVerifiedSession } from "@/tests/support/sessionFixtures";
import type { CurrentSessionResponse } from "@/lib/types/session";
import { VoucherTypeCodes, type VoucherResponse, type VoucherTargetOptionResponse } from "../types/voucherTypes";
import { VoucherEntryPage } from "./VoucherEntryPage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/voucher/payment" }));

const store = { id: TEST_STORE_ID, code: "MAIN", name: "Main Store", isHeadOffice: false, isActive: true };
const vendorId = "0197c3a0-aaaa-7000-8000-000000000001";
const cashAccountId = "0197c3a0-bbbb-7000-8000-000000000002";

const vendorOption: VoucherTargetOptionResponse = {
  kindCode: "VENDOR",
  accountId: null,
  customerId: null,
  vendorId,
  staffId: null,
  code: "10300001",
  title: "Zubair Umair Shoes",
  typeTitle: "Vendor",
  balanceAmount: 60_000,
  balanceSideCode: "CREDIT",
};
const cashOption: VoucherTargetOptionResponse = {
  kindCode: "ACCOUNT",
  accountId: cashAccountId,
  customerId: null,
  vendorId: null,
  staffId: null,
  code: "CASH-S1",
  title: "Cash in hand",
  typeTitle: "Cash",
  balanceAmount: 0,
  balanceSideCode: "DEBIT",
};
const savedVoucher: VoucherResponse = {
  id: "0197c3a0-cccc-7000-8000-000000000003",
  storeId: TEST_STORE_ID,
  storeName: "Main Store",
  voucherTypeCode: VoucherTypeCodes.payment,
  voucherNumber: 7,
  voucherDate: "2026-11-20",
  amount: 60_000,
  customerId: null,
  vendorId,
  staffId: null,
  contactName: "Zubair Umair Shoes",
  paymentMode: "CASH",
  referenceNumber: null,
  description: null,
  statusCode: "POSTED",
  voidReason: null,
  voidedAt: null,
  createdAt: "2026-11-20T10:00:00Z",
  rowVersion: 1,
  lines: [
    { accountCode: "1030", accountTitle: "Subledger control", customerId: null, vendorId, staffId: null, contactName: "Zubair Umair Shoes", debitAmount: 60_000, creditAmount: 0, description: null },
    { accountCode: "CASH-S1", accountTitle: "Cash in hand", customerId: null, vendorId: null, staffId: null, contactName: null, debitAmount: 0, creditAmount: 60_000, description: null },
  ],
  allocations: [],
};

function paymentVoucherSession(): CurrentSessionResponse {
  return buildCompanyUserSession({ grantedPermissionCodes: [PermissionCodes.VOUCHER.PAYMENT_VOUCHER.ADD] });
}

// The server for these tests. The POST answer can be replaced to test a refusal.
function buildServer(postAnswer: (request: RecordedRequest) => { status: number; body: unknown } = () => ({ status: 201, body: savedVoucher })) {
  return (request: RecordedRequest) => {
    const path = request.url.replace("/api/v1", "");
    if (path.startsWith("/stores")) return { body: [store] };
    if (path.startsWith("/vouchers/payment/entry-context")) {
      return { body: { voucherTypeCode: "PAYMENT", storeId: TEST_STORE_ID, nextVoucherNumber: 7 } };
    }
    if (path.startsWith("/vouchers/payment/targets")) return { body: path.includes("kindCode=VENDOR") ? [vendorOption] : [cashOption] };
    if (path === "/vouchers/payment" && request.method === "POST") return postAnswer(request);
    return { status: 404, body: {} };
  };
}

async function openPaymentVoucher(handler: (request: RecordedRequest) => { status?: number; body?: unknown }) {
  const session = paymentVoucherSession();
  await seedVerifiedSession(session, () => installFetchMock((request) => (request.url.endsWith("/auth/me") ? { body: session } : handler(request))));
  const requests = installFetchMock(handler);
  render(<VoucherEntryPage voucherTypeCode={VoucherTypeCodes.payment} />);
  return requests;
}

async function chooseOption(user: ReturnType<typeof userEvent.setup>, boxName: RegExp, optionName: RegExp) {
  await user.click(screen.getByRole("combobox", { name: boxName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

async function fillValidPayment(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByDisplayValue("7");
  await chooseOption(user, /To \(Dr\)/, /Zubair Umair Shoes/);
  await chooseOption(user, /From \(Cr\)/, /Cash in hand/);
  await user.type(screen.getByLabelText(/^Amount/), "60000");
}

beforeEach(async () => {
  await resetBrowserStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("payment voucher entry screen", () => {
  it("previews the number the voucher will get and shows the balance of the chosen vendor", async () => {
    const user = userEvent.setup();
    await openPaymentVoucher(buildServer());
    expect(await screen.findByDisplayValue("7")).toHaveAttribute("readonly");

    await chooseOption(user, /To \(Dr\)/, /Zubair Umair Shoes/);
    expect(await screen.findByTestId("voucher-to-balance")).toHaveTextContent("Rs 60,000 Cr");
  });

  it("asks for what is missing and sends nothing until the form is complete", async () => {
    const user = userEvent.setup();
    const requests = await openPaymentVoucher(buildServer());
    await screen.findByDisplayValue("7");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Choose the account, customer, vendor or staff member in the To box.")).toBeInTheDocument();
    expect(screen.getByText("Choose the account, customer, vendor or staff member in the From box.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount of one rupee or more.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("posts a vendor by vendor id, an account by account id and whole rupees, then shows the saved voucher", async () => {
    const user = userEvent.setup();
    const requests = await openPaymentVoucher(buildServer());
    await fillValidPayment(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    const post = await waitFor(() => {
      const found = requests.find((request) => request.method === "POST");
      expect(found).toBeDefined();
      return found!;
    });
    expect(post.body).toMatchObject({
      storeId: TEST_STORE_ID,
      debitTarget: { accountId: null, customerId: null, vendorId, staffId: null },
      creditTarget: { accountId: cashAccountId, customerId: null, vendorId: null, staffId: null },
      amount: 60_000,
      paymentMode: "CASH",
    });
    expect(typeof (post.body as { clientTransactionId: string }).clientTransactionId).toBe("string");
    expect(await screen.findByText(/Payment Voucher voucher 7/)).toBeInTheDocument();
    expect(screen.getByTestId("voucher-total-debit")).toHaveTextContent("Rs 60,000");
    expect(screen.getByTestId("voucher-total-credit")).toHaveTextContent("Rs 60,000");
  });

  it("keeps the form after a refusal and retries with the same client transaction id", async () => {
    const user = userEvent.setup();
    let refuseFirst = true;
    const requests = await openPaymentVoucher(
      buildServer(() => {
        if (refuseFirst) {
          refuseFirst = false;
          return { status: 422, body: { title: "Unprocessable", status: 422, detail: "accounting period containing 2026-11-20 is closed", errorCode: "DATABASE_RULE_VIOLATION" } };
        }
        return { status: 201, body: savedVoucher };
      }),
    );
    await fillValidPayment(user);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/accounting period containing 2026-11-20 is closed/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("60,000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText(/Payment Voucher voucher 7/);

    const posts = requests.filter((request) => request.method === "POST");
    expect(posts).toHaveLength(2);
    expect((posts[1].body as { clientTransactionId: string }).clientTransactionId).toBe((posts[0].body as { clientTransactionId: string }).clientTransactionId);
  });

  it("refuses the same account on both sides before asking the server", async () => {
    const user = userEvent.setup();
    const requests = await openPaymentVoucher(buildServer());
    await screen.findByDisplayValue("7");
    // switch the To box to accounts and pick the cash account on both sides
    await user.selectOptions(screen.getByLabelText(/To type/), "ACCOUNT");
    await chooseOption(user, /To \(Dr\)/, /Cash in hand/);
    await chooseOption(user, /From \(Cr\)/, /Cash in hand/);
    await user.type(screen.getByLabelText(/^Amount/), "500");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("To and From must be different.")).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });
});
