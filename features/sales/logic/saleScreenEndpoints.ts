// New Sale and Exchange Invoice use the same lookups, but each screen has its own endpoints because the screens are granted separately (the server checks
// the permission of the screen on every call). This is the one place that says which endpoints belong to which screen.
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { SalesDraftScreenCodes, type SalesDraftScreenCode } from "./saleEntryDraftStorage";

export type SaleScreenConfiguration = {
  screenCode: SalesDraftScreenCode;
  entryContextPath: string;
  itemByBarcodePath: string;
  itemSearchPath: string;
  itemPicturePath: (productId: string) => string;
  customersPath: string;
  // The purchase history of the chosen customer; a screen without it shows no history button.
  customerPurchasesPath?: (customerId: string) => string;
  salesmenPath: string;
  paymentAccountsPath: string;
  posTerminalsPath: string;
  savePath: string;
  // The permissions that decide what the cashier may edit on the grid. The server enforces them again when the invoice is saved.
  changeSellingPricePermission: string;
  giveDiscountPermission: string;
  addPermission: string;
};

export const newSaleScreen: SaleScreenConfiguration = {
  screenCode: SalesDraftScreenCodes.newSale,
  entryContextPath: ApiEndpoints.sales.newSale.entryContext,
  itemByBarcodePath: ApiEndpoints.sales.newSale.itemByBarcode,
  itemSearchPath: ApiEndpoints.sales.newSale.itemSearch,
  itemPicturePath: ApiEndpoints.sales.newSale.itemPicture,
  customersPath: ApiEndpoints.sales.newSale.customers,
  customerPurchasesPath: ApiEndpoints.sales.newSale.customerPurchases,
  salesmenPath: ApiEndpoints.sales.newSale.salesmen,
  paymentAccountsPath: ApiEndpoints.sales.newSale.paymentAccounts,
  posTerminalsPath: ApiEndpoints.sales.newSale.posTerminals,
  savePath: ApiEndpoints.sales.newSale.save,
  changeSellingPricePermission: PermissionCodes.INVOICE.NEW_SALE.CHANGE_SELLING_PRICE,
  giveDiscountPermission: PermissionCodes.INVOICE.NEW_SALE.GIVE_DISCOUNT,
  addPermission: PermissionCodes.INVOICE.NEW_SALE.ADD,
};

export const exchangeScreen: SaleScreenConfiguration = {
  screenCode: SalesDraftScreenCodes.exchange,
  entryContextPath: ApiEndpoints.sales.exchange.entryContext,
  itemByBarcodePath: ApiEndpoints.sales.exchange.itemByBarcode,
  itemSearchPath: ApiEndpoints.sales.exchange.itemSearch,
  itemPicturePath: ApiEndpoints.sales.exchange.itemPicture,
  customersPath: ApiEndpoints.sales.exchange.customers,
  salesmenPath: ApiEndpoints.sales.exchange.salesmen,
  paymentAccountsPath: ApiEndpoints.sales.exchange.paymentAccounts,
  posTerminalsPath: ApiEndpoints.sales.exchange.posTerminals,
  savePath: ApiEndpoints.sales.exchange.save,
  changeSellingPricePermission: PermissionCodes.INVOICE.EXCHANGE_INVOICE.CHANGE_SELLING_PRICE,
  giveDiscountPermission: PermissionCodes.INVOICE.EXCHANGE_INVOICE.GIVE_DISCOUNT,
  addPermission: PermissionCodes.INVOICE.EXCHANGE_INVOICE.ADD,
};
