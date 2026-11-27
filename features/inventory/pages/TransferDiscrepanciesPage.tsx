"use client";

import { useMemo, useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/api/apiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatQuantity } from "@/lib/money/quantityAndPercentage";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { InventoryStatusBadge } from "../components/InventoryStatusBadge";
import { bearerMessageKey } from "../logic/inventoryStatusPresentation";
import {
  TransferLossBearerCodes,
  TransferLossCaseStatusCodes,
  TransferLossDecisionCodes,
  type DecideTransferLossRequest,
  type TransferLossBearerCode,
  type TransferLossCaseResponse,
  type TransferLossDecisionCode,
} from "../types/inventoryTypes";

// Transfer Discrepancies (Part 22): the pieces that were sent but never scanned by the receiving store. Each one waits for a decision: FOUND (the pieces were found and
// go into the receiving store's stock) or CHARGE (the loss is charged to the company, the sending store or the receiving store). The business has not decided who carries
// a loss, so there is NO default: the person must choose.
export function TransferDiscrepanciesPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const [statusCode, setStatusCode] = useState<string>(TransferLossCaseStatusCodes.open);
  const [gridVersion, setGridVersion] = useState(0);
  const [selected, setSelected] = useState<TransferLossCaseResponse>();
  const [decision, setDecision] = useState<TransferLossDecisionCode>(TransferLossDecisionCodes.found);
  const [bearerCode, setBearerCode] = useState<TransferLossBearerCode | "">("");
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const mayDecide = hasPermission(PermissionCodes.INVENTORY.TRANSFER_DISCREPANCIES.APPROVE) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.TRANSFER_LOSS_DECIDE);

  const bearerOptions = useMemo(
    () => Object.values(TransferLossBearerCodes).map((code) => ({ value: code, label: translateMessage(bearerMessageKey(code)) })),
    [translateMessage],
  );
  const columns = useMemo<DataGridColumn<TransferLossCaseResponse>[]>(
    () => [
      { key: "transfer", header: translateMessage("inventory.transfer.column.number"), alignment: "end", render: (lossCase) => lossCase.transferNumber },
      { key: "from", header: translateMessage("inventory.transfer.column.fromStore"), render: (lossCase) => lossCase.fromStoreName },
      { key: "to", header: translateMessage("inventory.transfer.column.toStore"), render: (lossCase) => lossCase.toStoreName },
      { key: "product", header: translateMessage("inventory.column.product"), render: (lossCase) => `${lossCase.productName} (${lossCase.sizeCode})` },
      { key: "quantity", header: translateMessage("inventory.column.quantity"), alignment: "end", render: (lossCase) => formatQuantity(lossCase.quantity) },
      { key: "bearer", header: translateMessage("inventory.discrepancy.bearer"), render: (lossCase) => (lossCase.bearerCode ? translateMessage(bearerMessageKey(lossCase.bearerCode)) : "") },
      { key: "status", header: translateMessage("inventory.detail.status"), render: (lossCase) => <InventoryStatusBadge statusCode={lossCase.statusCode} /> },
      { key: "raised", header: translateMessage("inventory.discrepancy.raised"), isSecondary: true, render: (lossCase) => lossCase.raisedAt.slice(0, 10) },
    ],
    [translateMessage],
  );

  function openDecision(lossCase: TransferLossCaseResponse) {
    if (!mayDecide || lossCase.statusCode !== TransferLossCaseStatusCodes.open) return;
    setSelected(lossCase);
    setDecision(TransferLossDecisionCodes.found);
    setBearerCode("");
    setErrorMessage(undefined);
  }

  async function handleDecide() {
    if (!selected) return;
    if (decision === TransferLossDecisionCodes.charge && bearerCode === "") return setErrorMessage(translateMessage("inventory.discrepancy.problem.bearer"));
    setIsWorking(true);
    setErrorMessage(undefined);
    const request: DecideTransferLossRequest = { decisionCode: decision, bearerCode: decision === TransferLossDecisionCodes.charge && bearerCode !== "" ? bearerCode : null };
    const result = await apiRequest<TransferLossCaseResponse>(ApiEndpoints.inventory.transferDiscrepancies.decide(selected.id), { method: "POST", body: request });
    setIsWorking(false);
    if (!result.ok) return setErrorMessage(result.problem.message);
    showToast(translateMessage("inventory.discrepancy.decided"), ToneNames.success);
    setSelected(undefined);
    setGridVersion((version) => version + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.discrepancy.title")} subtitle={translateMessage("inventory.discrepancy.subtitle")} />
      {!mayDecide && <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.discrepancy.viewOnly")}</InlineNotice>}
      <SectionCard isPadded={false}>
        <div className="border-b p-4 sm:w-72">
          <FormField label={translateMessage("inventory.detail.status")} name="discrepancyStatus">
            {(controlProps) => (
              <NativeSelect {...controlProps} value={statusCode} onChange={(event) => setStatusCode(event.target.value)}>
                <option value="">{translateMessage("inventory.common.allStatuses")}</option>
                <option value={TransferLossCaseStatusCodes.open}>{translateMessage("inventory.status.open")}</option>
                <option value={TransferLossCaseStatusCodes.found}>{translateMessage("inventory.status.found")}</option>
                <option value={TransferLossCaseStatusCodes.assigned}>{translateMessage("inventory.status.assigned")}</option>
                <option value={TransferLossCaseStatusCodes.writtenOff}>{translateMessage("inventory.status.writtenOff")}</option>
              </NativeSelect>
            )}
          </FormField>
        </div>
        <ServerPaginatedDataGrid<TransferLossCaseResponse>
          refreshKey={gridVersion}
          path={ApiEndpoints.inventory.transferDiscrepancies.list}
          filters={{ statusCode: statusCode || undefined }}
          columns={columns}
          getRowKey={(lossCase) => lossCase.id}
          caption={translateMessage("inventory.discrepancy.caption")}
          emptyTitle={translateMessage("inventory.discrepancy.empty")}
          isSearchEnabled={false}
          onRowOpen={openDecision}
        />
      </SectionCard>
      <Dialog open={selected !== undefined} onOpenChange={(open) => !open && setSelected(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translateMessage("inventory.discrepancy.decide.title")}</DialogTitle>
            <DialogDescription>
              {selected
                ? translateMessage("inventory.discrepancy.decide.text", { quantity: formatQuantity(selected.quantity), product: selected.productName, number: selected.transferNumber })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={decision} onValueChange={(value) => setDecision(value as TransferLossDecisionCode)} className="space-y-2" aria-label={translateMessage("inventory.discrepancy.decide.title")}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value={TransferLossDecisionCodes.found} id="loss-found" />
              <Label htmlFor="loss-found">{translateMessage("inventory.discrepancy.decide.found")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value={TransferLossDecisionCodes.charge} id="loss-charge" />
              <Label htmlFor="loss-charge">{translateMessage("inventory.discrepancy.decide.charge")}</Label>
            </div>
          </RadioGroup>
          {decision === TransferLossDecisionCodes.charge && (
            <FormField label={translateMessage("inventory.discrepancy.bearer")} name="lossBearer" isRequired>
              {(controlProps) => (
                <OptionSelect {...controlProps} options={bearerOptions} value={bearerCode} onValueChange={(value) => setBearerCode(value as TransferLossBearerCode | "")} emptyOptionLabel={translateMessage("inventory.discrepancy.chooseBearer")} />
              )}
            </FormField>
          )}
          <FormResultNotice errorMessage={errorMessage} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelected(undefined)}>
              {translateMessage("inventory.common.close")}
            </Button>
            <Button type="button" onClick={handleDecide} disabled={isWorking}>
              {translateMessage("inventory.discrepancy.decide.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
