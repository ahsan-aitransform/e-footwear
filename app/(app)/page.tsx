import { redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { getMe } from "@/lib/server/data";

export default async function HomePage() {
  const { t } = await getT();
  const me = await getMe();
  if (!me.ok) redirect("/login?expired=1");

  return (
    <section className="flex flex-col gap-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-8 text-white sm:px-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("home.welcome")}, {me.data.displayName ?? me.data.userName}</h1>
        </div>
        {me.data.mustChangePassword && (
          <div className="card-body pb-0">
            <p role="status" className="alert-warning">{t("home.mustChangePassword")}</p>
          </div>
        )}
        <div className="card-body flex flex-col gap-3">
          <h2 className="section-title">{t("nav.stores")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {me.data.stores.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-brand-600 text-sm font-semibold text-white">{s.code.slice(0, 2)}</span>
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{s.name}</span>
                  <span className="text-xs text-ink-muted">{s.code}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
