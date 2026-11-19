import Link from "next/link";
import { getT } from "@/i18n/server";
import { PlatformLoginForm } from "@/features/platform/PlatformForms";
import { AuthShell } from "@/components/ui";

export default async function PlatformLoginPage() {
  const { t } = await getT();
  return (
    <AuthShell
      brand={t("app.name")}
      footer={<Link href="/login" className="text-sm font-medium text-brand-700 hover:underline">{t("login.companyLink")}</Link>}
    >
      <PlatformLoginForm />
    </AuthShell>
  );
}
