"use client";

import { useState } from "react";
import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/apiRequest";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { EndOtherSessionsResponse, LoginHistoryEntryResponse, UserSessionResponse } from "@/lib/types/userSession";
import { SessionsTable } from "../components/SessionsTable";
import { findActivityActionMessageKey } from "../logic/activityDescriptions";
import { formatTimestamp } from "../logic/formatTimestamp";

// My sessions and sign-ins: where the signed-in person is signed in, a way to end any session (a lost device) or all the others, and
// their own recent sign-in history. Needs no permission: everybody may see and end their own sessions.
export function AccountSessionsPage() {
  const { translateMessage, languageCode } = useTranslation();
  const sessionsQuery = useApiQuery<UserSessionResponse[]>(ApiEndpoints.account.sessions);
  const historyQuery = useApiQuery<LoginHistoryEntryResponse[]>(ApiEndpoints.account.loginHistory);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  async function handleEndSession(session: UserSessionResponse) {
    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    const result = await apiRequest(ApiEndpoints.account.session(session.id), { method: "DELETE" });
    setIsBusy(false);
    if (!result.ok) setErrorMessage(result.problem.message);
    // Ending the session in use signs this browser out: the next request is refused and the guard sends the person to sign in.
    else sessionsQuery.refetch();
  }

  async function handleEndOthers() {
    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    const result = await apiRequest<EndOtherSessionsResponse>(ApiEndpoints.account.endOtherSessions, { method: "DELETE" });
    setIsBusy(false);
    if (!result.ok) {
      setErrorMessage(result.problem.message);
      return;
    }
    setSuccessMessage(translateMessage("securityManagement.sessions.otherSessionsEnded", { endedCount: String(result.data.endedCount) }));
    sessionsQuery.refetch();
  }

  const historyColumns: DataGridColumn<LoginHistoryEntryResponse>[] = [
    {
      key: "outcome",
      header: translateMessage("securityManagement.activity.activityColumn"),
      render: (entry) => {
        const messageKey = findActivityActionMessageKey(entry.outcome);
        return messageKey ? translateMessage(messageKey) : entry.outcome;
      },
    },
    { key: "attemptedAt", header: translateMessage("securityManagement.activity.whenColumn"), render: (entry) => formatTimestamp(entry.attemptedAt, languageCode) },
    { key: "ipAddress", header: translateMessage("securityManagement.sessions.addressColumn"), isSecondary: true, render: (entry) => entry.ipAddress ?? "" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={translateMessage("securityManagement.sessions.title")} subtitle={translateMessage("securityManagement.sessions.subtitle")} />

      <SectionCard
        title={translateMessage("securityManagement.sessions.liveTitle")}
        isPadded={false}
        action={
          <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={handleEndOthers}>
            {translateMessage("securityManagement.sessions.endOthers")}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="px-5 pt-1">
            <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
          </div>
          {sessionsQuery.status === "error" ? (
            <p className="p-5 text-sm text-destructive">{sessionsQuery.problem?.message}</p>
          ) : (
            <SessionsTable sessions={sessionsQuery.data ?? []} onEndSession={handleEndSession} isBusy={isBusy} />
          )}
        </div>
      </SectionCard>

      <SectionCard title={translateMessage("securityManagement.sessions.historyTitle")} isPadded={false}>
        <DataGridTable
          rows={historyQuery.data ?? []}
          columns={historyColumns}
          getRowKey={(entry) => entry.attemptId}
          caption={translateMessage("securityManagement.sessions.historyTitle")}
          isLoading={historyQuery.status === "loading"}
          errorMessage={historyQuery.status === "error" ? historyQuery.problem?.message : undefined}
          emptyTitle={translateMessage("securityManagement.sessions.noHistory")}
        />
      </SectionCard>
    </div>
  );
}
