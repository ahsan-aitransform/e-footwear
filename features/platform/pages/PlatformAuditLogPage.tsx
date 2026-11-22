"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { AdministratorActionCodes } from "@/lib/constants/settingsCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CompanySummaryResponse } from "@/lib/types/company";
import type { AdministratorAuditEntryResponse } from "@/lib/types/platformAdministration";
import { formatTimestamp } from "@/features/settings/formatTimestamp";

const START_OF_DAY_TIME = "T00:00:00Z";
const END_OF_DAY_TIME = "T23:59:59Z";

// Audit Log: what platform administrators did (company created, plan assigned, status changed ...), newest first, with filters.
export function PlatformAuditLogPage() {
  const { translateMessage } = useTranslation();
  const companies = useApiQuery<CompanySummaryResponse[]>(ApiEndpoints.platformCompanies.list);
  const [companyId, setCompanyId] = useState("");
  const [actionCode, setActionCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filters = useMemo(
    () => ({
      companyId: companyId || undefined,
      actionCode: actionCode || undefined,
      from: fromDate ? `${fromDate}${START_OF_DAY_TIME}` : undefined,
      to: toDate ? `${toDate}${END_OF_DAY_TIME}` : undefined,
    }),
    [companyId, actionCode, fromDate, toDate],
  );

  const notAvailable = translateMessage("common.notAvailable");
  const columns: DataGridColumn<AdministratorAuditEntryResponse>[] = [
    { key: "occurredAt", header: translateMessage("platform.auditLog.when"), render: (entry) => formatTimestamp(entry.occurredAt, notAvailable) },
    { key: "administrator", header: translateMessage("platform.auditLog.administrator"), render: (entry) => entry.administratorUsername },
    {
      key: "action",
      header: translateMessage("platform.auditLog.action"),
      render: (entry) => translateMessage(`platform.auditLog.action.${entry.actionCode}` as "platform.auditLog.action.LOGIN"),
    },
    { key: "company", header: translateMessage("platform.auditLog.company"), isSecondary: true, render: (entry) => entry.companyName ?? notAvailable },
    {
      key: "detail",
      header: translateMessage("platform.auditLog.detail"),
      isSecondary: true,
      render: (entry) => <code className="break-all text-xs text-muted-foreground">{JSON.stringify(entry.detail)}</code>,
    },
  ];

  return (
    <>
      <PageHeader title={translateMessage("platform.auditLog.title")} subtitle={translateMessage("platform.auditLog.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-4">
        <FormField label={translateMessage("platform.auditLog.company")} name="auditCompany">
          {(controlProps) => (
            <NativeSelect {...controlProps} value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="">{translateMessage("platform.auditLog.anyCompany")}</option>
              {(companies.data ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label={translateMessage("platform.auditLog.action")} name="auditAction">
          {(controlProps) => (
            <NativeSelect {...controlProps} value={actionCode} onChange={(event) => setActionCode(event.target.value)}>
              <option value="">{translateMessage("platform.auditLog.anyAction")}</option>
              {AdministratorActionCodes.map((code) => (
                <option key={code} value={code}>
                  {translateMessage(`platform.auditLog.action.${code}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label={translateMessage("platform.auditLog.fromDate")} name="auditFrom">
          {(controlProps) => <Input {...controlProps} type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />}
        </FormField>
        <FormField label={translateMessage("platform.auditLog.toDate")} name="auditTo">
          {(controlProps) => <Input {...controlProps} type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />}
        </FormField>
      </div>
      <ServerPaginatedDataGrid<AdministratorAuditEntryResponse>
        path={ApiEndpoints.platformAuditLog.list}
        columns={columns}
        getRowKey={(entry) => entry.id}
        caption={translateMessage("platform.auditLog.title")}
        emptyTitle={translateMessage("platform.auditLog.empty")}
        filters={filters}
      />
    </>
  );
}
