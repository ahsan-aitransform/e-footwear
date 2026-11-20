"use client";
import { money, qty, dateTimeStr } from "@/lib/format";
import type { Row } from "@/lib/api";

/**
 * A printable receipt from GET /sales/{id}/receipt (80 mm thermal layout; the browser's print dialog does A4 as well).
 * Everything printed is read from the saved invoice, never re-computed, so the paper always equals the books.
 */
export function Receipt({ data }: { data: Row }) {
  const lines = (data.lines ?? []) as Row[];
  const pays = (data.payments ?? []) as Row[];
  const isReturn = data.docType === "RETURN";
  return (
    <div className="print-area mx-auto w-[80mm] bg-white p-3 text-[12px] leading-snug text-black">
      <div className="text-center">
        <div className="text-[15px] font-bold">{data.company?.name}</div>
        <div>{data.storeInfo?.name}{data.storeInfo?.address ? ` · ${data.storeInfo.address}` : ""}</div>
        {data.storeInfo?.phone && <div>{data.storeInfo.phone}</div>}
        {data.company?.ntn && <div>NTN {data.company.ntn}</div>}
      </div>
      <hr className="my-2 border-dashed border-black" />
      <div className="flex justify-between"><span>{isReturn ? "Return" : "Invoice"} #{data.invoiceNo}</span><span>{data.status === "VOID" ? "VOID" : ""}</span></div>
      <div>{dateTimeStr(data.occurredAt)}{data.dailyBillNo ? ` · Bill ${data.dailyBillNo}` : ""}</div>
      <div>Customer: {data.customer ?? "Cash Sale"}{data.walkinName ? ` (${data.walkinName})` : ""}</div>
      {data.salesman && <div>Served by: {data.salesman}</div>}
      <hr className="my-2 border-dashed border-black" />
      <table className="w-full">
        <thead><tr className="text-left"><th>Item</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="align-top">
              <td>{l.productName} <span>({l.sizeCode})</span>{l.discountAmount > 0 && <div className="text-[11px]">saved {money(l.discountAmount)}</div>}</td>
              <td className="text-right">{qty(Math.abs(l.qty))}</td>
              <td className="num text-right">{money(l.unitPrice)}</td>
              <td className="num text-right">{money(l.netAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2 border-dashed border-black" />
      <Row k="Gross" v={money(Math.abs(data.grossAmount))} />
      {data.lineDiscountAmount !== 0 && <Row k="Discount" v={money(Math.abs(data.lineDiscountAmount))} />}
      {data.billDiscountAmount !== 0 && <Row k="Bill discount" v={money(Math.abs(data.billDiscountAmount))} />}
      {data.taxAmount !== 0 && <Row k="Tax" v={money(Math.abs(data.taxAmount))} />}
      <Row k={isReturn ? "Credit to customer" : "Net payable"} v={money(Math.abs(data.netAmount))} strong />
      {pays.map((p) => <Row key={p.id} k={String(p.method).replace("_", " ")} v={money(p.amount)} />)}
      {data.changeAmount > 0 && <Row k="Change" v={money(data.changeAmount)} />}
      {data.creditAmount > 0 && <Row k="On account" v={money(data.creditAmount)} strong />}
      {data.company?.invoiceTerms && (<><hr className="my-2 border-dashed border-black" /><div className="whitespace-pre-line text-center text-[11px]">{data.company.invoiceTerms}</div></>)}
      <div className="mt-2 text-center">Thank you</div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "text-[13px] font-bold" : ""}`}><span>{k}</span><span className="num">{v}</span></div>;
}
