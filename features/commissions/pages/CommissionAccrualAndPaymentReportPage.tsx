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
import { CommissionReportFilters, type SubmittedCommissionReportFilters } from "../components/CommissionReportFilters";
import { CommissionSummaryReportTable } from "../components/CommissionSummaryReportTable";
import type { CommissionSummaryReportResponse } from "../types/commissionTypes";

// Commission Accrual and Payment (Part 22 additional report): for each person, what was earned, what is still waiting for approval, what is approved and waiting for
// payroll, and what was paid with salary. Paying commission is the salary payment of the payroll module; this report only shows where each rupee stands.
export function CommissionAccrualAndPaymentReportPage() {
  const { translateMessage } = useTranslation();
  const [submitted, setSubmitted] = useState<SubmittedCommissionReportFilters | null>(null);
  const report = useApiQuery<CommissionSummaryReportResponse>(ApiEndpoints.commissions.accrualAndPaymentReport, {
    query: submitted ? { storeId: submitted.storeId, staffId: submitted.staffId, fromDate: submitted.fromDate, toDate: submitted.toDate } : {},
    enabled: submitted !== null,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("commissions.accrualReport.title")} subtitle={translateMessage("commissions.accrualReport.subtitle")} />
      <CommissionReportFilters idPrefix="commission-accrual-report" hasFormChoice={false} onSubmit={setSubmitted} />

      {submitted !== null && report.status === "loading" && <LoadingIndicator />}
      {submitted !== null && report.status === "error" && <FormResultNotice errorMessage={report.problem?.message} />}
      {submitted !== null && report.data && (
        <div className="space-y-4">
          <div className="flex justify-end print:hidden">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.REPORTS.COMMISSION_ACCRUAL_AND_PAYMENT_REPORT.PRINT)}>
              <PrintButton label={translateMessage("commissions.report.print")} />
            </PermissionGate>
          </div>
          <PrintedReportHeading title={translateMessage("commissions.accrualReport.printTitle", { from: submitted.fromDate, to: submitted.toDate })} />
          <CommissionSummaryReportTable report={report.data} testIdPrefix="commission-accrual-report" />
        </div>
      )}
    </div>
  );
}
