"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { SectionCard } from "@/components/layout/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApiImageObjectUrl, uploadApiFile } from "@/lib/api/fileTransfer";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { LOGO_ACCEPTED_CONTENT_TYPES, LOGO_MAXIMUM_SIZE_BYTES } from "@/lib/constants/settingsLimits";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CompanyLogoResponse } from "@/lib/types/settings";

// The company logo: shows the current one and uploads a new one (PNG, JPEG or WEBP, at most 1 MB). The server checks the
// real file type and size again; the checks here only save a round trip.
export function CompanyLogoPanel({ canEdit }: { canEdit: boolean }) {
  const { translateMessage } = useTranslation();
  const logo = useApiQuery<CompanyLogoResponse | undefined>(ApiEndpoints.companySettings.companyLogoInformation);
  const attachmentId = logo.data?.attachmentId;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  useEffect(() => {
    if (!attachmentId) return;
    let isCancelled = false;
    fetchApiImageObjectUrl(ApiEndpoints.companySettings.companyLogo).then((url) => {
      if (isCancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      setImageUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    });
    return () => {
      isCancelled = true;
    };
  }, [attachmentId]);

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    if (!(LOGO_ACCEPTED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setErrorMessage(translateMessage("settings.companyProfile.logoWrongType"));
      input.value = "";
      return;
    }
    if (file.size > LOGO_MAXIMUM_SIZE_BYTES) {
      setErrorMessage(translateMessage("settings.companyProfile.logoTooLarge", { maximumKilobytes: LOGO_MAXIMUM_SIZE_BYTES / 1024 }));
      input.value = "";
      return;
    }
    setIsUploading(true);
    const result = await uploadApiFile<CompanyLogoResponse>(ApiEndpoints.companySettings.companyLogo, file);
    setIsUploading(false);
    input.value = "";
    if (!result.ok) {
      setErrorMessage(result.kind === "offline" ? translateMessage("errors.noConnectionToServer") : result.problem.message);
      return;
    }
    setSuccessMessage(translateMessage("settings.companyProfile.logoUploaded"));
    logo.refetch();
  }

  return (
    <SectionCard title={translateMessage("settings.companyProfile.logoTitle")} description={translateMessage("settings.companyProfile.logoDescription")}>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex h-24 w-40 items-center justify-center rounded-lg border bg-muted">
          {imageUrl && attachmentId ? (
            // eslint-disable-next-line @next/next/no-img-element -- a temporary object URL of a protected file cannot use next/image
            <img src={imageUrl} alt={translateMessage("settings.companyProfile.logoAlt")} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">{translateMessage("settings.companyProfile.noLogo")}</span>
          )}
        </div>
        {canEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="company-logo-file">{translateMessage("settings.companyProfile.chooseLogo")}</Label>
            <Input
              id="company-logo-file"
              type="file"
              accept={LOGO_ACCEPTED_CONTENT_TYPES.join(",")}
              disabled={isUploading}
              onChange={handleFileChosen}
            />
            <p className="text-xs text-muted-foreground">
              {isUploading
                ? translateMessage("settings.companyProfile.uploading")
                : translateMessage("settings.companyProfile.logoHint", { maximumKilobytes: LOGO_MAXIMUM_SIZE_BYTES / 1024 })}
            </p>
          </div>
        )}
      </div>
      <div className="mt-4">
        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
      </div>
    </SectionCard>
  );
}
