"use client";

import { Fragment, type ReactNode } from "react";
import { InlineNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { SettingsDocumentResponse, StoreSettingsDocumentResponse } from "@/lib/types/settings";
import { useSettingsSection } from "../hooks/useSettingsSection";

// What a settings form receives from its section: the stored values, and everything it needs to show the save result.
export type SettingsFormProps<TValues> = {
  values: TValues;
  isStored: boolean;
  canEdit: boolean;
  isSaving: boolean;
  errorMessage?: string;
  successMessage?: string;
  fieldErrorMessages: Record<string, string>;
  onSave: (values: TValues) => Promise<boolean>;
};

export type StoreSettingsFormProps<TValues> = SettingsFormProps<TValues> & {
  // What the store really uses (its own override, otherwise the company's value). Shown as the placeholder of an empty field.
  effectiveValues: TValues;
};

function useSaveMessages(wasSaved: boolean, problemMessage: string | undefined) {
  const { translateMessage } = useTranslation();
  return { errorMessage: problemMessage, successMessage: wasSaved ? translateMessage("settings.common.saved") : undefined };
}

// Loads one company-wide settings section and hands it to its form. The form is re-created after every save (keyed by the
// row version), so it always starts from what the server now holds.
export function CompanySettingsSection<TValues>({
  path,
  canEdit,
  renderForm,
}: {
  path: string;
  canEdit: boolean;
  renderForm: (props: SettingsFormProps<TValues>) => ReactNode;
}) {
  const { translateMessage } = useTranslation();
  const section = useSettingsSection<TValues, SettingsDocumentResponse<TValues>>(path);
  const messages = useSaveMessages(section.wasSaved, section.saveProblem?.message);

  if (section.status === "loading") return <LoadingIndicator />;
  if (section.status === "error" || !section.document) {
    return <InlineNotice>{section.isOffline ? translateMessage("errors.noConnectionToServer") : (section.loadProblem?.message ?? translateMessage("settings.common.loadFailed"))}</InlineNotice>;
  }
  return (
    <Fragment key={section.document.rowVersion}>
      {renderForm({
        values: section.document.values,
        isStored: section.document.isStored,
        canEdit,
        isSaving: section.isSaving,
        fieldErrorMessages: section.fieldErrorMessages,
        onSave: section.save,
        ...messages,
      })}
    </Fragment>
  );
}

// The same for the overrides of one store.
export function StoreSettingsSection<TValues>({
  path,
  canEdit,
  renderForm,
}: {
  path: string;
  canEdit: boolean;
  renderForm: (props: StoreSettingsFormProps<TValues>) => ReactNode;
}) {
  const { translateMessage } = useTranslation();
  const section = useSettingsSection<TValues, StoreSettingsDocumentResponse<TValues>>(path);
  const messages = useSaveMessages(section.wasSaved, section.saveProblem?.message);

  if (section.status === "loading") return <LoadingIndicator />;
  if (section.status === "error" || !section.document) {
    return <InlineNotice>{section.isOffline ? translateMessage("errors.noConnectionToServer") : (section.loadProblem?.message ?? translateMessage("settings.common.loadFailed"))}</InlineNotice>;
  }
  return (
    <Fragment key={`${path}:${section.document.rowVersion}`}>
      {renderForm({
        values: section.document.overrides,
        effectiveValues: section.document.effective,
        isStored: section.document.isStored,
        canEdit,
        isSaving: section.isSaving,
        fieldErrorMessages: section.fieldErrorMessages,
        onSave: section.save,
        ...messages,
      })}
    </Fragment>
  );
}
