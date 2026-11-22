"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { formatPeriodMonth } from "../logic/reportDates";
import type { AccountingPeriodResponse, ChangeAccountingPeriodRequest } from "../types/accountReportTypes";

type PendingChange = { period: AccountingPeriodResponse; action: "close" | "reopen" };

// Accounting Periods (Part 15): the months of the books. Closing a month refuses new entries dated in it; reopening accepts them again.
// Who closes a month, and when, is a business policy that nobody has set yet ([BUSINESS DECISION REQUIRED]): nothing closes by itself, and
// both buttons need the Approve permission. A voucher of a closed month can still be voided; the correction is dated the day it is made.
export function AccountingPeriodsPage() {
  const { translateMessage, languageCode } = useTranslation();
  const periods = useApiQuery<AccountingPeriodResponse[]>(ApiEndpoints.accountingPeriods.list);
  const closeMonth = useApiMutation<ChangeAccountingPeriodRequest, AccountingPeriodResponse>(ApiEndpoints.accountingPeriods.close);
  const reopenMonth = useApiMutation<ChangeAccountingPeriodRequest, AccountingPeriodResponse>(ApiEndpoints.accountingPeriods.reopen);
  const [pendingChange, setPendingChange] = useState<PendingChange>();
  const [message, setMessage] = useState<string>();

  async function handleConfirm() {
    if (!pendingChange) return;
    setMessage(undefined);
    const mutation = pendingChange.action === "close" ? closeMonth : reopenMonth;
    const result = await mutation.execute({ periodStart: pendingChange.period.periodStart });
    setPendingChange(undefined);
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("accounting.periods.changed"), ToneNames.success);
    periods.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("accounting.periods.title")} subtitle={translateMessage("accounting.periods.subtitle")} />
      <FormResultNotice errorMessage={message} />
      {periods.status === "loading" && <LoadingIndicator />}
      {periods.status === "error" && <FormResultNotice errorMessage={periods.problem?.message} />}
      {periods.data && periods.data.length === 0 && <EmptyState title={translateMessage("accounting.periods.empty")} />}
      {periods.data && periods.data.length > 0 && (
        <SectionCard isPadded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("accounting.periods.column.month")}</TableHead>
                <TableHead>{translateMessage("accounting.periods.column.status")}</TableHead>
                <TableHead>{translateMessage("accounting.periods.column.closedBy")}</TableHead>
                <TableHead>{translateMessage("accounting.periods.column.closedAt")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.data.map((period) => {
                const isClosed = period.statusCode === "CLOSED";
                return (
                  <TableRow key={period.periodStart}>
                    <TableCell>{formatPeriodMonth(period.periodStart, languageCode)}</TableCell>
                    <TableCell>
                      <ToneBadge tone={isClosed ? ToneNames.warning : ToneNames.success}>
                        {translateMessage(isClosed ? "accounting.periods.status.closed" : "accounting.periods.status.open")}
                      </ToneBadge>
                    </TableCell>
                    <TableCell>{period.closedByName ?? ""}</TableCell>
                    <TableCell dir="ltr">{period.closedAt?.slice(0, 10) ?? ""}</TableCell>
                    <TableCell className="text-end">
                      <PermissionGate requirement={requireAnyPermission(PermissionCodes.VOUCHER.ACCOUNTING_PERIODS.APPROVE)}>
                        <Button type="button" variant="outline" size="sm" onClick={() => setPendingChange({ period, action: isClosed ? "reopen" : "close" })}>
                          {translateMessage(isClosed ? "accounting.periods.reopen" : "accounting.periods.close")}
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <ConfirmDialog
        open={pendingChange !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingChange(undefined);
        }}
        onConfirm={() => void handleConfirm()}
        isPending={closeMonth.isPending || reopenMonth.isPending}
        isDestructive={pendingChange?.action === "close"}
        titleMessageKey={pendingChange?.action === "reopen" ? "accounting.periods.reopenConfirmTitle" : "accounting.periods.closeConfirmTitle"}
        descriptionMessageKey={pendingChange?.action === "reopen" ? "accounting.periods.reopenConfirmText" : "accounting.periods.closeConfirmText"}
        confirmLabelMessageKey={pendingChange?.action === "reopen" ? "accounting.periods.reopen" : "accounting.periods.close"}
      />
    </div>
  );
}
