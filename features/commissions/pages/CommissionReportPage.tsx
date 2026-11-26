"use client";

import { useState } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { CommissionDetailReportTable } from "../components/CommissionDetailReportTable";
import { CommissionReportFilters, CommissionReportForms, type SubmittedCommissionReportFilters } from "../components/CommissionReportFilters";
import { CommissionSummaryReportTable } from "../components/CommissionSummaryReportTable";
import type { CommissionDetailReportResponse, CommissionSummaryReportResponse } from "../types/commissionTypes";

// Commission Report (docx 8.14): the commission of a store and period, for everybody or one salesman, as a summary (one row per person) or in detail (one row per
// entry). Its totals equal the commission the salary sheet takes for the same period. Only one of the two answers is requested, depending on the chosen form.
export function CommissionReportPage() {
  const { translateMessage } = useTranslation();
  const [submitted, setSubmitted] = useState<SubmittedCommissionReportFilters | null>(null);
  const isDetail = submitted?.form === CommissionReportForms.detail;
  const query = submitted ? { storeId: submitted.storeId, staffId: submitted.staffId, fromDate: submitted.fromDate, toDate: submitted.toDate } : {};

  const summary = useApiQuery<CommissionSummaryReportResponse>(ApiEndpoints.commissions.commissionReportSummary, { query, enabled: submitted !== null && !isDetail });
  const detail = useApiQuery<CommissionDetailReportResponse>(ApiEndpoints.commissions.commissionReportDetail, { query, enabled: submitted !== null && isDetail });
  const active = isDetail ? detail : summary;

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("commissions.report.title")} subtitle={translateMessage("commissions.report.subtitle")} />
      <CommissionReportFilters idPrefix="commission-report" hasFormChoice onSubmit={setSubmitted} />

      {submitted !== null && active.status === "loading" && <LoadingIndicator />}
      {submitted !== null && active.status === "error" && <FormResultNotice errorMessage={active.problem?.message} />}
      {submitted !== null && active.status === "success" && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.COMMISSION_REPORT.PRINT)}>
              <PrintButton label={translateMessage("commissions.report.print")} />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("commissions.report.printTitle", { from: submitted.fromDate, to: submitted.toDate })} />
          {isDetail && detail.data && <CommissionDetailReportTable report={detail.data} />}
          {!isDetail && summary.data && <CommissionSummaryReportTable report={summary.data} testIdPrefix="commission-report" />}
        </div>
      )}
    </div>
  );
}
