"use client";

import { SaleInvoiceListModes, SaleInvoiceListScreen } from "./SaleInvoiceListScreen";

export function ViewDeletedInvoicesPage() {
  return <SaleInvoiceListScreen mode={SaleInvoiceListModes.deleted} />;
}
