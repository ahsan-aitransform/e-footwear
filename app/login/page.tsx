import Link from "next/link";
import { getT } from "@/i18n/server";
import { LoginForm } from "@/features/auth/LoginForm";
import { AuthShell } from "@/components/ui";

export default async function LoginPage() {
  const { t } = await getT();
  return (
    <AuthShell
      brand={t("app.name")}
      footer={<Link href="/platform/login" className="text-sm font-medium text-brand-700 hover:underline">{t("login.platformLink")}</Link>}
    >
      <LoginForm />
    </AuthShell>
  );
}
