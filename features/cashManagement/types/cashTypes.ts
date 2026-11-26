// Shapes of the cash count API (backend EFootwear.BLL/CashManagement/Contracts). Money is whole rupees.

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
