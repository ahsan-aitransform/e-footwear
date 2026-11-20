import type { IconName } from "@/components/ui/icons";

/**
 * Single source for the sidebar and route guards. `perm` / `any` are permission CODES of the v6 schema (sec.permissions); a screen is shown
 * only when the signed-in user holds one. The API enforces the same codes on every call regardless, so hiding a link is cosmetic.
 */
export type NavItem = { label: string; href: string; perm?: string; any?: string[] };
export type NavGroup = { label: string; icon: IconName; items: NavItem[] };

const SELL = ["SALE_CREATE", "SALE_RETURN"];
const BUY = ["PURCHASE_CREATE", "PURCHASE_PAY"];
const MONEY = ["VOUCHER_POST", "PURCHASE_PAY", "EXPENSE_RECORD", "EXPENSE_APPROVE", "REPORT_ACCOUNTS"];
const READ_ALL = ["SALE_CREATE", "SALE_RETURN", "PURCHASE_CREATE", "STOCK_ADJUST", "STOCK_AUDIT", "MASTER_EDIT", "REPORT_VIEW", "TRANSFER_CREATE", "TRANSFER_RECEIVE"];

export const NAV: NavGroup[] = [
  { label: "Dashboard", icon: "home", items: [{ label: "Dashboard", href: "/dashboard" }] },
  {
    label: "Sales", icon: "receipt",
    items: [
      { label: "New Sale", href: "/sales/new", perm: "SALE_CREATE" },
      { label: "Invoices", href: "/sales", any: [...SELL, "REPORT_VIEW", "VOUCHER_DELETE"] },
    ],
  },
  {
    label: "Purchases", icon: "box",
    items: [
      { label: "New Purchase", href: "/purchases/new", perm: "PURCHASE_CREATE" },
      { label: "Purchase History", href: "/purchases", any: [...BUY, "REPORT_VIEW"] },
    ],
  },
  {
    label: "Products", icon: "box",
    items: [
      { label: "Products", href: "/products", any: READ_ALL },
      { label: "New Product", href: "/products/new", perm: "MASTER_EDIT" },
      { label: "Stock", href: "/stock", any: READ_ALL },
    ],
  },
  {
    label: "Party", icon: "users",
    items: [
      { label: "Customers", href: "/parties?kind=customer", any: [...SELL, "VOUCHER_POST", "MASTER_EDIT", "REPORT_VIEW"] },
      { label: "Vendors", href: "/parties?kind=vendor", any: [...BUY, "VENDOR_MANAGE", "VOUCHER_POST"] },
      { label: "Staff", href: "/parties?kind=staff", any: ["USER_ADMIN", "PAYROLL_PREPARE", "MASTER_EDIT"] },
    ],
  },
  {
    label: "Voucher", icon: "wallet",
    items: [
      { label: "Payment Voucher", href: "/vouchers/new?type=PAYMENT", any: ["VOUCHER_POST", "PURCHASE_PAY"] },
      { label: "Receipt Voucher", href: "/vouchers/new?type=RECEIPT", any: ["VOUCHER_POST", "PURCHASE_PAY"] },
      { label: "Expense Voucher", href: "/vouchers/new?type=EXPENSE", any: ["VOUCHER_POST", "EXPENSE_RECORD"] },
      { label: "Journal Voucher", href: "/vouchers/new?type=JOURNAL", any: ["VOUCHER_POST"] },
      { label: "View Vouchers", href: "/vouchers", any: MONEY },
    ],
  },
  { label: "Reports", icon: "chart", items: [{ label: "All Reports", href: "/reports", any: ["REPORT_VIEW", "REPORT_ACCOUNTS"] }] },
  {
    label: "Settings", icon: "settings",
    items: [
      { label: "Company & Stores", href: "/settings/stores", perm: "MASTER_EDIT" },
      { label: "Master Lists", href: "/settings/masters", perm: "MASTER_EDIT" },
    ],
  },
  {
    label: "User Account", icon: "shield",
    items: [
      { label: "Users", href: "/users", perm: "USER_ADMIN" },
      { label: "Change Password", href: "/account/password" },
    ],
  },
];

export const allowed = (has: (p: string) => boolean, i: { perm?: string; any?: string[] }): boolean =>
  i.perm ? has(i.perm) : i.any ? i.any.some(has) : true;
