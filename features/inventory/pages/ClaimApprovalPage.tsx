"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { DateField } from "@/components/forms/DateField";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ReportStoreSelect } from "@/features/accounting/components/ReportStoreSelect";
import { buildProductClaimColumns } from "../logic/productClaimColumns";
import { ProductClaimStatusCodes, type ApproveProductClaimsResponse, type ProductClaimResponse } from "../types/inventoryTypes";

type Filters = { storeId: string; fromDate: string; toDate: string; statusCode: string };

// Claim Approval (docx 4.17): the claims of a store and period; tick the ones to approve and press "Approve Selected Records". Approving takes the pieces out of stock
// and books the loss; several claims are approved together, all or none. A claim can instead be rejected with a reason (one at a time).
export function ClaimApprovalPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [filters, setFilters] = useState<Filters>({ storeId: "", fromDate: "", toDate: "", statusCode: ProductClaimStatusCodes.requested });
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
  const [gridVersion, setGridVersion] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const mayDecide = hasPermission(PermissionCodes.PRODUCTS.CLAIM_APPROVAL.APPROVE) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.CLAIM_APPROVE);
  const columns = useMemo(() => buildProductClaimColumns(translateMessage, { showStatus: true }), [translateMessage]);
  const selectedIds = [...selectedKeys];

  function refreshGrid() {
    setSelectedKeys(new Set());
    setGridVersion((version) => version + 1);
  }

  async function handleApprove() {
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<ApproveProductClaimsResponse>(ApiEndpoints.inventory.claimApprovals.approve, { method: "POST", body: { claimIds: selectedIds } });
    setIsWorking(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.approval.approved", { count: result.data.approvedCount }), ToneNames.success);
    refreshGrid();
  }

  async function handleReject() {
    if (selectedIds.length !== 1) return;
    if (rejectReason.trim() === "") return setErrorMessage(translateMessage("inventory.approval.reject.reasonNeeded"));
    setIsWorking(true);
    setErrorMessage(undefined);
    const result = await apiRequest<ProductClaimResponse>(ApiEndpoints.inventory.claimApprovals.reject(selectedIds[0]), { method: "POST", body: { reason: rejectReason.trim() } });
    setIsWorking(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.approval.rejected", { number: result.data.claimNumber }), ToneNames.success);
    setIsRejectOpen(false);
    setRejectReason("");
    refreshGrid();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.approval.title")} subtitle={translateMessage("inventory.approval.subtitle")} />
      <SectionCard>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReportStoreSelect name="approvalStore" storeId={filters.storeId} onStoreIdChange={(storeId) => setFilters((current) => ({ ...current, storeId }))} />
          <DateField label={translateMessage("inventory.common.fromDate")} name="approvalFromDate" value={filters.fromDate} onValueChange={(fromDate) => setFilters((current) => ({ ...current, fromDate }))} />
          <DateField label={translateMessage("inventory.common.toDate")} name="approvalToDate" value={filters.toDate} onValueChange={(toDate) => setFilters((current) => ({ ...current, toDate }))} />
          <FormField label={translateMessage("inventory.detail.status")} name="approvalStatus">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={filters.statusCode} onChange={(event) => setFilters((current) => ({ ...current, statusCode: event.target.value }))}>
                <option value="">{translateMessage("inventory.common.allStatuses")}</option>
                <option value={ProductClaimStatusCodes.requested}>{translateMessage("inventory.status.requested")}</option>
                <option value={ProductClaimStatusCodes.approved}>{translateMessage("inventory.status.approved")}</option>
                <option value={ProductClaimStatusCodes.rejected}>{translateMessage("inventory.status.rejected")}</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
      </SectionCard>
      <FormResultNotice errorMessage={errorMessage} />
      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<ProductClaimResponse>
          key={gridVersion}
          path={ApiEndpoints.inventory.claimApprovals.list}
          filters={{ storeId: filters.storeId || undefined, fromDate: filters.fromDate || undefined, toDate: filters.toDate || undefined, statusCode: filters.statusCode || undefined }}
          columns={columns}
          getRowKey={(claim) => claim.id}
          caption={translateMessage("inventory.approval.caption")}
          emptyTitle={translateMessage("inventory.approval.empty")}
          isSearchEnabled={false}
          isSelectionEnabled={mayDecide}
          onSelectedRowKeysChange={setSelectedKeys}
          toolbarActions={
            mayDecide && (
              <>
                <Button type="button" onClick={handleApprove} disabled={isWorking || selectedIds.length === 0}>
                  {translateMessage("inventory.approval.approveSelected", { count: selectedIds.length })}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsRejectOpen(true)} disabled={isWorking || selectedIds.length !== 1}>
                  {translateMessage("inventory.approval.reject.button")}
                </Button>
              </>
            )
          }
        />
      </SectionCard>
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translateMessage("inventory.approval.reject.title")}</DialogTitle>
            <DialogDescription>{translateMessage("inventory.approval.reject.text")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="claim-reject-reason">{translateMessage("inventory.approval.reject.reason")}</Label>
            <Textarea id="claim-reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} maxLength={200} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>
              {translateMessage("inventory.common.close")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleReject} disabled={isWorking}>
              {translateMessage("inventory.approval.reject.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
