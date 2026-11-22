// A store of a company (core.stores). The head office is the store with the nil id and isHeadOffice = true.
export type StoreSummaryResponse = {
  id: string;
  code: string;
  name: string;
  isHeadOffice: boolean;
  isActive: boolean;
};

export type CreateStoreRequest = { code: string; name: string };
export type CreateStoreResponse = { id: string };
