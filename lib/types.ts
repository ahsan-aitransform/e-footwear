// Shapes of the API responses the screens use. They mirror the API's records (camelCase JSON).

// Who is signed in, as reported by GET /auth/me.
export type PlatformMe = { platformAdmin: true; adminId: number; username: string };
export type CompanyMe = {
  platformAdmin: false;
  companyId: number;
  userId: number;
  roleCode: string;
  allStores: boolean;
  storeIds: number[];
  mustChangePassword: boolean;
};
export type Me = PlatformMe | CompanyMe;

export type Store = {
  id: number;
  code: string;
  name: string;
  isHeadOffice: boolean;
  isActive: boolean;
};

export type Company = {
  id: number;
  name: string;
  status: string;
  timezone: string;
  currencyCode: string;
  createdAt: string;
};

export type UserRow = {
  id: number;
  email: string;
  fullName: string;
  roleCode: string;
  allStores: boolean;
  status: string;
  mustChangePassword: boolean;
  storeIds: number[];
  storeCodes: string[];
};

export type CreationOptions = {
  roles: string[];
  stores: Store[];
  needsStore: boolean;
};

// Display names for role codes (sec.roles in the database).
export const roleLabels: Record<string, string> = {
  COMPANY_OWNER: "Company owner",
  STORE_MANAGER: "Store manager",
  CASHIER_SALESMAN: "Cashier / salesman",
  ACCOUNTANT: "Accountant",
  PLATFORM_ADMIN: "Platform administrator",
};

export function roleLabel(code: string): string {
  return roleLabels[code] ?? code;
}
