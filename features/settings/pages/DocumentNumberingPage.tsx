"use client";

import { useState } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { useToast } from "@/components/feedback/ToastProvider";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { DocumentNumberSeriesCodes } from "@/lib/constants/settingsCodes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { useIsOnline } from "@/lib/session/useSessionState";
import type { DocumentNumberSeriesResponse, SetDocumentNumberRequest } from "@/lib/types/settings";
import { useSellingStores } from "../hooks/useSellingStores";

function seriesLabelKey(seriesCode: string) {
  return (DocumentNumberSeriesCodes as readonly string[]).includes(seriesCode)
    ? (`settings.documentSeries.${seriesCode}` as "settings.documentSeries.SALE_INVOICE")
    : undefined;
}

// One series: where it continues, and a field to move it forward. A series never goes back, so numbers already printed never repeat.
function DocumentNumberRow({
  storeId,
  series,
  canEdit,
  onChanged,
}: {
  storeId: string;
  series: DocumentNumberSeriesResponse;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { translateMessage } = useTranslation();
  const { showToast } = useToast();
  const isOnline = useIsOnline();
  const [text, setText] = useState(String(series.nextValue));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const labelKey = seriesLabelKey(series.seriesCode);
  const label = labelKey ? translateMessage(labelKey) : series.seriesCode;

  async function handleSet() {
    const nextValue = Number(text);
    if (!Number.isInteger(nextValue) || nextValue < 1) {
      setErrorMessage(translateMessage("settings.documentNumbering.invalidNumber"));
      return;
    }
    setIsSaving(true);
    setErrorMessage(undefined);
    const result = await apiRequest(ApiEndpoints.documentNumbering.setNextValue, {
      method: "PUT",
      body: { storeId, seriesCode: series.seriesCode, nextValue } satisfies SetDocumentNumberRequest,
    });
    setIsSaving(false);
    if (!result.ok) {
      setErrorMessage(result.kind === "offline" ? translateMessage("errors.noConnectionToServer") : result.problem.message);
      return;
    }
    showToast(translateMessage("settings.documentNumbering.saved", { series: label, nextValue }));
    onChanged();
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell className="text-end tabular-nums">
        {series.nextValue}
        {!series.isStored && <span className="ms-2 text-xs text-muted-foreground">({translateMessage("settings.documentNumbering.notUsedYet")})</span>}
      </TableCell>
      {canEdit && (
        <TableCell>
          <div className="flex items-center gap-2">
            <Input
              aria-label={`${label}: ${translateMessage("settings.documentNumbering.newNumber")}`}
              type="number"
              dir="ltr"
              min={1}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="w-32"
            />
            <Button size="sm" variant="outline" disabled={isSaving || !isOnline} onClick={() => void handleSet()}>
              {translateMessage("settings.documentNumbering.set")}
            </Button>
          </div>
          {errorMessage && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {errorMessage}
            </p>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}

// Document Numbering: for one store, where each series continues. Numbers are handed out by the system; this screen can only move a
// series forward, for example when a shop continues the numbers of its old books.
export function DocumentNumberingPage() {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionCodes.SETTINGS.DOCUMENT_NUMBERING.EDIT);
  const { sellingStores } = useSellingStores();
  const [chosenStoreId, setChosenStoreId] = useState("");
  const storeId = chosenStoreId || sellingStores[0]?.id || "";
  const series = useApiQuery<DocumentNumberSeriesResponse[]>(ApiEndpoints.documentNumbering.list, {
    query: { storeId },
    enabled: storeId !== "",
  });

  return (
    <>
      <PageHeader title={translateMessage("settings.documentNumbering.title")} subtitle={translateMessage("settings.documentNumbering.subtitle")} />
      <FormField label={translateMessage("common.store")} name="document-numbering-store">
        {(controlProps) => (
          <NativeSelect {...controlProps} value={storeId} onChange={(event) => setChosenStoreId(event.target.value)}>
            {sellingStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.code} - {store.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <InlineNotice tone={ToneNames.info}>{translateMessage("settings.documentNumbering.forwardOnlyNote")}</InlineNotice>
      {storeId === "" && <InlineNotice tone={ToneNames.warning}>{translateMessage("settings.common.noStores")}</InlineNotice>}
      {series.status === "loading" && storeId !== "" && <LoadingIndicator />}
      {series.status === "error" && <InlineNotice>{series.problem?.message}</InlineNotice>}
      {series.status === "success" && series.data && (
        <SectionCard title={translateMessage("settings.documentNumbering.listTitle")} isPadded={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{translateMessage("settings.documentNumbering.series")}</TableHead>
                <TableHead className="text-end">{translateMessage("settings.documentNumbering.nextNumber")}</TableHead>
                {canEdit && <TableHead>{translateMessage("settings.documentNumbering.newNumber")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.data.map((row) => (
                <DocumentNumberRow
                  key={`${storeId}:${row.seriesCode}:${row.periodKey}:${row.nextValue}`}
                  storeId={storeId}
                  series={row}
                  canEdit={canEdit}
                  onChanged={series.refetch}
                />
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </>
  );
}
