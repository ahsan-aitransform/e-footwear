"use client";

import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { cn } from "@/lib/utils";
import { getInvoiceTitleLabelKey, getSalePrintLabel, type SalePrintLabelKey } from "../logic/salePrintLabels";
import {
  SaleInvoiceStatusCodes,
  SalePrintFormatCodes,
  SalePrintLanguageCodes,
  type SaleBusinessHeaderResponse,
  type SaleInvoiceLineResponse,
  type SaleInvoiceResponse,
  type SalePrintFormatCode,
  type SalePrintLanguageCode,
} from "../types/saleTypes";
import styles from "./SaleDocumentPrint.module.css";

export type SalePrintOptions = {
  formatCode: SalePrintFormatCode;
  languageCode: SalePrintLanguageCode;
  includeGatePass: boolean;
};

// The paper size of each format, given to the browser through a page rule. Thermal paper is a roll: its height is whatever the receipt needs.
const pageRuleByFormat: Record<SalePrintFormatCode, string> = {
  [SalePrintFormatCodes.thermal]: "@page { size: 80mm auto; margin: 4mm; }",
  [SalePrintFormatCodes.a4]: "@page { size: A4; margin: 10mm; }",
  [SalePrintFormatCodes.a5]: "@page { size: A5; margin: 8mm; }",
};

const formatClassNameByCode: Record<SalePrintFormatCode, string> = {
  [SalePrintFormatCodes.thermal]: styles.thermal,
  [SalePrintFormatCodes.a4]: styles.a4,
  [SalePrintFormatCodes.a5]: styles.a5,
};

function productNameFor(line: SaleInvoiceLineResponse, languageCode: SalePrintLanguageCode): string {
  return languageCode === SalePrintLanguageCodes.urdu && line.productNameUrdu ? line.productNameUrdu : line.productName;
}

// The printed sale, return or exchange half, and the gate pass (docx 5.1: "Print Gate Pass", Paper: Thermal / A4 / A5, Language: English / Urdu Print).
// It is invisible on screen and appears when the browser prints. Urdu prints right to left; numbers stay left to right inside the text.
export function SaleDocumentPrint({
  businessHeader,
  invoice,
  options,
  logoObjectUrl = null,
  copyCount = 1,
}: {
  businessHeader: SaleBusinessHeaderResponse;
  invoice: SaleInvoiceResponse;
  options: SalePrintOptions;
  logoObjectUrl?: string | null;
  copyCount?: number;
}) {
  const copies = Math.max(1, Math.min(copyCount, 5));
  return (
    <div data-testid="sale-document-print" data-print-format={options.formatCode} data-print-language={options.languageCode}>
      <style>{pageRuleByFormat[options.formatCode]}</style>
      {Array.from({ length: copies }, (_, copyIndex) => (
        <SaleDocumentSheet key={copyIndex} businessHeader={businessHeader} invoice={invoice} options={options} logoObjectUrl={logoObjectUrl} />
      ))}
      {options.includeGatePass && <GatePassSheet businessHeader={businessHeader} invoice={invoice} options={options} />}
    </div>
  );
}

function sheetClassName(options: SalePrintOptions): string {
  return cn(
    styles.sheet,
    formatClassNameByCode[options.formatCode],
    options.languageCode === SalePrintLanguageCodes.urdu ? styles.rightToLeft : styles.leftToRight,
  );
}

function BusinessHeader({
  businessHeader,
  options,
  logoObjectUrl,
}: {
  businessHeader: SaleBusinessHeaderResponse;
  options: SalePrintOptions;
  logoObjectUrl: string | null;
}) {
  const isUrdu = options.languageCode === SalePrintLanguageCodes.urdu;
  const businessName = isUrdu && businessHeader.businessNameUrdu ? businessHeader.businessNameUrdu : businessHeader.businessName;
  const address = isUrdu && businessHeader.addressUrdu ? businessHeader.addressUrdu : businessHeader.addressEnglish;
  const phones = [businessHeader.phoneNumber, businessHeader.mobileNumber].filter(Boolean).join(" / ");
  return (
    <div className={styles.businessHeader}>
      {logoObjectUrl && (
        // A receipt logo is a runtime picture behind a sign-in, so it cannot go through next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoObjectUrl} alt="" className={styles.logo} />
      )}
      <p className={styles.businessName}>{businessName}</p>
      <p className={styles.businessLine}>{businessHeader.storeName}</p>
      {address && <p className={styles.businessLine}>{address}</p>}
      {phones && (
        <p className={styles.businessLine}>
          {getSalePrintLabel(options.languageCode, "phone")}: <span dir="ltr">{phones}</span>
        </p>
      )}
    </div>
  );
}

function Fact({ languageCode, labelKey, value }: { languageCode: SalePrintLanguageCode; labelKey: SalePrintLabelKey; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <tr>
      <td className={styles.factLabel}>{getSalePrintLabel(languageCode, labelKey)}</td>
      <td>{value}</td>
    </tr>
  );
}

function customerDisplayName(invoice: SaleInvoiceResponse): string | null {
  const walkIn = [invoice.walkInCustomerName, invoice.walkInCustomerMobile].filter(Boolean).join(" ");
  return invoice.customerName && invoice.customerName !== "Cash Sale" ? invoice.customerName : walkIn || invoice.customerName;
}

function SaleDocumentSheet({
  businessHeader,
  invoice,
  options,
  logoObjectUrl,
}: {
  businessHeader: SaleBusinessHeaderResponse;
  invoice: SaleInvoiceResponse;
  options: SalePrintOptions;
  logoObjectUrl: string | null;
}) {
  const languageCode = options.languageCode;
  const label = (key: SalePrintLabelKey) => getSalePrintLabel(languageCode, key);
  const isThermal = options.formatCode === SalePrintFormatCodes.thermal;
  const isPartOfExchange = invoice.relatedInvoiceId !== null;
  const totalQuantity = invoice.lines.reduce((sum, line) => sum + line.quantity, 0);
  const isVoid = invoice.statusCode === SaleInvoiceStatusCodes.void;

  return (
    <section className={sheetClassName(options)} data-testid="sale-document-sheet">
      <BusinessHeader businessHeader={businessHeader} options={options} logoObjectUrl={logoObjectUrl} />
      <div className={styles.documentTitle}>{label(getInvoiceTitleLabelKey(invoice.documentTypeCode, isPartOfExchange))}</div>
      {isVoid && <div className={styles.voidStamp}>{label("voided")}</div>}

      <table className={styles.facts}>
        <tbody>
          <Fact languageCode={languageCode} labelKey="invoiceNumber" value={String(invoice.invoiceNumber)} />
          <Fact languageCode={languageCode} labelKey="dailyBillNumber" value={invoice.dailyBillNumber ? String(invoice.dailyBillNumber) : null} />
          <Fact languageCode={languageCode} labelKey="date" value={invoice.saleDate} />
          <Fact languageCode={languageCode} labelKey="customer" value={customerDisplayName(invoice)} />
          <Fact languageCode={languageCode} labelKey="salesman" value={invoice.salesmanName} />
          <Fact languageCode={languageCode} labelKey="originalInvoice" value={invoice.originalInvoiceNumber ? String(invoice.originalInvoiceNumber) : null} />
        </tbody>
      </table>

      {isThermal ? (
        <div>
          {invoice.lines.map((line) => (
            <div key={line.lineId} className={styles.thermalLine}>
              <div className={styles.thermalLineName}>
                {productNameFor(line, languageCode)} ({line.sizeCode})
              </div>
              <div className={styles.thermalLineAmounts}>
                <span dir="ltr">
                  {formatQuantity(line.quantity)} × {formatWholeRupees(line.unitPrice, { withSymbol: false })}
                </span>
                <span dir="ltr">{formatWholeRupees(line.netAmount, { withSymbol: false })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table className={styles.linesTable}>
          <thead>
            <tr>
              <th>{label("code")}</th>
              <th>{label("product")}</th>
              <th>{label("size")}</th>
              <th className={styles.numberCell}>{label("quantity")}</th>
              <th className={styles.numberCell}>{label("price")}</th>
              <th className={styles.numberCell}>{label("discountPercent")}</th>
              <th className={styles.numberCell}>{label("discountPerUnit")}</th>
              <th className={styles.numberCell}>{label("lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.lineId}>
                <td>{line.productCode}</td>
                <td>{productNameFor(line, languageCode)}</td>
                <td>{line.sizeCode}</td>
                <td className={styles.numberCell}>{formatQuantity(line.quantity)}</td>
                <td className={styles.numberCell}>{formatWholeRupees(line.listPrice, { withSymbol: false })}</td>
                <td className={styles.numberCell}>{formatQuantity(line.discountPercent)}</td>
                <td className={styles.numberCell}>{formatWholeRupees(line.discountPerUnit, { withSymbol: false })}</td>
                <td className={styles.numberCell}>{formatWholeRupees(line.netAmount, { withSymbol: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <table className={styles.totals}>
        <tbody>
          <TotalRow label={label("totalQuantity")} value={formatQuantity(totalQuantity)} />
          <TotalRow label={label("grossBill")} value={formatWholeRupees(invoice.grossAmount, { withSymbol: false })} />
          <TotalRow label={label("discount")} value={formatWholeRupees(invoice.discountAmount, { withSymbol: false })} />
          <tr className={styles.netBillRow}>
            <td>{label("netBill")}</td>
            <td className={styles.totalAmount}>{formatWholeRupees(invoice.netAmount, { withSymbol: false })}</td>
          </tr>
          {invoice.documentTypeCode === "SALE" && (
            <>
              <TotalRow label={label("paid")} value={formatWholeRupees(invoice.paidAmount, { withSymbol: false })} />
              {invoice.cashReturnedAmount > 0 && <TotalRow label={label("cashReturned")} value={formatWholeRupees(invoice.cashReturnedAmount, { withSymbol: false })} />}
              {invoice.outstandingAmount > 0 && <TotalRow label={label("balanceDue")} value={formatWholeRupees(invoice.outstandingAmount, { withSymbol: false })} />}
            </>
          )}
        </tbody>
      </table>

      {invoice.description && <p className={styles.footerNote}>{invoice.description}</p>}
      <p className={styles.footerNote}>{businessHeader.invoiceText ?? label("thankYou")}</p>
    </section>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td className={styles.totalAmount}>{value}</td>
    </tr>
  );
}

// The slip the guard at the door checks against the goods: what leaves the shop, with no prices.
function GatePassSheet({ businessHeader, invoice, options }: { businessHeader: SaleBusinessHeaderResponse; invoice: SaleInvoiceResponse; options: SalePrintOptions }) {
  const languageCode = options.languageCode;
  const label = (key: SalePrintLabelKey) => getSalePrintLabel(languageCode, key);
  return (
    <section className={sheetClassName(options)} data-testid="gate-pass-sheet">
      <BusinessHeader businessHeader={businessHeader} options={options} logoObjectUrl={null} />
      <div className={styles.documentTitle}>{label("gatePass")}</div>
      <table className={styles.facts}>
        <tbody>
          <Fact languageCode={languageCode} labelKey="invoiceNumber" value={String(invoice.invoiceNumber)} />
          <Fact languageCode={languageCode} labelKey="date" value={invoice.saleDate} />
          <Fact languageCode={languageCode} labelKey="customer" value={customerDisplayName(invoice)} />
        </tbody>
      </table>
      <table className={styles.linesTable}>
        <thead>
          <tr>
            <th>{label("product")}</th>
            <th>{label("size")}</th>
            <th className={styles.numberCell}>{label("quantity")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.lineId}>
              <td>{productNameFor(line, languageCode)}</td>
              <td>{line.sizeCode}</td>
              <td className={styles.numberCell}>{formatQuantity(line.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.signatureRow}>
        <div className={styles.signatureBox}>{label("authorisedBy")}</div>
        <div className={styles.signatureBox}>{label("receivedBy")}</div>
      </div>
    </section>
  );
}
