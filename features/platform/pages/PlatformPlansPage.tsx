"use client";

import { useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { PlanResponse } from "@/lib/types/platformAdministration";
import { PlanForm } from "../components/PlanForm";

// Plans: the subscription plans and their limits (stores and users). A plan is retired, not deleted, so companies on it keep working.
export function PlatformPlansPage() {
  const { translateMessage } = useTranslation();
  const plans = useApiQuery<PlanResponse[]>(ApiEndpoints.platformPlans.list);
  const [editingPlan, setEditingPlan] = useState<PlanResponse>();

  const columns: DataGridColumn<PlanResponse>[] = [
    { key: "code", header: translateMessage("platform.plans.code"), render: (plan) => <span className="font-mono">{plan.code}</span> },
    { key: "name", header: translateMessage("platform.plans.name"), render: (plan) => plan.name },
    { key: "stores", header: translateMessage("platform.plans.maximumStores"), alignment: "end", render: (plan) => plan.maximumStores },
    { key: "users", header: translateMessage("platform.plans.maximumUsers"), alignment: "end", render: (plan) => plan.maximumUsers },
    { key: "companies", header: translateMessage("platform.plans.companies"), alignment: "end", isSecondary: true, render: (plan) => plan.companyCount },
    {
      key: "status",
      header: translateMessage("settings.storeManagement.status"),
      render: (plan) => (
        <ToneBadge tone={plan.isActive ? ToneNames.success : ToneNames.warning}>
          {translateMessage(plan.isActive ? "common.status.active" : "platform.plans.retired")}
        </ToneBadge>
      ),
    },
    {
      key: "actions",
      header: translateMessage("common.actions"),
      alignment: "end",
      render: (plan) => (
        <Button size="sm" variant="outline" onClick={() => setEditingPlan(plan)}>
          {translateMessage("common.edit")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={translateMessage("platform.plans.title")} subtitle={translateMessage("platform.plans.subtitle")} />
      <SectionCard title={translateMessage("platform.plans.listTitle")} isPadded={false}>
        <DataGridTable
          rows={plans.data ?? []}
          columns={columns}
          getRowKey={(plan) => plan.code}
          caption={translateMessage("platform.plans.listTitle")}
          isLoading={plans.status === "loading"}
          errorMessage={plans.status === "error" ? plans.problem?.message : undefined}
          emptyTitle={translateMessage("platform.plans.empty")}
          emptyText={translateMessage("platform.plans.emptyText")}
        />
      </SectionCard>
      {editingPlan && (
        <SectionCard title={translateMessage("platform.plans.editTitle", { code: editingPlan.code })}>
          <PlanForm
            key={editingPlan.code}
            plan={editingPlan}
            onCancel={() => setEditingPlan(undefined)}
            onSaved={() => {
              setEditingPlan(undefined);
              plans.refetch();
            }}
          />
        </SectionCard>
      )}
      <SectionCard title={translateMessage("platform.plans.createTitle")} description={translateMessage("platform.plans.createDescription")}>
        <PlanForm onSaved={plans.refetch} />
      </SectionCard>
    </>
  );
}
