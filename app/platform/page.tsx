import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { PLATFORM_COOKIE, apiBaseUrl } from "@/lib/session-core";
import { isCompanyItem, parseList, type CompanyItem } from "@/lib/types";
import { PlatformSignOut, RegisterCompanyForm } from "@/features/platform/PlatformForms";
import { BrandMark } from "@/components/ui";

async function loadCompanies(): Promise<CompanyItem[] | null> {
  const token = (await cookies()).get(PLATFORM_COOKIE)?.value;
  if (!token) redirect("/platform/login");
  const res = await fetch(`${apiBaseUrl()}/api/v1/platform/companies`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (res?.status === 401 || res?.status === 403) redirect("/platform/login?expired=1");
  if (!res?.ok) return null;
  return parseList(await res.json().catch(() => null), isCompanyItem);
}

export default async function PlatformPage() {
  const { t } = await getT();
  const companies = await loadCompanies();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandMark name={t("app.name")} />
          <PlatformSignOut />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="page-title">{t("platform.title")}</h1>
        <RegisterCompanyForm />
        {companies === null ? (
          <p role="alert" className="alert-error">{t("common.error")}</p>
        ) : companies.length === 0 ? (
          <p className="card card-body muted">{t("common.noData")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("platform.code")}</th>
                  <th>{t("platform.companyName")}</th>
                  <th>{t("platform.status")}</th>
                  <th>{t("platform.created")}</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-medium text-brand-700">{c.code}</td>
                    <td>{c.name}</td>
                    <td><span className={c.status === "active" ? "badge-success" : c.status === "trial" ? "badge-brand" : "badge-muted"}>{c.status}</span></td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
