"use client";

import Link from "next/link";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CompanySummaryResponse } from "@/lib/types/company";
import { CreateCompanyForm } from "../components/CreateCompanyForm";

const SHORT_COMPANY_ID_LENGTH = 8;
const ISO_DATE_LENGTH = 10;

// All companies, and the form that registers a new one with its first store and owner.
export function PlatformCompaniesPage() {
  const { translateMessage } = useTranslation();
  const companies = useApiQuery<CompanySummaryResponse[]>(ApiEndpoints.platformCompanies.list);

  const columns: DataGridColumn<CompanySummaryResponse>[] = [
    { key: "id", header: translateMessage("platform.companies.idColumn"), render: (company) => company.id.slice(0, SHORT_COMPANY_ID_LENGTH) },
    {
      key: "name",
      header: translateMessage("platform.companies.companyColumn"),
      render: (company) => (
        <Link href={ApplicationRoutes.platformCompanyDetail(company.id)} className="font-medium text-primary hover:underline">
          {company.name}
        </Link>
      ),
    },
    { key: "status", header: translateMessage("platform.companies.statusColumn"), render: (company) => <StatusBadge statusCode={company.status} /> },
    { key: "timezone", header: translateMessage("platform.companies.timeZoneColumn"), render: (company) => company.timezone, isSecondary: true },
    { key: "createdAt", header: translateMessage("platform.companies.createdColumn"), render: (company) => company.createdAt.slice(0, ISO_DATE_LENGTH), isSecondary: true },
  ];

  const errorMessage =
    companies.status === "error"
      ? companies.isOffline
        ? translateMessage("errors.platformNeedsConnection")
        : companies.problem?.message
      : undefined;

  return (
    <>
      <PageHeader title={translateMessage("platform.companies.title")} subtitle={translateMessage("platform.companies.subtitle")} />

      <SectionCard isPadded={false}>
        <DataGridTable
          rows={companies.data ?? []}
          columns={columns}
          getRowKey={(company) => company.id}
          caption={translateMessage("platform.companies.title")}
          isLoading={companies.status === "loading"}
          errorMessage={errorMessage}
          emptyTitle={translateMessage("platform.companies.emptyTitle")}
          emptyText={translateMessage("platform.companies.emptyText")}
        />
      </SectionCard>

      <SectionCard
        title={translateMessage("platform.companies.registerTitle")}
        description={translateMessage("platform.companies.registerDescription")}
      >
        <CreateCompanyForm />
      </SectionCard>
    </>
  );
}
