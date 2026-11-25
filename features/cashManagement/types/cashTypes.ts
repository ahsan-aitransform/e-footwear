// Shapes of the promise and cash count API (backend EFootwear.BLL/CashManagement/Contracts). Money is whole rupees.

export const PromiseStatusCodes = {
  open: "OPEN",
  partial: "PARTIAL",
  paid: "PAID",
  broken: "BROKEN",
  cancelled: "CANCELLED",
} as const;

export type PromiseResponse = {
  id: string;
  promiseNumber: number | null;
  storeId: string;
  customerId: string;
  customerName: string;
  promiseDate: string;
  dueDate: string;
  promisedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  statusCode: string;
  note: string | null;
  rowVersion: number;
};

export type PromiseListResponse = {
  promises: { items: PromiseResponse[]; page: number; pageSize: number; totalCount: number };
  totalPromisedAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
};

export type CreatePromiseRequest = {
  storeId: string;
  customerId: string;
  promiseDate: string;
  dueDate: string;
  promisedAmount: number;
  note: string | null;
};

export type UpdatePromiseRequest = { dueDate: string; promisedAmount: number; note: string | null; rowVersion: number };
export type CustomerBalanceResponse = { customerId: string; customerName: string; balanceAmount: number };

export type CashCountDenominationLine = { denomination: number; noteCount: number };

export type CashCountResponse = {
  id: string;
  storeId: string;
  countDate: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number;
  differenceAmount: number;
  denominations: CashCountDenominationLine[];
  paymentsAmount: number | null;
  creditSalesAmount: number | null;
  creditReceivedAmount: number | null;
  note: string | null;
  countedByUserId: string | null;
  countedByName: string | null;
  createdAt: string;
  rowVersion: number;
};

export type CashCountContextResponse = {
  storeId: string;
  countDate: string;
  expectedCash: number;
  existingCount: CashCountResponse | null;
};

export type SaveCashCountRequest = {
  storeId: string;
  countDate: string;
  openingCash: number;
  denominations: CashCountDenominationLine[];
  paymentsAmount: number | null;
  creditSalesAmount: number | null;
  creditReceivedAmount: number | null;
  note: string | null;
  rowVersion: number | null;
};

export type CashCountListItemResponse = {
  id: string;
  storeId: string;
  storeName: string;
  countDate: string;
  expectedCash: number;
  countedCash: number;
  differenceAmount: number;
  countedByName: string | null;
  createdAt: string;
};
