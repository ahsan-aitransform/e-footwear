import { Suspense } from "react";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { PlatformCompanyDetailPage } from "@/features/platform/pages/PlatformCompanyDetailPage";

// /platform/companies/<companyId>: one company with its stores and users. The page reads the route parameter in the
// browser, so it sits inside a Suspense boundary (Cache Components rule).
export default function PlatformCompanyDetailRoutePage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <PlatformCompanyDetailPage />
    </Suspense>
  );
}
