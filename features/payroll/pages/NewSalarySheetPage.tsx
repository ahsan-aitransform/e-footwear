"use client";

import { FilePlus2, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { Button } from "@/components/ui/button";
import { PrintButton, PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useCurrentSession } from "@/lib/session/useSessionState";
import { showToast } from "@/lib/toast/toastStore";
import { AddAdjustmentDialog } from "../components/AddAdjustmentDialog";
import { ApproveSalarySheetDialog } from "../components/ApproveSalarySheetDialog";
import { PayrollStatusBadge } from "../components/PayrollStatusBadge";
import { SalaryPeriodSelectors } from "../components/SalaryPeriodSelectors";
import { SalarySheetTable } from "../components/SalarySheetTable";
import { useSalarySheetSelection } from "../hooks/useSalarySheetSelection";
import { formatSalaryMonth } from "../logic/salaryMonth";
import {
  PayrollStatusCodes,
  type PayrollAdjustmentResponse,
  type PayrollSheetLineResponse,
  type PayrollSheetResponse,
  type PrepareSalarySheetRequest,
} from "../types/payrollTypes";

// New Salary Sheet (docx 3.8): choose a store and a month, prepare the sheet, enter incentives and deductions as adjustments, prepare it again to include them,
// then approve it. The old screen had a single Save; here preparing is repeatable while the sheet is a draft, and approving is the one-way step that posts the
// salary expense. Approving never pays anyone: salary is paid line by line under View Salary Sheet.
export function NewSalarySheetPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const session = useCurrentSession();
  const { storeId, setStoreId, salaryMonth, setSalaryMonth, monthIsoDate } = useSalarySheetSelection();
  const isStoreChosen = storeId !== "";

  const sheet = useApiQuery<PayrollSheetResponse | undefined>(ApiEndpoints.payroll.sheet, { query: { storeId, month: monthIsoDate }, enabled: isStoreChosen });
  const adjustments = useApiQuery<PayrollAdjustmentResponse[]>(ApiEndpoints.payroll.adjustments, { query: { storeId, month: monthIsoDate }, enabled: isStoreChosen });

  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string>();
  const [adjustingLine, setAdjustingLine] = useState<PayrollSheetLineResponse | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  const mayPrepare = hasPermission(PermissionCodes.HUMAN_RESOURCES.NEW_SALARY_SHEET.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.EXPENSES_AND_PAYROLL.PAYROLL_PREPARE);
  const mayAdjust = hasPermission(PermissionCodes.HUMAN_RESOURCES.NEW_SALARY_SHEET.EDIT) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.EXPENSES_AND_PAYROLL.PAYROLL_PREPARE);
  const mayApprovePermission = hasPermission(PermissionCodes.HUMAN_RESOURCES.PAYROLL_RUNS.APPROVE) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.EXPENSES_AND_PAYROLL.PAYROLL_APPROVE);
  // Approving posts to the head office, which only people who may work in every store can do (the server refuses everybody else).
  const mayPostToHeadOffice = session?.audience === "COMPANY_USER" && session.hasAccessToAllStores;
  const mayPrint = hasPermission(PermissionCodes.HUMAN_RESOURCES.NEW_SALARY_SHEET.PRINT);

  const currentSheet = sheet.data;
  const isDraft = currentSheet?.statusCode === PayrollStatusCodes.draft;
  const monthLabel = formatSalaryMonth(salaryMonth, translateMessage);

  async function prepareSheet() {
    const body: PrepareSalarySheetRequest = { storeId, month: monthIsoDate };
    setIsWorking(true);
    setMessage(undefined);
    const result = await apiRequest<PayrollSheetResponse>(ApiEndpoints.payroll.prepareSheet, { method: "POST", body });
    setIsWorking(false);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("payroll.toast.prepared"), ToneNames.success);
    sheet.refetch();
    adjustments.refetch();
  }

  async function approveSheet() {
    if (!currentSheet) return;
    setIsWorking(true);
    setMessage(undefined);
    const result = await apiRequest<PayrollSheetResponse>(ApiEndpoints.payroll.approveSheet(currentSheet.runId), { method: "POST" });
    setIsWorking(false);
    setIsApproveDialogOpen(false);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("payroll.toast.approved"), ToneNames.success);
    sheet.refetch();
    adjustments.refetch();
  }

  const adjustmentColumns: DataGridColumn<PayrollAdjustmentResponse>[] = [
    { key: "employee", header: translateMessage("payroll.adjustments.column.employee"), render: (row) => row.employeeName },
    { key: "type", header: translateMessage("payroll.adjustments.column.type"), render: (row) => translateMessage(`payroll.adjustmentType.${row.adjustmentTypeCode}`) },
    { key: "amount", header: translateMessage("payroll.adjustments.column.amount"), alignment: "end", render: (row) => <span dir="ltr">{formatWholeRupees(row.amount, { withSymbol: false })}</span> },
    { key: "reason", header: translateMessage("payroll.adjustments.column.reason"), isSecondary: true, render: (row) => row.reason ?? "" },
    { key: "state", header: translateMessage("payroll.adjustments.column.state"), render: (row) => translateMessage(row.isOnSalarySheet ? "payroll.adjustments.state.onSheet" : "payroll.adjustments.state.waiting") },
  ];

  const headerActions = (
    <div className="flex flex-wrap gap-2 print:hidden">
      {mayPrepare && isStoreChosen && (currentSheet === undefined || isDraft) && (
        <Button type="button" onClick={prepareSheet} disabled={isWorking || sheet.status === "loading"}>
          {currentSheet === undefined ? <FilePlus2 /> : <RefreshCw />}
          {translateMessage(currentSheet === undefined ? "payroll.action.prepare" : "payroll.action.prepareAgain")}
        </Button>
      )}
      {currentSheet && isDraft && mayApprovePermission && mayPostToHeadOffice && currentSheet.lines.length > 0 && (
        <Button type="button" variant="secondary" onClick={() => setIsApproveDialogOpen(true)} disabled={isWorking}>
          <ShieldCheck />
          {translateMessage("payroll.action.approve")}
        </Button>
      )}
      {mayPrint && currentSheet && <PrintButton label={translateMessage("payroll.action.print")} />}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("payroll.newSheet.title")} subtitle={translateMessage("payroll.newSheet.subtitle")} actions={headerActions} />
      <div className="print:hidden">
        <SectionCard>
          <SalaryPeriodSelectors idPrefix="new-salary-sheet" storeId={storeId} onStoreIdChange={setStoreId} salaryMonth={salaryMonth} onSalaryMonthChange={setSalaryMonth} />
        </SectionCard>
      </div>
      <FormResultNotice errorMessage={message} />

      {!isStoreChosen && <InlineNotice tone={ToneNames.info}>{translateMessage("payroll.filter.chooseStoreHint")}</InlineNotice>}
      {isStoreChosen && sheet.status === "loading" && <LoadingIndicator />}
      {isStoreChosen && sheet.status === "error" && <FormResultNotice errorMessage={sheet.problem?.message} />}
      {isStoreChosen && sheet.status === "success" && currentSheet === undefined && (
        <EmptyState title={translateMessage("payroll.sheet.noSheet.title")} text={translateMessage("payroll.sheet.noSheet.text")} />
      )}

      {currentSheet && (
        <div className="space-y-4">
          <PrintedReportHeading title={`${translateMessage("payroll.newSheet.title")}: ${currentSheet.storeName}, ${monthLabel}`} />
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <PayrollStatusBadge statusCode={currentSheet.statusCode} />
            <span className="text-sm text-muted-foreground">
              {isDraft
                ? translateMessage("payroll.sheet.draftHint")
                : translateMessage("payroll.sheet.approvedHint")}
            </span>
          </div>
          {currentSheet.approvedByName && currentSheet.approvedAt && (
            <p className="text-sm text-muted-foreground">
              {translateMessage("payroll.sheet.approvedBy", { name: currentSheet.approvedByName, date: currentSheet.approvedAt.slice(0, 10) })}
            </p>
          )}
          {isDraft && mayApprovePermission && !mayPostToHeadOffice && <InlineNotice tone={ToneNames.info}>{translateMessage("payroll.sheet.headOfficeOnly")}</InlineNotice>}
          <SectionCard isPadded={false}>
            <SalarySheetTable
              lines={currentSheet.lines}
              mode="prepare"
              caption={translateMessage("payroll.newSheet.title")}
              onAdjust={isDraft && mayAdjust ? setAdjustingLine : undefined}
            />
          </SectionCard>
          <p className="text-xs text-muted-foreground">{translateMessage("payroll.sheet.commissionNote")}</p>
        </div>
      )}

      {isStoreChosen && currentSheet && (
        <div className="print:hidden">
          <SectionCard title={translateMessage("payroll.adjustments.title")} description={translateMessage("payroll.adjustments.subtitle")} isPadded={false}>
            <DataGridTable
              rows={adjustments.data ?? []}
              columns={adjustmentColumns}
              getRowKey={(row) => row.id}
              caption={translateMessage("payroll.adjustments.title")}
              isLoading={adjustments.status === "loading"}
              errorMessage={adjustments.status === "error" ? adjustments.problem?.message : undefined}
              emptyTitle={translateMessage("payroll.adjustments.empty.title")}
              emptyText={translateMessage("payroll.adjustments.empty.text")}
            />
          </SectionCard>
        </div>
      )}

      {adjustingLine && (
        <AddAdjustmentDialog
          key={adjustingLine.lineId}
          line={adjustingLine}
          salaryMonthIsoDate={monthIsoDate}
          onClose={() => setAdjustingLine(null)}
          onSaved={() => {
            setAdjustingLine(null);
            adjustments.refetch();
          }}
        />
      )}
      {currentSheet && (
        <ApproveSalarySheetDialog
          open={isApproveDialogOpen}
          onOpenChange={setIsApproveDialogOpen}
          onConfirm={approveSheet}
          isPending={isWorking}
          storeName={currentSheet.storeName}
          monthLabel={monthLabel}
          totalNetPay={currentSheet.totalNetPay}
        />
      )}
    </div>
  );
}
