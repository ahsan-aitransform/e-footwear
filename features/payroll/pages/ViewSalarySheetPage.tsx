"use client";

import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { LinePaymentsDialog } from "../components/LinePaymentsDialog";
import { PaySalaryDialog } from "../components/PaySalaryDialog";
import { PayrollStatusBadge } from "../components/PayrollStatusBadge";
import { SalaryPeriodSelectors } from "../components/SalaryPeriodSelectors";
import { SalarySheetTable } from "../components/SalarySheetTable";
import { useSalarySheetSelection } from "../hooks/useSalarySheetSelection";
import { formatSalaryMonth } from "../logic/salaryMonth";
import type { PayrollSheetLineResponse, PayrollSheetResponse } from "../types/payrollTypes";

// View Salary Sheet (docx 3.9): the sheet of a store and month with what is paid and what is outstanding. Salary is paid here, line by line and in parts.
// The old screen's Update and Delete are not offered because a posted salary expense is never edited or deleted: a draft is changed by preparing it
// again under New Salary Sheet, and an approved sheet is final (the hint on the screen says so).
export function ViewSalarySheetPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const session = useCurrentSession();
  const { storeId, setStoreId, salaryMonth, setSalaryMonth, monthIsoDate } = useSalarySheetSelection();
  const isStoreChosen = storeId !== "";

  const sheet = useApiQuery<PayrollSheetResponse | undefined>(ApiEndpoints.payroll.sheet, { query: { storeId, month: monthIsoDate }, enabled: isStoreChosen });
  const [payingLine, setPayingLine] = useState<PayrollSheetLineResponse | null>(null);
  const [paymentsLine, setPaymentsLine] = useState<PayrollSheetLineResponse | null>(null);

  const mayPayPermission = hasPermission(PermissionCodes.HUMAN_RESOURCES.SALARY_PAYMENTS.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.EXPENSES_AND_PAYROLL.PAYROLL_APPROVE);
  // Paying posts to the head office, which only people who may work in every store can do (the server refuses everybody else).
  const mayPostToHeadOffice = session?.audience === "COMPANY_USER" && session.hasAccessToAllStores;
  const maySeePayments = hasPermission(PermissionCodes.HUMAN_RESOURCES.SALARY_PAYMENTS.VIEW);
  const mayPrint = hasPermission(PermissionCodes.HUMAN_RESOURCES.VIEW_SALARY_SHEET.PRINT);
  const currentSheet = sheet.data;
  const monthLabel = formatSalaryMonth(salaryMonth, translateMessage);

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("payroll.viewSheet.title")}
        subtitle={translateMessage("payroll.viewSheet.subtitle")}
        actions={mayPrint && currentSheet ? <PrintButton label={translateMessage("payroll.action.print")} /> : undefined}
      />
      <div className="print:hidden">
        <SectionCard>
          <SalaryPeriodSelectors idPrefix="view-salary-sheet" storeId={storeId} onStoreIdChange={setStoreId} salaryMonth={salaryMonth} onSalaryMonthChange={setSalaryMonth} />
        </SectionCard>
      </div>

      {!isStoreChosen && <InlineNotice tone={ToneNames.info}>{translateMessage("payroll.filter.chooseStoreHint")}</InlineNotice>}
      {isStoreChosen && sheet.status === "loading" && <LoadingIndicator />}
      {isStoreChosen && sheet.status === "error" && <FormResultNotice errorMessage={sheet.problem?.message} />}
      {isStoreChosen && sheet.status === "success" && currentSheet === undefined && (
        <EmptyState title={translateMessage("payroll.sheet.noSheet.title")} text={translateMessage("payroll.sheet.noSheet.text")} />
      )}

      {currentSheet && (
        <div className="space-y-4">
          <PrintedReportHeading title={`${translateMessage("payroll.viewSheet.title")}: ${currentSheet.storeName}, ${monthLabel}`} />
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <PayrollStatusBadge statusCode={currentSheet.statusCode} />
            <span className="text-sm text-muted-foreground">{translateMessage("payroll.viewSheet.editDeleteHint")}</span>
          </div>
          {currentSheet.approvedByName && currentSheet.approvedAt && (
            <p className="text-sm text-muted-foreground">
              {translateMessage("payroll.sheet.approvedBy", { name: currentSheet.approvedByName, date: currentSheet.approvedAt.slice(0, 10) })}
            </p>
          )}
          {mayPayPermission && !mayPostToHeadOffice && <InlineNotice tone={ToneNames.info}>{translateMessage("payroll.sheet.headOfficeOnly")}</InlineNotice>}
          <SectionCard isPadded={false}>
            <SalarySheetTable
              lines={currentSheet.lines}
              mode="view"
              caption={translateMessage("payroll.viewSheet.title")}
              onPay={mayPayPermission && mayPostToHeadOffice ? setPayingLine : undefined}
              onShowPayments={maySeePayments ? setPaymentsLine : undefined}
            />
          </SectionCard>
        </div>
      )}

      {payingLine && (
        <PaySalaryDialog
          key={payingLine.lineId}
          line={payingLine}
          onClose={() => setPayingLine(null)}
          onPaid={() => {
            setPayingLine(null);
            sheet.refetch();
          }}
        />
      )}
      {paymentsLine && <LinePaymentsDialog key={paymentsLine.lineId} line={paymentsLine} onClose={() => setPaymentsLine(null)} />}
    </div>
  );
}
