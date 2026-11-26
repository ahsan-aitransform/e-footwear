"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { InlineNotice } from "@/components/feedback/InlineNotice";
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
import { formatWholeRupees } from "@/lib/money/wholeRupeeAmount";
import { requireAnyPermission } from "@/lib/permissions/permissionChecks";
import { showToast } from "@/lib/toast/toastStore";
import { DealDialog } from "../components/DealDialog";
import { PromotionPhaseBadge } from "../components/PromotionPhaseBadge";
import { formatPromotionMoment } from "../logic/promotionDateTime";
import type { DealResponse } from "../types/promotionTypes";

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; dealId: string };

// Deals (docx 2.12): one barcode that sells several products, each at its net price. The list shows each deal with its barcode, price and dates; New and Edit open the form with
// the grid of products. [BUSINESS DECISION REQUIRED] How a deal is sold at the till is not decided, so the screen says that the till does not read deals yet.
export function DealsPage() {
  const { translateMessage, languageCode } = useTranslation();
  const deals = useApiQuery<DealResponse[]>(ApiEndpoints.promotions.deals, { offlineCacheName: "promotion-deals" });
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [dealToDelete, setDealToDelete] = useState<DealResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const detailDealId = dialog.kind === "edit" ? dialog.dealId : "";
  const detail = useApiQuery<DealResponse>(detailDealId === "" ? null : ApiEndpoints.promotions.dealById(detailDealId), { enabled: detailDealId !== "" });

  const columns = useMemo<DataGridColumn<DealResponse>[]>(
    () => [
      { key: "name", header: translateMessage("promotions.deals.column.name"), render: (deal) => <strong>{deal.name}</strong> },
      { key: "barcode", header: translateMessage("promotions.deals.column.barcode"), render: (deal) => <span dir="ltr">{deal.barcode}</span> },
      { key: "lineCount", header: translateMessage("promotions.deals.column.products"), alignment: "end", isSecondary: true, render: (deal) => <span dir="ltr">{deal.lineCount}</span> },
      { key: "totalQuantity", header: translateMessage("promotions.deals.column.quantity"), alignment: "end", isSecondary: true, render: (deal) => <span dir="ltr">{deal.totalQuantity}</span> },
      { key: "bundlePrice", header: translateMessage("promotions.deals.column.price"), alignment: "end", render: (deal) => <span dir="ltr">{formatWholeRupees(deal.bundlePrice, { withSymbol: false })}</span> },
      { key: "startsAt", header: translateMessage("promotions.deals.column.starts"), isSecondary: true, render: (deal) => <span dir="ltr">{formatPromotionMoment(deal.startsAt, languageCode)}</span> },
      {
        key: "endsAt",
        header: translateMessage("promotions.deals.column.ends"),
        isSecondary: true,
        sortValue: (deal) => deal.endsAt ?? "",
        render: (deal) => (deal.endsAt ? <span dir="ltr">{formatPromotionMoment(deal.endsAt, languageCode)}</span> : translateMessage("promotions.common.noEnd")),
      },
      { key: "phaseCode", header: translateMessage("promotions.deals.column.phase"), render: (deal) => <PromotionPhaseBadge phaseCode={deal.phaseCode} /> },
      {
        key: "actions",
        header: translateMessage("promotions.deals.column.actions"),
        alignment: "end",
        render: (deal) => (
          <div className="flex flex-wrap justify-end gap-2">
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEALS.EDIT)}>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "edit", dealId: deal.id })}>
                {translateMessage("promotions.deals.action.edit")}
              </Button>
            </PermissionGate>
            <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEALS.DELETE)}>
              <Button type="button" size="sm" variant="destructive" onClick={() => setDealToDelete(deal)}>
                {translateMessage("promotions.deals.action.delete")}
              </Button>
            </PermissionGate>
          </div>
        ),
      },
    ],
    [translateMessage, languageCode],
  );

  async function handleDelete() {
    if (!dealToDelete) return;
    setIsDeleting(true);
    const result = await apiRequest<void>(ApiEndpoints.promotions.dealById(dealToDelete.id), { method: "DELETE" });
    setIsDeleting(false);
    setDealToDelete(null);
    if (!result.ok) return showToast(result.problem.message, ToneNames.danger);
    showToast(translateMessage("promotions.dealForm.toast.deleted"), ToneNames.success);
    deals.refetch();
  }

  function closeDialog() {
    setDialog({ kind: "none" });
  }

  function handleSaved() {
    closeDialog();
    deals.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateMessage("promotions.deals.title")}
        subtitle={translateMessage("promotions.deals.subtitle")}
        actions={
          <PermissionGate requirement={requireAnyPermission(PermissionCodes.SETTINGS.DEALS.ADD)}>
            <Button type="button" onClick={() => setDialog({ kind: "create" })}>
              <Plus />
              {translateMessage("promotions.deals.new")}
            </Button>
          </PermissionGate>
        }
      />
      <InlineNotice tone={ToneNames.info}>{translateMessage("promotions.deals.notice")}</InlineNotice>
      <SectionCard title={translateMessage("promotions.deals.listTitle")} isPadded={false}>
        <DataGridTable
          rows={deals.data ?? []}
          columns={columns}
          getRowKey={(deal) => deal.id}
          caption={translateMessage("promotions.deals.listTitle")}
          isLoading={deals.status === "loading"}
          errorMessage={deals.status === "error" ? (deals.problem?.message ?? translateMessage("promotions.deals.loadFailed")) : undefined}
          emptyTitle={translateMessage("promotions.deals.empty")}
          emptyText={translateMessage("promotions.deals.emptyText")}
        />
      </SectionCard>

      {dialog.kind === "create" && <DealDialog deal={null} onClose={closeDialog} onSaved={handleSaved} />}
      {dialog.kind === "edit" && detail.status === "loading" && <LoadingIndicator />}
      {dialog.kind === "edit" && detail.data && <DealDialog deal={detail.data} onClose={closeDialog} onSaved={handleSaved} />}
      <ConfirmDialog
        open={dealToDelete !== null}
        onOpenChange={(open) => { if (!open) setDealToDelete(null); }}
        onConfirm={() => void handleDelete()}
        isPending={isDeleting}
        titleMessageKey="promotions.deals.delete.title"
        descriptionMessageKey="promotions.deals.delete.text"
        confirmLabelMessageKey="promotions.deals.delete.confirm"
      />
    </div>
  );
}
