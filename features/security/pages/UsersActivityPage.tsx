"use client";

import { useState } from "react";
import { ServerPaginatedDataGrid } from "@/components/data/ServerPaginatedDataGrid";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { UserListItemResponse } from "@/lib/types/user";
import { UserActivityEntryKinds, type UserActivityEntryResponse } from "@/lib/types/userActivity";
import { findActivityActionMessageKey, formatJsonForDisplay } from "../logic/activityDescriptions";
import { endOfDayIsoTimestamp, formatTimestamp, startOfDayIsoTimestamp } from "../logic/formatTimestamp";

// Users Activity (docx 1.4): who did what and when, newest first, with date range, user and kind filters. Open a row (double-click or
// Enter) to see the values before and after a change. Read-only: the log is append-only on the server.
export function UsersActivityPage() {
  const { translateMessage, languageCode } = useTranslation();
  const usersQuery = useApiQuery<UserListItemResponse[]>(ApiEndpoints.users.list, { offlineCacheName: "users-account-list" });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [userId, setUserId] = useState("");
  const [entryKind, setEntryKind] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<UserActivityEntryResponse>();

  const filters = {
    from: startOfDayIsoTimestamp(fromDate),
    to: endOfDayIsoTimestamp(toDate),
    userId: userId || undefined,
    entryKind: entryKind || undefined,
  };

  const columns: DataGridColumn<UserActivityEntryResponse>[] = [
    {
      key: "userFullName",
      header: translateMessage("securityManagement.activity.userColumn"),
      render: (entry) => entry.userFullName ?? entry.userEmail ?? translateMessage("securityManagement.activity.system"),
      isSortable: true,
    },
    {
      key: "entryKind",
      header: translateMessage("securityManagement.activity.kindColumn"),
      isSecondary: true,
      render: (entry) => (
        <ToneBadge tone={entry.entryKind === UserActivityEntryKinds.signIn ? ToneNames.info : ToneNames.neutral}>
          {translateMessage(entry.entryKind === UserActivityEntryKinds.signIn ? "securityManagement.activity.kindSignIn" : "securityManagement.activity.kindChange")}
        </ToneBadge>
      ),
    },
    {
      key: "action",
      header: translateMessage("securityManagement.activity.activityColumn"),
      isSortable: true,
      render: (entry) => {
        const messageKey = findActivityActionMessageKey(entry.action);
        return <strong>{messageKey ? translateMessage(messageKey) : entry.action}</strong>;
      },
    },
    { key: "entityType", header: translateMessage("securityManagement.activity.areaColumn"), isSortable: true, render: (entry) => entry.entityType, isSecondary: true },
    {
      key: "remarks",
      header: translateMessage("securityManagement.activity.remarksColumn"),
      render: (entry) => entry.remarks ?? entry.entityId ?? "",
      isSecondary: true,
    },
    { key: "deviceLabel", header: translateMessage("securityManagement.activity.counterColumn"), render: (entry) => entry.deviceLabel ?? entry.ipAddress ?? "", isSecondary: true },
    { key: "occurredAt", header: translateMessage("securityManagement.activity.whenColumn"), isSortable: true, render: (entry) => formatTimestamp(entry.occurredAt, languageCode) },
  ];

  const hasDetails = selectedEntry && (selectedEntry.oldValuesJson || selectedEntry.newValuesJson);

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("securityManagement.activity.title")} subtitle={translateMessage("securityManagement.activity.subtitle")} />

      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            {translateMessage("securityManagement.activity.fromLabel")}
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {translateMessage("securityManagement.activity.toLabel")}
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {translateMessage("securityManagement.activity.userFilterLabel")}
            <NativeSelect value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">{translateMessage("securityManagement.activity.allUsers")}</option>
              {(usersQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            {translateMessage("securityManagement.activity.kindFilterLabel")}
            <NativeSelect value={entryKind} onChange={(event) => setEntryKind(event.target.value)}>
              <option value="">{translateMessage("securityManagement.activity.allKinds")}</option>
              <option value={UserActivityEntryKinds.businessChange}>{translateMessage("securityManagement.activity.kindChange")}</option>
              <option value={UserActivityEntryKinds.signIn}>{translateMessage("securityManagement.activity.kindSignIn")}</option>
            </NativeSelect>
          </label>
        </div>
      </SectionCard>

      <SectionCard isPadded={false}>
        <ServerPaginatedDataGrid<UserActivityEntryResponse>
          path={ApiEndpoints.users.activity}
          columns={columns}
          getRowKey={(entry) => entry.entryId}
          caption={translateMessage("securityManagement.activity.title")}
          emptyTitle={translateMessage("securityManagement.activity.empty")}
          filters={filters}
          searchPlaceholder={translateMessage("securityManagement.activity.searchPlaceholder")}
          onRowOpen={setSelectedEntry}
        />
      </SectionCard>

      {hasDetails && (
        <SectionCard
          title={translateMessage("securityManagement.activity.detailsTitle")}
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedEntry(undefined)}>
              {translateMessage("securityManagement.partialEdit.close")}
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2" dir="ltr">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{translateMessage("securityManagement.activity.before")}</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{formatJsonForDisplay(selectedEntry.oldValuesJson)}</pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{translateMessage("securityManagement.activity.after")}</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{formatJsonForDisplay(selectedEntry.newValuesJson)}</pre>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
