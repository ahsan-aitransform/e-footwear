"use client";

import type { FormEvent, ReactNode } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { ToneBadge } from "@/components/feedback/ToneBadge";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { SectionCard } from "@/components/layout/SectionCard";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useIsOnline } from "@/lib/session/useSessionState";

// The frame of one settings form: title, a "not configured" badge while nothing was ever saved, the fields in a disabled fieldset
// when the person may only view, the save result, and the Save button (disabled offline: settings need the server).
export function SettingsFormCard({
  title,
  description,
  isStored,
  canEdit,
  isSaving,
  errorMessage,
  successMessage,
  note,
  onSubmit,
  children,
}: {
  title: string;
  description?: string;
  isStored: boolean;
  canEdit: boolean;
  isSaving: boolean;
  errorMessage?: string;
  successMessage?: string;
  note?: string;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const { translateMessage } = useTranslation();
  const isOnline = useIsOnline();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <SectionCard
      title={title}
      description={description}
      action={!isStored ? <ToneBadge tone={ToneNames.warning}>{translateMessage("settings.common.notConfigured")}</ToneBadge> : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={!canEdit || isSaving} className="grid gap-4 sm:grid-cols-2">
          {children}
        </fieldset>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
        {!canEdit && <InlineNotice tone={ToneNames.info}>{translateMessage("settings.common.readOnlyNotice")}</InlineNotice>}
        {canEdit && !isOnline && <InlineNotice tone={ToneNames.warning}>{translateMessage("settings.common.needsConnection")}</InlineNotice>}
        {canEdit && (
          <SubmitButton
            label={translateMessage("common.save")}
            pendingLabel={translateMessage("settings.common.saving")}
            isPending={isSaving}
            isDisabled={!isOnline}
          />
        )}
      </form>
    </SectionCard>
  );
}
