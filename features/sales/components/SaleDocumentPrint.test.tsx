import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getInvoiceTitleLabelKey, getSalePrintLabel } from "../logic/salePrintLabels";
import type { SaleBusinessHeaderResponse, SaleInvoiceResponse } from "../types/saleTypes";
import { SaleDocumentPrint } from "./SaleDocumentPrint";

const header: SaleBusinessHeaderResponse = {
  businessName: "Demo Footwear",
  businessNameUrdu: "ڈیمو فٹ ویئر",
  storeName: "Main Store",
  phoneNumber: "042-111",
  mobileNumber: null,
  email: null,
  addressEnglish: "Mall Road",
  addressUrdu: "مال روڈ",
  invoiceText: null,
  hasLogo: false,
};

const invoice: SaleInvoiceResponse = {
  id: "invoice-1",
  storeId: "store-1",
  storeName: "Main Store",
  documentTypeCode: "SALE",
  invoiceNumber: 12,
  dailyBillNumber: 3,
  saleDate: "2026-11-20",
  occurredAt: "2026-11-20T10:00:00Z",
  customerPartyId: null,
  customerName: "Cash Sale",
  walkInCustomerName: "Ali",
  walkInCustomerMobile: "0300-1",
  salesmanPartyId: null,
  salesmanName: "Bilal",
  posTerminalLabel: null,
  description: "Thank you note",
  grossAmount: 2000,
  discountAmount: 200,
  taxAmount: 0,
  netAmount: 1800,
  paidAmount: 2000,
  cashReturnedAmount: 200,
  outstandingAmount: 0,
  statusCode: "POSTED",
  voidReason: null,
  voidedAt: null,
  voidedByName: null,
  createdByName: null,
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
      productNameUrdu: "مردانہ سینڈل",
      unitName: "Pair",
      sizeCode: "42",
      barcode: "8901",
      quantity: 2,
      listPrice: 1000,
      unitPrice: 900,
      discountPerUnit: 100,
      discountPercent: 10,
      discountAmount: 200,
      netAmount: 1800,
      discountSourceCode: "MANUAL",
      originalLineId: null,
      originalInvoiceNumber: null,
      returnReason: null,
      itemConditionCode: null,
    },
  ],
  payments: [],
};

function renderPrint(options: Partial<{ formatCode: "THERMAL" | "A4" | "A5"; languageCode: "en" | "ur"; includeGatePass: boolean }> = {}, document: SaleInvoiceResponse = invoice) {
  return render(
    <SaleDocumentPrint
      businessHeader={header}
      invoice={document}
      options={{ formatCode: "THERMAL", languageCode: "en", includeGatePass: false, ...options }}
    />,
  );
}

describe("printed sale document", () => {
  it("prints a thermal receipt in 80 mm paper with the business header, lines and totals", () => {
    renderPrint({ formatCode: "THERMAL" });
    const root = screen.getByTestId("sale-document-print");
    expect(root).toHaveAttribute("data-print-format", "THERMAL");
    expect(root.querySelector("style")?.textContent).toContain("80mm");
    const sheet = screen.getByTestId("sale-document-sheet");
    expect(sheet).toHaveTextContent("Demo Footwear");
    expect(sheet).toHaveTextContent("Sale Invoice");
    expect(sheet).toHaveTextContent("Gents Sandal (42)");
    expect(sheet).toHaveTextContent("2 × 900");
    expect(sheet).toHaveTextContent("Net Bill");
    expect(sheet).toHaveTextContent("1,800");
    expect(sheet).toHaveTextContent("Cash Return");
  });

  it("prints A4 and A5 as a table with the nine columns of the invoice grid", () => {
    for (const [formatCode, pageSize] of [["A4", "A4"], ["A5", "A5"]] as const) {
      const { unmount } = renderPrint({ formatCode });
      expect(screen.getByTestId("sale-document-print").querySelector("style")?.textContent).toContain(`size: ${pageSize}`);
      const headers = within(screen.getByTestId("sale-document-sheet")).getAllByRole("columnheader").map((cell) => cell.textContent);
      expect(headers).toEqual(["Code", "Product", "Size", "Qty", "Price", "Dis %", "Disc/Unit", "Total"]);
      unmount();
    }
  });

  it("prints Urdu right to left with Urdu names and labels", () => {
    renderPrint({ languageCode: "ur", formatCode: "A4" });
    const sheet = screen.getByTestId("sale-document-sheet");
    expect(sheet.className).toMatch(/rightToLeft/);
    expect(sheet).toHaveTextContent("ڈیمو فٹ ویئر");
    expect(sheet).toHaveTextContent("مردانہ سینڈل");
    expect(sheet).toHaveTextContent(getSalePrintLabel("ur", "saleInvoice"));
    expect(screen.getByTestId("sale-document-print")).toHaveAttribute("data-print-language", "ur");
  });

  it("prints English left to right", () => {
    renderPrint({ languageCode: "en" });
    expect(screen.getByTestId("sale-document-sheet").className).toMatch(/leftToRight/);
  });

  it("adds a gate pass without prices when asked", () => {
    renderPrint({ includeGatePass: true });
    const gatePass = screen.getByTestId("gate-pass-sheet");
    expect(gatePass).toHaveTextContent("Gate Pass");
    expect(gatePass).toHaveTextContent("Gents Sandal");
    expect(gatePass).not.toHaveTextContent("1,800");
    expect(gatePass).toHaveTextContent("Authorised by");
  });

  it("prints no gate pass by default", () => {
    renderPrint();
    expect(screen.queryByTestId("gate-pass-sheet")).not.toBeInTheDocument();
  });

  it("prints one sheet per receipt copy", () => {
    render(<SaleDocumentPrint businessHeader={header} invoice={invoice} options={{ formatCode: "THERMAL", languageCode: "en", includeGatePass: false }} copyCount={2} />);
    expect(screen.getAllByTestId("sale-document-sheet")).toHaveLength(2);
  });

  it("stamps a voided invoice", () => {
    renderPrint({}, { ...invoice, statusCode: "VOID" });
    expect(screen.getByTestId("sale-document-sheet")).toHaveTextContent("VOID");
  });

  it("titles a return and the halves of an exchange", () => {
    expect(getInvoiceTitleLabelKey("RETURN", false)).toBe("returnInvoice");
    expect(getInvoiceTitleLabelKey("RETURN", true)).toBe("exchangeReturn");
    expect(getInvoiceTitleLabelKey("SALE", true)).toBe("exchangeSale");
    renderPrint({}, { ...invoice, documentTypeCode: "RETURN", originalInvoiceNumber: 7, netAmount: -1800 });
    const sheet = screen.getByTestId("sale-document-sheet");
    expect(sheet).toHaveTextContent("Sale Return");
    expect(sheet).toHaveTextContent("Original invoice");
    expect(sheet).not.toHaveTextContent("Paid");
  });
});
