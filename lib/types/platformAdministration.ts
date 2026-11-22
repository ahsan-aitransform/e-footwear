import type { CompanyProfileResponse } from "./settings";
import type { PlanUsageResponse } from "./storeManagement";

// Plans, company administration and the platform audit log (backend: EFootwear.BLL/Platform/Contracts).
export type PlanResponse = {
  code: string;
  name: string;
  maximumStores: number;
  maximumUsers: number;
  isActive: boolean;
  companyCount: number;
};
export type CreatePlanRequest = { code: string; name: string; maximumStores: number; maximumUsers: number };
export type UpdatePlanRequest = { name: string; maximumStores: number; maximumUsers: number; isActive: boolean };

export type CompanyDetailResponse = { profile: CompanyProfileResponse; usage: PlanUsageResponse };
export type AssignCompanyPlanRequest = { planCode: string };
export type SetCompanyStatusRequest = { status: string; reason: string | null };

export type AdministratorAuditEntryResponse = {
  id: string;
  administratorUsername: string;
  actionCode: string;
  companyId: string | null;
  companyName: string | null;
  detail: Record<string, unknown>;
  occurredAt: string;
};
