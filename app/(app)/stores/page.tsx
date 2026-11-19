import { getT } from "@/i18n/server";
import { can, getMe, getStores } from "@/lib/server/data";
import { redirect } from "next/navigation";
import { NewStoreForm } from "@/features/stores/NewStoreForm";

export default async function StoresPage() {
  const { t } = await getT();
  const me = await getMe();
  if (!me.ok) redirect("/login?expired=1");
  if (!can(me.data, "Settings.Stores")) return <p role="alert" className="alert-error">{t("error.forbidden")}</p>;

  const stores = await getStores();
  return (
    <section className="flex flex-col gap-6">
      <h1 className="page-title">{t("stores.title")}</h1>
      <NewStoreForm />
      {!stores.ok ? (
        <p role="alert" className="alert-error">{stores.status === 403 ? t("error.forbidden") : t("common.error")}</p>
      ) : stores.data.length === 0 ? (
        <p className="card card-body muted">{t("common.noData")}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("stores.code")}</th>
                <th>{t("stores.name")}</th>
                <th>{t("stores.city")}</th>
                <th>{t("stores.phone")}</th>
                <th>{t("stores.status")}</th>
              </tr>
            </thead>
            <tbody>
              {stores.data.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono font-medium text-brand-700">{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.cityName ?? ""}</td>
                  <td>{s.phone ?? ""}</td>
                  <td><span className={s.isActive ? "badge-success" : "badge-muted"}>{s.isActive ? t("common.active") : t("common.inactive")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
