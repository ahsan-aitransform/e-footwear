"use client";
import Link from "next/link";
import { Card, ErrorAlert, Loading, PageHeader } from "@/components/ui/core";
import { Stat } from "@/components/shared/charts";
import { useMe } from "@/components/session";
import { get, type Row } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import { money, monthStart, qty, today } from "@/lib/format";

/** Figures come from the same report functions the Reports screen uses, so the two always agree. A user without report rights sees shortcuts only. */
export default function Dashboard() {
  const { me, can } = useMe();
  const viewer = can("REPORT_VIEW");
  const store = me.currentStore.isHeadOffice ? undefined : me.currentStore.id;
  const { data, error, loading } = useQuery(async () => {
    const [day, month, stock, customers, vendors] = await Promise.all([
      get<Row>("/reports/profit-summary", { from: today(), to: today(), storeId: store }),
      get<Row>("/reports/profit-summary", { from: monthStart(), to: today(), storeId: store }),
      get<Row>("/reports/stock-value", { storeId: store }),
      get<Row>("/reports/customer-balances"),
      get<Row>("/reports/vendor-summary"),
    ]);
    const sum = (r: Row, k: string) => (r.rows as Row[]).reduce((a, x) => a + Number(x[k] ?? 0), 0);
    return {
      todaySale: sum(day, "netSales"), monthSale: sum(month, "netSales"), monthProfit: sum(month, "grossProfit"),
      stockValue: sum(stock, "value"), stockQty: sum(stock, "qty"),
      receivable: (customers.rows as Row[]).reduce((a, x) => a + Math.max(0, Number(x.balance ?? 0)), 0),
      payable: sum(vendors, "payableBalance"),
    };
  }, [store], { skip: !viewer });

  return (
    <>
      <PageHeader title={`Welcome, ${me.fullName}`} subtitle={`${me.company.name} · ${me.currentStore.isHeadOffice ? "all stores" : me.currentStore.name}`} />
      {viewer && loading && !data && <Loading />}
      {viewer && <ErrorAlert error={error} />}
      {viewer && data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Today's net sale" value={money(data.todaySale)} tone="blue" />
          <Stat label="This month" value={money(data.monthSale)} hint={`Gross profit ${money(data.monthProfit)}`} />
          <Stat label="Stock value" value={money(data.stockValue)} hint={`${qty(data.stockQty)} pairs`} />
          <Stat label="Receivable" value={money(data.receivable)} hint="Customers owe" tone={data.receivable > 0 ? "red" : undefined} />
          <Stat label="Payable" value={money(data.payable)} hint="Owed to vendors" />
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {can("SALE_CREATE") && <Shortcut href="/sales/new" title="New sale" text="Scan, price, take payment and print." />}
        {can("PURCHASE_CREATE") && <Shortcut href="/purchases/new" title="New purchase" text="Record a vendor bill and receive stock." />}
        {can("MASTER_EDIT") && <Shortcut href="/products/new" title="New product" text="Add an article with its sizes and prices." />}
        <Shortcut href="/stock" title="Stock" text="What is on the shelf, store by store." />
      </div>
    </>
  );
}

function Shortcut({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href}><Card className="h-full hover:border-primary-400"><div className="font-semibold text-primary-800">{title}</div><p className="mt-1 text-[13px] text-muted">{text}</p></Card></Link>
  );
}
