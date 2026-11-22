export type CompanySummaryResponse = {
  id: string;
  name: string;
  status: string;
  timezone: string;
  currencyCode: string;
  createdAt: string;
};

export type CreateCompanyRequest = {
  name: string;
  timezone: string | null;
  ownerEmail: string;
  ownerFullName: string;
  ownerPassword: string;
  firstStoreCode: string;
  firstStoreName: string;
};

export type CreateCompanyResponse = { companyId: string };
