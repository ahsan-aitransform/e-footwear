// Store administration by the company (backend: StoreDetailResponse, CreateManagedStoreRequest, UpdateManagedStoreRequest).
export type StoreDetailResponse = {
  id: string;
  code: string;
  name: string;
  isHeadOffice: boolean;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  rowVersion: number;
};

export type CreateManagedStoreRequest = { code: string; name: string; address: string | null; phone: string | null };

export type UpdateManagedStoreRequest = {
  name: string;
  address: string | null;
  phone: string | null;
  expectedRowVersion: number;
};

// What a company uses against its plan (backend: PlanUsageResponse).
export type PlanUsageResponse = {
  planCode: string;
  planName: string;
  maximumStores: number;
  maximumUsers: number;
  activeStores: number;
  users: number;
};
