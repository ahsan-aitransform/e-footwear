"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CompanyDirectoryTree } from "../components/CompanyDirectoryTree";

// One screen for the whole platform: open a company to see its stores, open a store to see its users.
export function PlatformDirectoryPage() {
  const { translateMessage } = useTranslation();
  return (
    <>
      <PageHeader title={translateMessage("platform.directory.title")} subtitle={translateMessage("platform.directory.subtitle")} />
      <CompanyDirectoryTree />
    </>
  );
}
