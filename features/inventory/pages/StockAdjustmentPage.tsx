"use client";

import { Printer } from "lucide-react";
import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { PrintedReportHeading } from "@/features/accounting/components/PrintControls";
import { ChooseStoreNotice } from "../components/ChooseStoreNotice";
import { StockAdjustmentDetailCard } from "../components/StockAdjustmentDetailCard";
import { StockAdjustmentEntryPanel } from "../components/StockAdjustmentEntryPanel";
import { StockAdjustmentHistoryPanel } from "../components/StockAdjustmentHistoryPanel";
import { useInventoryWorkingStore } from "../hooks/useInventoryWorkingStore";
import type { StockAdjustmentResponse } from "../types/inventoryTypes";

// Stock Adjustment (docx 5.7, Part 10): add or remove pieces of the working store with a reason, see the stock and the value, and review what was adjusted before.
// A posted adjustment is never edited; a mistake is voided (a new document undoes it) and entered again.
export function StockAdjustmentPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const { storeId, storeName } = useInventoryWorkingStore();
  const [lastPosted, setLastPosted] = useState<StockAdjustmentResponse>();
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const mayAdd = hasPermission(PermissionCodes.INVOICE.STOCK_ADJUSTMENT.ADD) && hasPermission(PermissionCodes.RESTRICTED_OPERATIONS.STOCK.STOCK_ADJUST);

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("inventory.adjustment.title")} subtitle={translateMessage("inventory.adjustment.subtitle", { store: storeName })} />
      {storeId === null ? (
        <ChooseStoreNotice />
      ) : (
        <Tabs defaultValue={mayAdd ? "entry" : "history"}>
          <TabsList>
            {mayAdd && <TabsTrigger value="entry">{translateMessage("inventory.adjustment.tab.entry")}</TabsTrigger>}
            <TabsTrigger value="history">{translateMessage("inventory.adjustment.tab.history")}</TabsTrigger>
          </TabsList>
          {mayAdd && (
            <TabsContent value="entry" className="space-y-4">
              <SectionCard>
                <StockAdjustmentEntryPanel
                  storeId={storeId}
                  onPosted={(adjustment) => {
                    setLastPosted(adjustment);
                    setHistoryRefreshToken((token) => token + 1);
                  }}
                />
              </SectionCard>
              {lastPosted && (
                <SectionCard
                  title={translateMessage("inventory.adjustment.lastPosted", { number: lastPosted.documentNumber })}
                  action={
                    hasPermission(PermissionCodes.INVOICE.STOCK_ADJUSTMENT.PRINT) ? (
                      <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
                        <Printer />
                        {translateMessage("inventory.common.print")}
                      </Button>
                    ) : undefined
                  }
                >
                  <PrintedReportHeading title={translateMessage("inventory.adjustment.detail.title", { number: lastPosted.documentNumber })} />
                  <StockAdjustmentDetailCard adjustment={lastPosted} />
                </SectionCard>
              )}
            </TabsContent>
          )}
          <TabsContent value="history">
            {!mayAdd && <InlineNotice tone={ToneNames.info}>{translateMessage("inventory.adjustment.viewOnly")}</InlineNotice>}
            <SectionCard isPadded={false}>
              <StockAdjustmentHistoryPanel storeId={storeId} refreshToken={historyRefreshToken} />
            </SectionCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
