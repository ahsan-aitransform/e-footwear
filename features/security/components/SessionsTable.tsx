"use client";

import { DataGridTable } from "@/components/data/DataGridTable";
import type { DataGridColumn } from "@/components/data/dataGridTypes";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { Button } from "@/components/ui/button";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { UserSessionResponse } from "@/lib/types/userSession";
import { formatTimestamp } from "../logic/formatTimestamp";

// Live sign-in sessions of a person: where from, when, and a button to end one. The session in use is marked.
export function SessionsTable({
  sessions,
  onEndSession,
  isBusy = false,
}: {
  sessions: readonly UserSessionResponse[];
  onEndSession: (session: UserSessionResponse) => void;
  isBusy?: boolean;
}) {
  const { translateMessage, languageCode } = useTranslation();

  const columns: DataGridColumn<UserSessionResponse>[] = [
    {
      key: "createdAt",
      header: translateMessage("securityManagement.sessions.signedInColumn"),
      render: (session) => (
        <span className="inline-flex items-center gap-2">
          {formatTimestamp(session.createdAt, languageCode)}
          {session.isCurrentSession && <ToneBadge tone={ToneNames.info}>{translateMessage("securityManagement.sessions.thisSession")}</ToneBadge>}
        </span>
      ),
    },
    { key: "lastSeenAt", header: translateMessage("securityManagement.sessions.lastActiveColumn"), render: (session) => formatTimestamp(session.lastSeenAt, languageCode) },
    { key: "ipAddress", header: translateMessage("securityManagement.sessions.addressColumn"), render: (session) => session.ipAddress ?? "", isSecondary: true },
    { key: "userAgent", header: translateMessage("securityManagement.sessions.browserColumn"), render: (session) => session.userAgent ?? "", isSecondary: true },
    {
      key: "actions",
      header: "",
      alignment: "end",
      render: (session) => (
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => onEndSession(session)}>
          {translateMessage("securityManagement.sessions.endSession")}
        </Button>
      ),
    },
  ];

  return (
    <DataGridTable
      rows={sessions}
      columns={columns}
      getRowKey={(session) => session.id}
      caption={translateMessage("securityManagement.sessions.caption")}
      emptyTitle={translateMessage("securityManagement.sessions.noSessions")}
    />
  );
}
