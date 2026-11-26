"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { CommissionPlanDialog } from "../components/CommissionPlanDialog";
import { CommissionRulesDialog } from "../components/CommissionRulesDialog";
import { describeCommission, describeDateRange } from "../logic/commissionFormatting";
import type { CommissionPlanResponse } from "../types/commissionTypes";

type PlanDialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; planId: string } | { kind: "rules"; planId: string };

// Commission Plans (Part 16.2): who earns commission and how much. The list shows each plan with its people and rules; a plan with one person chosen is how
// "this salesman gets 3 percent" is set. Editing and the rules screen load the full plan (members and rules), because the list only carries counts.
export function CommissionPlansPage() {
  const { translateMessage } = useTranslation();
  const plans = useApiQuery<CommissionPlanResponse[]>(ApiEndpoints.commissions.plans, { offlineCacheName: "commission-plans" });
  const [dialog, setDialog] = useState<PlanDialogState>({ kind: "none" });
  const [planToDelete, setPlanToDelete] = useState<CommissionPlanResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const detailPlanId = dialog.kind === "edit" || dialog.kind === "rules" ? dialog.planId : "";
  const detail = useApiQuery<CommissionPlanResponse>(detailPlanId === "" ? null : ApiEndpoints.commissions.planById(detailPlanId), { enabled: detailPlanId !== "" });

  const columns = useMemo<DataGridColumn<CommissionPlanResponse>[]>(
    () => [
      { key: "name", header: translateMessage("commissions.plans.column.name"), render: (plan) => <strong>{plan.name}</strong> },
      { key: "appliesToCode", header: translateMessage("commissions.plans.column.appliesTo"), sortValue: (plan) => translateMessage(`commissions.appliesTo.${plan.appliesToCode as "SALESMAN" | "MANAGER"}`), render: (plan) => translateMessage(`commissions.appliesTo.${plan.appliesToCode as "SALESMAN" | "MANAGER"}`) },
      { key: "basisCode", header: translateMessage("commissions.plans.column.basis"), isSecondary: true, sortValue: (plan) => translateMessage(`commissions.basis.${plan.basisCode as "NET_SALE" | "GROSS_MARGIN"}`), render: (plan) => translateMessage(`commissions.basis.${plan.basisCode as "NET_SALE" | "GROSS_MARGIN"}`) },
      { key: "commission", header: translateMessage("commissions.plans.column.commission"), sortValue: (plan) => plan.defaultRate ?? plan.defaultFixedAmountPerPiece, render: (plan) => describeCommission(translateMessage, plan.calculationTypeCode, plan.defaultRate, plan.defaultFixedAmountPerPiece) },
      { key: "memberCount", header: translateMessage("commissions.plans.column.people"), render: (plan) => (plan.memberCount === 0 ? translateMessage("commissions.plans.everybodyOfRole") : translateMessage("commissions.plans.peopleCount", { count: plan.memberCount })) },
      { key: "storeName", header: translateMessage("commissions.plans.column.store"), isSecondary: true, sortValue: (plan) => plan.storeName ?? "", render: (plan) => plan.storeName ?? translateMessage("commissions.plans.allStores") },
      { key: "validFrom", header: translateMessage("commissions.plans.column.dates"), isSecondary: true, render: (plan) => <span dir="ltr">{describeDateRange(translateMessage, plan.validFrom, plan.validTo)}</span> },
      { key: "ruleCount", header: translateMessage("commissions.plans.column.rules"), alignment: "end", isSecondary: true, render: (plan) => <span dir="ltr">{plan.ruleCount}</span> },
      {
        key: "isActive",
        header: translateMessage("commissions.plans.column.status"),
        sortValue: (plan) => (plan.isActive ? 0 : 1),
        render: (plan) => <ToneBadge tone={plan.isActive ? ToneNames.success : ToneNames.neutral}>{translateMessage(plan.isActive ? "commissions.plans.status.active" : "commissions.plans.status.inactive")}</ToneBadge>,
      },
      {
        key: "actions",
        header: translateMessage("commissions.plans.column.actions"),
        alignment: "end",
        render: (plan) => (
          <div className="flex flex-wrap justify-end gap-2">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_PLANS.EDIT)}>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "edit", planId: plan.id })}>
                {translateMessage("commissions.plans.action.edit")}
              </Button>
            </PermissionGate>
            <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "rules", planId: plan.id })}>
              {translateMessage("commissions.plans.action.rules")}
            </Button>
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_PLANS.DELETE)}>
              <Button type="button" size="sm" variant="destructive" onClick={() => setPlanToDelete(plan)}>
                {translateMessage("commissions.plans.action.delete")}
              </Button>
            </PermissionGate>
          </div>
        ),
      },
    ],
    [translateMessage],
  );

  async function handleDelete() {
    if (!planToDelete) return;
    setIsDeleting(true);
    const result = await apiRequest<void>(ApiEndpoints.commissions.planById(planToDelete.id), { method: "DELETE" });
    setIsDeleting(false);
    setPlanToDelete(null);
    if (!result.ok) return showToast(result.problem.message, ToneNames.danger);
    showToast(translateMessage("commissions.plans.toast.deleted"), ToneNames.success);
    plans.refetch();
  }

  function closeDialog() {
    setDialog({ kind: "none" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("commissions.plans.title")}
        subtitle={translateMessage("commissions.plans.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.COMMISSIONS.COMMISSION_PLANS.ADD)}>
            <Button type="button" onClick={() => setDialog({ kind: "create" })}>
              <Plus />
              {translateMessage("commissions.plans.new")}
            </Button>
          </PermissionGate>
        }
      />
      <SectionCard title={translateMessage("commissions.plans.listTitle")} isPadded={false}>
        <DataGridTable
          rows={plans.data ?? []}
          columns={columns}
          getRowKey={(plan) => plan.id}
          caption={translateMessage("commissions.plans.listTitle")}
          isLoading={plans.status === "loading"}
          errorMessage={plans.status === "error" ? (plans.problem?.message ?? translateMessage("commissions.plans.loadFailed")) : undefined}
          emptyTitle={translateMessage("commissions.plans.empty")}
          emptyText={translateMessage("commissions.plans.emptyText")}
        />
      </SectionCard>

      {dialog.kind === "create" && (
        <CommissionPlanDialog
          plan={null}
          onClose={closeDialog}
          onSaved={() => {
            closeDialog();
            plans.refetch();
          }}
        />
      )}
      {dialog.kind === "edit" && detail.status === "loading" && <LoadingIndicator />}
      {dialog.kind === "edit" && detail.data && (
        <CommissionPlanDialog
          plan={detail.data}
          onClose={closeDialog}
          onSaved={() => {
            closeDialog();
            plans.refetch();
          }}
        />
      )}
      {dialog.kind === "rules" && detail.data && (
        <CommissionRulesDialog
          plan={detail.data}
          onClose={closeDialog}
          onChanged={() => {
            detail.refetch();
            plans.refetch();
          }}
        />
      )}
      <ConfirmDialog
        open={planToDelete !== null}
        onOpenChange={(open) => { if (!open) setPlanToDelete(null); }}
        onConfirm={() => void handleDelete()}
        isPending={isDeleting}
        titleMessageKey="commissions.plans.delete.title"
        descriptionMessageKey="commissions.plans.delete.text"
        confirmLabelMessageKey="commissions.plans.delete.confirm"
      />
    </div>
  );
}
